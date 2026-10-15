#!/bin/bash
# Runs inside the localstack container once SQS and SNS are ready (mounted
# into /etc/localstack/init/ready.d/). Creates every queue with its dead-letter
# queue, the chumme-events SNS topic, and one filtered subscription per queue.
# Everything is in-memory, so this runs again on every container start.
#
# Must keep LF line endings — .gitattributes enforces it. A CRLF copy fails
# with "bad interpreter" and the healthcheck never goes green.
#
# Adding a queue: append it to QUEUES with its routing filter, add its
# *_QUEUE_URL to .env.example, then `docker compose restart localstack`.
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-ap-southeast-1}"
MAX_RECEIVES="${QUEUE_MAX_RECEIVES:-5}"
TOPIC="chumme-events"

# "<queue>|<SNS filter on the eventType attribute>". The filter plays the part
# of the RabbitMQ binding: same routing keys chumme_exchange uses today.
# Queue names mirror RabbitMQ; DLQs use the "<queue>_failed" convention from
# src/utils/rabbitmq.ts.
QUEUES=(
  'media_processing_queue|{"eventType":["media.process"]}'
  'audio-merge-queue|{"eventType":["audio.merge"]}'
  'ingestion_jobs|{"eventType":[{"prefix":"ingestion."}]}'
)

topic_arn=$(awslocal sns create-topic --region "$REGION" --name "$TOPIC" \
  --query TopicArn --output text)
echo "topic ready: $topic_arn"

queue_arn() {
  awslocal sqs get-queue-attributes --region "$REGION" --queue-url "$1" \
    --attribute-names QueueArn --query Attributes.QueueArn --output text
}

for entry in "${QUEUES[@]}"; do
  queue="${entry%%|*}"
  filter="${entry#*|}"
  dlq="${queue}_failed"

  dlq_url=$(awslocal sqs create-queue --region "$REGION" --queue-name "$dlq" \
    --query QueueUrl --output text)
  dlq_arn=$(queue_arn "$dlq_url")

  # RedrivePolicy and FilterPolicy are JSON strings inside JSON; files avoid
  # shell quoting.
  attrs=$(mktemp)
  cat > "$attrs" <<EOF
{"RedrivePolicy": "{\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"$MAX_RECEIVES\"}"}
EOF
  queue_url=$(awslocal sqs create-queue --region "$REGION" --queue-name "$queue" \
    --attributes "file://$attrs" --query QueueUrl --output text)

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

  echo "queue ready: $queue (dlq: $dlq, maxReceiveCount: $MAX_RECEIVES, filter: $filter)"
done
