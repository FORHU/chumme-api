# Job queues (Amazon SQS)

Background jobs run on Amazon SQS. RabbitMQ is gone: nothing in the app connects
to it, and the `RABBITMQ_*` env vars are not read.

The app sends each job straight to its queue (`src/utils/sqs.ts` → `enqueue`) and
the workers long-poll them (`startConsumer`). A failed job becomes visible again
after 30s; once it has been received `maxReceiveCount` times SQS moves it to the
queue's `_failed` dead-letter queue.

## Queues

| Queue | DLQ | maxReceiveCount | Env var | Producer → consumer |
|---|---|---|---|---|
| `audio-merge-queue` | `audio-merge-queue_failed` | 2 | `AUDIO_MERGE_QUEUE_URL` | `publishMergeJob` → `AudioMergeWorker` (1 at a time) |
| `media_processing_queue` | `media_processing_queue_failed` | 2 | `MEDIA_PROCESSING_QUEUE_URL` | `MediaQueueSvc.publishJob` → `MediaProcessingWorker` (2 at a time) |
| `ingestion_jobs` | `ingestion_jobs_failed` | 5 | `INGESTION_JOBS_QUEUE_URL` | `publishIngestionJob`, priority < 2 → `IngestionWorker` (2 at a time) |
| `ingestion_jobs_high` | `ingestion_jobs_high_failed` | 5 | `INGESTION_JOBS_HIGH_QUEUE_URL` | `publishIngestionJob`, priority ≥ 2 → `IngestionWorker` (3 at a time) |

**Why two ingestion queues.** SQS has no message priority. Backfill jobs queue
their own next page, so a big backfill can build a long backlog. Sync, auto-sync,
topic discovery and manual refreshes have priority 2 or higher. They go to
`ingestion_jobs_high`, which has its own consumer, so they don't wait behind that
backlog.

**Why audio and media retry only once.** Their handlers are not idempotent (a
save job writes DB rows), and RabbitMQ never retried them at all. One retry
covers a job cut off by a deploy.

## Provisioning (DevOps)

Create one set per environment (dev and prod must not share queues):

- **Type:** standard queues, not FIFO.
- **Region:** `ap-southeast-1`.
- **Redrive policy:** each queue points at its `_failed` DLQ with the
  `maxReceiveCount` above.
- **Visibility timeout:** 120s. Workers extend it while a job runs.
- **Retention:** default 4 days on the main queues, 14 days on the DLQs.
- **IAM:** the instance or task role needs `sqs:SendMessage`,
  `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:ChangeMessageVisibility` and
  `sqs:GetQueueAttributes` on the four main queues. The app never touches the
  DLQs directly.
- **Env:** set the four `*_QUEUE_URL` values as GitHub variables (the `dev`
  environment for `deploy-dev.yml`, the repo for `deploy.yml`). Leave
  `AWS_SQS_ENDPOINT` unset in every deployed environment.

`/api/v1/health` returns 503 if any queue can't be reached, so a wrong URL or a
missing permission fails the deploy instead of silently dropping jobs.
`/api/v1/health/queues` shows each queue's depth.

## Local development

```bash
docker compose up -d --wait localstack
```

`docker/localstack/init-queues.sh` creates the queues and DLQs above in
LocalStack on every start. Copy the SQS block from `.env.example` into `.env`.
`npx ts-node scripts/sqs_smoke.ts` sends a job to a queue and consumes it.

## Operating notes

- **Inspect failures:** read the `_failed` queue in the SQS console. To retry,
  use the console's "Start DLQ redrive".
- **Pause ingestion:** set `DISABLE_INGESTION_WORKER=true`. Jobs wait in the
  queue until it is re-enabled, or until the retention period expires them.
- **Duplicates:** standard queues deliver at least once. Ingestion dedups in
  Redis and releases its dedup key when a job fails, so a retry is not skipped.
