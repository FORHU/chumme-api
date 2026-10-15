import dotenv from 'dotenv';
dotenv.config();
import { GetQueueAttributesCommand, ListQueuesCommand } from '@aws-sdk/client-sqs';
import { AWS_SQS_ENDPOINT, MEDIA_PROCESSING_QUEUE_URL } from '../src/config';
import { enqueue, getSqsClient, startConsumer } from '../src/utils/sqs';

// Local check that LocalStack SQS is up and the app's client can round-trip a
// message. Run after `docker compose up -d --wait localstack`.
async function smoke() {
  if (!AWS_SQS_ENDPOINT) {
    console.error('❌ AWS_SQS_ENDPOINT is not set — refusing to run against real SQS.');
    process.exit(1);
  }
  const sqs = getSqsClient();

  const { QueueUrls = [] } = await sqs.send(new ListQueuesCommand({}));
  console.log(`📋 ${QueueUrls.length} queues on ${AWS_SQS_ENDPOINT}:`);
  for (const url of QueueUrls) {
    const { Attributes = {} } = await sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['RedrivePolicy'] }),
    );
    console.log(`   ${url}${Attributes.RedrivePolicy ? '  → DLQ configured' : ''}`);
  }

  const marker = `smoke-${Date.now()}`;
  const received = new Promise<void>((resolve) => {
    const consumer = startConsumer<{ marker: string }>({
      queueUrl: MEDIA_PROCESSING_QUEUE_URL,
      handler: async (payload) => {
        if (payload.marker === marker) {
          console.log(`✅ Round trip OK on ${MEDIA_PROCESSING_QUEUE_URL}`);
          consumer.stop().then(resolve);
        }
      },
    });
  });

  await enqueue(MEDIA_PROCESSING_QUEUE_URL, { marker });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('no message received within 30s')), 30000),
  );
  await Promise.race([received, timeout]);
}

smoke()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ SQS smoke test failed:', error);
    process.exit(1);
  });
