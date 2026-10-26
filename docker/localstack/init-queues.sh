#!/bin/bash
# Runs inside the localstack container once SQS and SNS are ready (mounted
# into /etc/localstack/init/ready.d/). Creates every queue with its dead-letter
# queue, the chumme-events SNS topic, and a filtered subscription for each
# queue that has a filter.
# Everything is in-memory, so this runs again on every container start.
#
# Must keep LF line endings — .gitattributes enforces it. A CRLF copy fails
# with "bad interpreter" and the healthcheck never goes green.
#
# Adding a queue: append it to QUEUES, add its *_QUEUE_URL to .env.example and
# JOB_QUEUE_URLS in src/config.ts, then `docker compose restart localstack`.
# Deployed queues are created by DevOps with the same names and receive counts.
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-ap-southeast-1}"
DEFAULT_MAX_RECEIVES="${QUEUE_MAX_RECEIVES:-5}"
TOPIC="chumme-events"

# "<queue>|<maxReceiveCount, empty = default>|<SNS filter on eventType, empty =
# no subscription>". The app sends jobs straight to the queues; the SNS topic
# and filters only serve scripts/sns_smoke.ts and any future fan-out. DLQs are
# "<queue>_failed".
#
# Audio merge and media jobs get one retry: their handlers are not idempotent
# (a save job writes DB rows) and RabbitMQ never retried them at all.
QUEUES=(
  'media_processing_queue|2|{"eventType":["media.process"]}'
  'audio-merge-queue|2|{"eventType":["audio.merge"]}'
  'ingestion_jobs||{"eventType":[{"prefix":"ingestion."}]}'
  'ingestion_jobs_high||'
)

topic_arn=$(awslocal sns create-topic --region "$REGION" --name "$TOPIC" \
  --query TopicArn --output text)
echo "topic ready: $topic_arn"

queue_arn() {
  awslocal sqs get-queue-attributes --region "$REGION" --queue-url "$1" \
    --attribute-names QueueArn --query Attributes.QueueArn --output text
}

for entry in "${QUEUES[@]}"; do
  IFS="|" read -r queue max_receives filter <<<"$entry"
  max_receives="${max_receives:-$DEFAULT_MAX_RECEIVES}"
  dlq="${queue}_failed"

  dlq_url=$(awslocal sqs create-queue --region "$REGION" --queue-name "$dlq" \
    --query QueueUrl --output text)
  dlq_arn=$(queue_arn "$dlq_url")

  # RedrivePolicy and FilterPolicy are JSON strings inside JSON; files avoid
  # shell quoting.
  attrs=$(mktemp)
  cat > "$attrs" <<EOF
{"RedrivePolicy": "{\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"$max_receives\"}"}
EOF
  queue_url=$(awslocal sqs create-queue --region "$REGION" --queue-name "$queue" \
    --attributes "file://$attrs" --query QueueUrl --output text)

  if [[ -z "$filter" ]]; then
    rm -f "$attrs"
    echo "queue ready: $queue (dlq: $dlq, maxReceiveCount: $max_receives)"
    continue
  fi

  # RawMessageDelivery: the queue receives the published body as-is, not
  # wrapped in an SNS envelope, so consumers work the same whether a job was
  # sent straight to the queue or published to the topic.
  escaped_filter=$(printf '%s' "$filter" | sed 's/"/\\"/g')
  cat > "$attrs" <<EOF
{"RawMessageDelivery": "true", "FilterPolicy": "$escaped_filter"}
EOF
  awslocal sns subscribe --region "$REGION" --topic-arn "$topic_arn" \
    --protocol sqs --notification-endpoint "$(queue_arn "$queue_url")" \
    --attributes "file://$attrs" >/dev/null
  rm -f "$attrs"

  echo "queue ready: $queue (dlq: $dlq, maxReceiveCount: $max_receives, filter: $filter)"
done
