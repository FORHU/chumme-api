import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { AWS_REGION, AWS_SQS_ENDPOINT } from "../config";
import logger from "./logger";

let client: SQSClient | null = null;

// One client for the process. With AWS_SQS_ENDPOINT set (local only) it talks
// to LocalStack with dummy credentials; otherwise the SDK's default chain and
// real SQS endpoint are used.
export function getSqsClient(): SQSClient {
  if (!client) {
    client = new SQSClient(
      AWS_SQS_ENDPOINT
        ? {
            region: AWS_REGION,
            endpoint: AWS_SQS_ENDPOINT,
            credentials: { accessKeyId: "test", secretAccessKey: "test" },
          }
        : { region: AWS_REGION },
    );
  }
  return client;
}

export async function enqueue(
  queueUrl: string,
  payload: unknown,
  options: { delaySeconds?: number } = {},
): Promise<string | undefined> {
  if (!queueUrl)
    throw new Error("enqueue: queueUrl is empty — check *_QUEUE_URL env");
  const result = await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
      DelaySeconds: options.delaySeconds,
    }),
  );
  return result.MessageId;
}

export interface ConsumerOptions<T> {
  queueUrl: string;
  handler: (payload: T, message: Message) => Promise<void>;
  /** Jobs run in parallel by this consumer. */
  concurrency?: number;
  /** Seconds a received message stays hidden; extended by the heartbeat. */
  visibilityTimeout?: number;
  /** Seconds before a failed job is visible again. After the queue's
   *  maxReceiveCount failures SQS moves it to the DLQ. */
  retryDelaySeconds?: number;
}

export interface Consumer {
  /** Stops polling and resolves once every in-flight job has finished. */
  stop(): Promise<void>;
}

export function startConsumer<T = unknown>(
  options: ConsumerOptions<T>,
): Consumer {
  const {
    queueUrl,
    handler,
    concurrency = 1,
    visibilityTimeout = 60,
    retryDelaySeconds = 30,
  } = options;
  const sqs = getSqsClient();
  const inFlight = new Set<Promise<void>>();
  let stopping = false;

  const changeVisibility = (receiptHandle: string, seconds: number) =>
    sqs.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: seconds,
      }),
    );

  const runJob = async (message: Message): Promise<void> => {
    const receiptHandle = message.ReceiptHandle!;
    let payload: T;
    try {
      payload = JSON.parse(message.Body || "");
    } catch {
      // Retrying a malformed body can never succeed — drop it.
      logger.error(
        `SQS: dropping malformed message ${message.MessageId} on ${queueUrl}`,
      );
      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
      return;
    }

    // Keep the message hidden while a long job is still running.
    const heartbeat = setInterval(
      () => {
        changeVisibility(receiptHandle, visibilityTimeout).catch((err) =>
          logger.warn(`SQS: heartbeat failed for ${message.MessageId}:`, err),
        );
      },
      (visibilityTimeout * 1000) / 2,
    );

    try {
      await handler(payload, message);
      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (err) {
      logger.error(`SQS: job ${message.MessageId} failed on ${queueUrl}:`, err);
      await changeVisibility(receiptHandle, retryDelaySeconds).catch(() => {});
    } finally {
      clearInterval(heartbeat);
    }
  };

  const poll = async () => {
    while (!stopping) {
      const free = concurrency - inFlight.size;
      if (free <= 0) {
        await Promise.race(inFlight);
        continue;
      }
      try {
        // Not aborted on stop: cancelling a receive can lose messages it
        // already pulled. The long poll ends within WaitTimeSeconds anyway.
        const { Messages = [] } = await sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: Math.min(free, 10),
            WaitTimeSeconds: 20,
            VisibilityTimeout: visibilityTimeout,
          }),
        );
        for (const message of Messages) {
          const job = runJob(message).finally(() => inFlight.delete(job));
          inFlight.add(job);
        }
      } catch (err) {
        logger.error(
          `SQS: receive failed on ${queueUrl}, retrying in 5s:`,
          err,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };

  const polling = poll();
  logger.info(`SQS: consuming ${queueUrl} (concurrency ${concurrency})`);

  return {
    async stop() {
      stopping = true;
      await polling;
      await Promise.allSettled(inFlight);
    },
  };
}
