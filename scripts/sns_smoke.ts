import dotenv from 'dotenv';
dotenv.config();
import { DeleteMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import {
  AUDIO_MERGE_QUEUE_URL,
  AWS_SNS_ENDPOINT,
  INGESTION_JOBS_QUEUE_URL,
  MEDIA_PROCESSING_QUEUE_URL,
} from '../src/config';
import { publishEvent } from '../src/utils/sns';
import { getSqsClient } from '../src/utils/sqs';

// Local check that the chumme-events topic routes each eventType to exactly
// the queues whose filter matches it. Run after
// `docker compose up -d --wait localstack`.
const QUEUES = {
  media_processing_queue: MEDIA_PROCESSING_QUEUE_URL,
  'audio-merge-queue': AUDIO_MERGE_QUEUE_URL,
  ingestion_jobs: INGESTION_JOBS_QUEUE_URL,
};

// eventType → the queue it must land on (null = no subscriber matches).
const CASES: [string, keyof typeof QUEUES | null][] = [
  ['media.process', 'media_processing_queue'],
  ['audio.merge', 'audio-merge-queue'],
  ['ingestion.discovery', 'ingestion_jobs'],
  ['ingestion.metadata', 'ingestion_jobs'],
  ['nobody.listens', null],
];

async function drainMarkers(queueUrl: string, run: string): Promise<string[]> {
  const sqs = getSqsClient();
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const { Messages = [] } = await sqs.send(
      new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 2 }),
    );
    for (const m of Messages) {
      const body = JSON.parse(m.Body || '{}');
      if (body.run === run) seen.push(body.eventType);
      await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle! }));
    }
  }
  return seen.sort();
}

async function smoke() {
  if (!AWS_SNS_ENDPOINT) {
    console.error('❌ AWS_SNS_ENDPOINT is not set — refusing to run against real SNS.');
    process.exit(1);
  }
  const run = `smoke-${Date.now()}`;
  for (const [eventType] of CASES) {
    await publishEvent(eventType, { run, eventType });
  }
  console.log(`📣 Published ${CASES.length} events to chumme-events`);

  let ok = true;
  for (const [name, url] of Object.entries(QUEUES)) {
    const expected = CASES.filter(([, q]) => q === name).map(([e]) => e).sort();
    const got = await drainMarkers(url, run);
    const pass = JSON.stringify(got) === JSON.stringify(expected);
    ok &&= pass;
    console.log(`${pass ? '✅' : '❌'} ${name}: got [${got.join(', ')}], expected [${expected.join(', ')}]`);
  }
  if (!ok) throw new Error('routing mismatch');
}

smoke()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ SNS smoke test failed:', error);
    process.exit(1);
  });
