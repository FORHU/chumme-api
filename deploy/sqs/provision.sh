#!/bin/bash
# Creates chumme's SQS queues and SNS topic in real AWS — the server-side twin
# of docker/localstack/init-queues.sh. Same queues, DLQs, maxReceiveCount and
# routing filters; only the names gain an environment prefix.
#
#   bash deploy/sqs/provision.sh dev     # dev-chumme-*  (shared dev host)
#   bash deploy/sqs/provision.sh prod    # prod-chumme-* (production EC2)
#
# Run it from AWS CloudShell (ap-southeast-1) or anywhere with an admin
# profile. Safe to re-run: every call either creates or converges to the same
# state, so it doubles as the "fix drift" command.
#
# The dev- prefix is not cosmetic: the shared dev host's instance role only
# grants SQS on dev-*. A queue named without it is invisible to the container.
#
# Adding a queue: append it here AND in init-queues.sh, then add its
# *_QUEUE_URL to both deploy workflows and deploy/app.env.example.
set -euo pipefail

ENV_NAME="${1:-}"
case "$ENV_NAME" in
  dev|prod) ;;
  *) echo "usage: $0 dev|prod" >&2; exit 2 ;;
esac

REGION="${AWS_REGION:-ap-southeast-1}"
MAX_RECEIVES="${QUEUE_MAX_RECEIVES:-5}"
PREFIX="${ENV_NAME}-chumme-"
TOPIC="${PREFIX}events"

# Same table as init-queues.sh: "<queue>|<SNS filter on eventType>".
QUEUES=(
  'media_processing_queue|{"eventType":["media.process"]}'
  'audio-merge-queue|{"eventType":["audio.merge"]}'
  'ingestion_jobs|{"eventType":[{"prefix":"ingestion."}]}'
)

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "account $ACCOUNT_ID, region $REGION, env $ENV_NAME"

topic_arn=$(aws sns create-topic --region "$REGION" --name "$TOPIC" \
  --query TopicArn --output text)
echo "topic ready: $topic_arn"

queue_arn() {
  aws sqs get-queue-attributes --region "$REGION" --queue-url "$1" \
    --attribute-names QueueArn --query Attributes.QueueArn --output text
}

attrs=$(mktemp)
trap 'rm -f "$attrs"' EXIT

for entry in "${QUEUES[@]}"; do
  base="${entry%%|*}"
  filter="${entry#*|}"
  queue="${PREFIX}${base}"
  dlq="${queue}_failed"

  dlq_url=$(aws sqs create-queue --region "$REGION" --queue-name "$dlq" \
    --query QueueUrl --output text)
  dlq_arn=$(queue_arn "$dlq_url")

  # create-queue fails on an existing queue whose attributes differ, so create
  # it bare and converge the attributes separately.
  queue_url=$(aws sqs create-queue --region "$REGION" --queue-name "$queue" \
    --query QueueUrl --output text)
  q_arn=$(queue_arn "$queue_url")

  # The access policy is the step LocalStack never checks: without it SNS is
  # refused at delivery time and published events vanish without an error on
  # the publishing side. SourceArn pins it to this one topic.
  policy=$(printf '{"Version":"2012-10-17","Statement":[{"Sid":"AllowChummeEventsTopic","Effect":"Allow","Principal":{"Service":"sns.amazonaws.com"},"Action":"sqs:SendMessage","Resource":"%s","Condition":{"ArnEquals":{"aws:SourceArn":"%s"}}}]}' \
    "$q_arn" "$topic_arn")
  redrive=$(printf '{"deadLetterTargetArn":"%s","maxReceiveCount":"%s"}' "$dlq_arn" "$MAX_RECEIVES")
  # Both are JSON strings inside JSON; jq does the escaping.
  jq -n --arg p "$policy" --arg r "$redrive" '{Policy: $p, RedrivePolicy: $r}' > "$attrs"
  aws sqs set-queue-attributes --region "$REGION" --queue-url "$queue_url" \
    --attributes "file://$attrs"

  # subscribe returns the existing subscription for the same endpoint, but
  # refuses if its attributes differ — so subscribe bare, then set each one.
  sub_arn=$(aws sns subscribe --region "$REGION" --topic-arn "$topic_arn" \
    --protocol sqs --notification-endpoint "$q_arn" \
    --return-subscription-arn --query SubscriptionArn --output text)
  aws sns set-subscription-attributes --region "$REGION" --subscription-arn "$sub_arn" \
    --attribute-name RawMessageDelivery --attribute-value true
  aws sns set-subscription-attributes --region "$REGION" --subscription-arn "$sub_arn" \
    --attribute-name FilterPolicy --attribute-value "$filter"

  echo "queue ready: $queue (dlq: $dlq, maxReceiveCount: $MAX_RECEIVES, filter: $filter)"
done

base_url="https://sqs.${REGION}.amazonaws.com/${ACCOUNT_ID}"
cat <<EOF

Done. The deploy workflow derives these itself; they are printed so you can
check them against the app's env on the box:

  MEDIA_PROCESSING_QUEUE_URL=${base_url}/${PREFIX}media_processing_queue
  AUDIO_MERGE_QUEUE_URL=${base_url}/${PREFIX}audio-merge-queue
  INGESTION_JOBS_QUEUE_URL=${base_url}/${PREFIX}ingestion_jobs
  CHUMME_EVENTS_TOPIC_ARN=${topic_arn}
EOF
