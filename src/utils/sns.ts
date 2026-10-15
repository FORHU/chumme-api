import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { AWS_REGION, AWS_SNS_ENDPOINT, CHUMME_EVENTS_TOPIC_ARN } from "../config";

let client: SNSClient | null = null;

// One client for the process. With AWS_SNS_ENDPOINT set (local only) it talks
// to LocalStack with dummy credentials; otherwise the SDK's default chain and
// real SNS endpoint are used.
export function getSnsClient(): SNSClient {
  if (!client) {
    client = new SNSClient(
      AWS_SNS_ENDPOINT
        ? {
            region: AWS_REGION,
            endpoint: AWS_SNS_ENDPOINT,
            credentials: { accessKeyId: "test", secretAccessKey: "test" },
          }
        : { region: AWS_REGION },
    );
  }
  return client;
}

/**
 * Publishes an event to the chumme-events topic. `eventType` plays the role of
 * the RabbitMQ routing key (e.g. "audio.merge", "ingestion.discovery"): every
 * queue whose subscription filter matches it gets a copy, delivered raw, so
 * startConsumer() handlers receive `payload` exactly as sent.
 */
export async function publishEvent(
  eventType: string,
  payload: unknown,
): Promise<string | undefined> {
  if (!CHUMME_EVENTS_TOPIC_ARN) {
    throw new Error("publishEvent: CHUMME_EVENTS_TOPIC_ARN is empty — check env");
  }
  const result = await getSnsClient().send(
    new PublishCommand({
      TopicArn: CHUMME_EVENTS_TOPIC_ARN,
      Message: JSON.stringify(payload),
      MessageAttributes: {
        eventType: { DataType: "String", StringValue: eventType },
      },
    }),
  );
  return result.MessageId;
}
