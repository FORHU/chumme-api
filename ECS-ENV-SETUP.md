# Environment Variables Setup for ECS

How to manage environment variables for the chumme-api ECS deployment.

> **Never put a real value in this file.** Every example below is a placeholder.
> An earlier revision of this document contained live secrets and was pushed to
> `origin/main`; they remain readable in git history, so anything that was in it has to be
> rotated rather than merely deleted. See [`docs/SECRET-ROTATION.md`](docs/SECRET-ROTATION.md).
>
> The rule this file exists to enforce: secrets live in Parameter Store (or Secrets
> Manager) and reach the container through the task definition's `secrets` block. They
> never live in the repo, in the image, or in a task definition's plain `environment`
> block — `environment` values are visible to anyone who can call `DescribeTaskDefinition`.

## Option 1: AWS Systems Manager Parameter Store (Recommended)

### 1. Store your environment variables in Parameter Store

Run these with the real values substituted in. Prefer reading from a file or a shell
variable so the secret does not land in your shell history:

```bash
# Database configuration
# The app's dedicated role, NOT the RDS master user. See docs/DATABASE-SETUP.md.
aws ssm put-parameter --name "/chumme-api/DATABASE_URL" \
    --value "postgresql://<app_user>:<password>@<host>:5432/<database>?schema=public&sslmode=require" \
    --type "SecureString" --overwrite

# Authentication secrets — generate with: openssl rand -hex 32
aws ssm put-parameter --name "/chumme-api/ACCESS_TOKEN_SECRET"  --value "<64-hex-chars>" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/REFRESH_TOKEN_SECRET" --value "<64-hex-chars>" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/ACCESS_TOKEN_EXPIRY"  --value "24h"            --type "String"       --overwrite

# OpenAI configuration
aws ssm put-parameter --name "/chumme-api/OPENAI_API_KEY" --value "<sk-proj-...>" --type "SecureString" --overwrite

# Mailer configuration
aws ssm put-parameter --name "/chumme-api/MAILER_TRANSPORT_HOST"   --value "<smtp-host>" --type "String"       --overwrite
aws ssm put-parameter --name "/chumme-api/MAILER_TRANSPORT_PORT"   --value "587"         --type "String"       --overwrite
aws ssm put-parameter --name "/chumme-api/MAILER_TRANSPORT_SECURE" --value "false"       --type "String"       --overwrite
aws ssm put-parameter --name "/chumme-api/MAILER_EMAIL"            --value "<address>"   --type "String"       --overwrite
aws ssm put-parameter --name "/chumme-api/MAILER_PASSWORD"         --value "<password>"  --type "SecureString" --overwrite

# Redis configuration
aws ssm put-parameter --name "/chumme-api/REDIS_HOST"        --value "<host>"     --type "String"       --overwrite
aws ssm put-parameter --name "/chumme-api/REDIS_PORT"        --value "6379"       --type "String"       --overwrite
aws ssm put-parameter --name "/chumme-api/REDIS_PASSWORD"    --value "<password>" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/REDIS_TTL_SECONDS" --value "3600"       --type "String"       --overwrite

# RabbitMQ configuration
aws ssm put-parameter --name "/chumme-api/RABBITMQ_URL" \
    --value "amqp://<user>:<password>@<host>:5672/<vhost>" \
    --type "SecureString" --overwrite
```

Verify without printing the secret back to your terminal:

```bash
aws ssm get-parameters-by-path --path "/chumme-api" --query "Parameters[].Name" --output table
```

### 2. Update your ECS Task Definition to use these parameters

> The `family`, role ARNs and log group below must match the service the deploy workflow
> actually targets. As of this writing [`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml)
> deploys to cluster `uncommon-deer-0vc0dh` / task `uncommon-deer-0vc0dh-task`, so confirm
> the family before applying — an older revision of this doc referenced a different one.

```json
{
    "family": "<task-family>",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskRole",
    "containerDefinitions": [
        {
            "name": "chumme-api",
            "image": "<account-id>.dkr.ecr.<region>.amazonaws.com/npx/chumme-api:latest",
            "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
            "essential": true,
            "secrets": [
                { "name": "DATABASE_URL", "valueFrom": "/chumme-api/DATABASE_URL" },
                { "name": "ACCESS_TOKEN_SECRET", "valueFrom": "/chumme-api/ACCESS_TOKEN_SECRET" },
                { "name": "REFRESH_TOKEN_SECRET", "valueFrom": "/chumme-api/REFRESH_TOKEN_SECRET" },
                { "name": "OPENAI_API_KEY", "valueFrom": "/chumme-api/OPENAI_API_KEY" },
                { "name": "MAILER_PASSWORD", "valueFrom": "/chumme-api/MAILER_PASSWORD" },
                { "name": "REDIS_PASSWORD", "valueFrom": "/chumme-api/REDIS_PASSWORD" },
                { "name": "RABBITMQ_URL", "valueFrom": "/chumme-api/RABBITMQ_URL" }
            ],
            "environment": [
                { "name": "ACCESS_TOKEN_EXPIRY", "value": "24h" },
                { "name": "MAILER_TRANSPORT_HOST", "value": "<smtp-host>" },
                { "name": "MAILER_TRANSPORT_PORT", "value": "587" },
                { "name": "MAILER_TRANSPORT_SECURE", "value": "false" },
                { "name": "MAILER_EMAIL", "value": "<address>" },
                { "name": "REDIS_HOST", "value": "<host>" },
                { "name": "REDIS_PORT", "value": "6379" },
                { "name": "REDIS_TTL_SECONDS", "value": "3600" },
                { "name": "PORT", "value": "3000" }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/<task-family>",
                    "awslogs-region": "<region>",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
```

Only genuinely non-secret values belong in `environment`. Everything else goes in
`secrets`, which resolves from Parameter Store at task start.

## Option 2: AWS Secrets Manager

Use this instead of Parameter Store if you need automatic rotation or cross-account
sharing. Otherwise Option 1 is cheaper and sufficient.

```bash
aws secretsmanager create-secret \
    --name "chumme-api/database" \
    --secret-string '{"DATABASE_URL":"<connection-string>"}'
```

### Reference in task definition

```json
{
    "secrets": [
        {
            "name": "DATABASE_URL",
            "valueFrom": "arn:aws:secretsmanager:<region>:<account-id>:secret:chumme-api/database:DATABASE_URL::"
        }
    ]
}
```

## Required IAM Permissions

Attach to the **execution role** (`ecsTaskExecutionRole`) — it is the role that resolves
`secrets` before the container starts, not the task role.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath"],
            "Resource": "arn:aws:ssm:<region>:<account-id>:parameter/chumme-api/*"
        },
        {
            "Effect": "Allow",
            "Action": ["secretsmanager:GetSecretValue"],
            "Resource": "arn:aws:secretsmanager:<region>:<account-id>:secret:chumme-api/*"
        },
        {
            "Effect": "Allow",
            "Action": ["kms:Decrypt"],
            "Resource": "arn:aws:kms:<region>:<account-id>:key/<key-id>"
        }
    ]
}
```

The `kms:Decrypt` statement is required for `SecureString` parameters. Omitting it is the
usual cause of a task that fails to start with `ResourceInitializationError`.

## Quick Setup Script

```bash
#!/usr/bin/env bash
set -euo pipefail

# Read values from your local .env rather than hardcoding them here.
# .env is gitignored; this script must stay that way too if you ever add values to it.
set -a; source .env; set +a

put_secret() {
    aws ssm put-parameter --name "/chumme-api/$1" --value "$2" --type "SecureString" --overwrite >/dev/null
    echo "  stored /chumme-api/$1"
}

put_plain() {
    aws ssm put-parameter --name "/chumme-api/$1" --value "$2" --type "String" --overwrite >/dev/null
    echo "  stored /chumme-api/$1"
}

echo "Storing parameters..."
put_secret DATABASE_URL         "$DATABASE_URL"
put_secret ACCESS_TOKEN_SECRET  "$ACCESS_TOKEN_SECRET"
put_secret REFRESH_TOKEN_SECRET "$REFRESH_TOKEN_SECRET"
put_secret OPENAI_API_KEY       "$OPENAI_API_KEY"
put_secret MAILER_PASSWORD      "$MAILER_PASSWORD"
put_secret REDIS_PASSWORD       "$REDIS_PASSWORD"
put_secret RABBITMQ_URL         "$RABBITMQ_URL"
put_plain  ACCESS_TOKEN_EXPIRY  "$ACCESS_TOKEN_EXPIRY"
put_plain  REDIS_HOST           "$REDIS_HOST"
put_plain  REDIS_PORT           "$REDIS_PORT"
put_plain  REDIS_TTL_SECONDS    "$REDIS_TTL_SECONDS"
echo "Done. Force a new deployment for the task to pick them up."
```

## Related

- [`docs/DATABASE-SETUP.md`](docs/DATABASE-SETUP.md) — provisioning the Postgres database and its app role
- [`docs/SECRET-ROTATION.md`](docs/SECRET-ROTATION.md) — what to rotate after the git-history leak
