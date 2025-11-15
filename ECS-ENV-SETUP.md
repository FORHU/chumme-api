# Environment Variables Setup for ECS

This document explains how to securely manage environment variables for your chumme-api ECS deployment.

## Option 1: AWS Systems Manager Parameter Store (Recommended)

### 1. Store your environment variables in Parameter Store:

```bash
# Database configuration
aws ssm put-parameter --name "/chumme-api/DATABASE_URL" --value "your-database-url" --type "SecureString"

# Authentication secrets
aws ssm put-parameter --name "/chumme-api/ACCESS_TOKEN_SECRET" --value "b99d9648037af0a1cc35638a6d55ccc51c6649a5bb6295fb8849ac4274f7474e" --type "SecureString"
aws ssm put-parameter --name "/chumme-api/REFRESH_TOKEN_SECRET" --value "4cd7234d150c0a754f72798b87fa71eb4ca041a8225b24dce54c6aa14f4a14a5" --type "SecureString"
aws ssm put-parameter --name "/chumme-api/ACCESS_TOKEN_EXPIRY" --value "24h" --type "String"

# OpenAI configuration
aws ssm put-parameter --name "/chumme-api/OPENAI_API_KEY" --value "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" --type "SecureString"

# Mailer configuration
aws ssm put-parameter --name "/chumme-api/MAILER_TRANSPORT_HOST" --value "smtp.ethereal.email" --type "String"
aws ssm put-parameter --name "/chumme-api/MAILER_TRANSPORT_PORT" --value "587" --type "String"
aws ssm put-parameter --name "/chumme-api/MAILER_TRANSPORT_SECURE" --value "false" --type "String"
aws ssm put-parameter --name "/chumme-api/MAILER_EMAIL" --value "lane.schoen83@ethereal.email" --type "String"
aws ssm put-parameter --name "/chumme-api/MAILER_PASSWORD" --value "bDwAWSmTEK2bb3n3XY" --type "SecureString"

# Redis configuration
aws ssm put-parameter --name "/chumme-api/REDIS_HOST" --value "18.136.33.42" --type "String"
aws ssm put-parameter --name "/chumme-api/REDIS_PORT" --value "6379" --type "String"
aws ssm put-parameter --name "/chumme-api/REDIS_PASSWORD" --value "7E1edaAxrWT8BezqwXMDd7OXiNr2pUm6R6g81hW8msLCOkXo2kfV8X8BEqptMQGT" --type "SecureString"
aws ssm put-parameter --name "/chumme-api/REDIS_TTL_SECONDS" --value "3600" --type "String"

# RabbitMQ configuration
aws ssm put-parameter --name "/chumme-api/RABBITMQ_URL" --value "amqp://0jbZd2XrE2wDks7d:srNWW5ggnHPF0yQcPWnSLNaDOsbYrKnK@13.251.21.81:5673/" --type "SecureString"
```

### 2. Update your ECS Task Definition to use these parameters:

```json
{
    "family": "flawless-lion-ibkqr4",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::836628543332:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::836628543332:role/ecsTaskRole",
    "containerDefinitions": [
        {
            "name": "npx/chumme-api",
            "image": "836628543332.dkr.ecr.ap-southeast-1.amazonaws.com/npx/chumme-api:latest",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "essential": true,
            "secrets": [
                {
                    "name": "DATABASE_URL",
                    "valueFrom": "/chumme-api/DATABASE_URL"
                },
                {
                    "name": "ACCESS_TOKEN_SECRET",
                    "valueFrom": "/chumme-api/ACCESS_TOKEN_SECRET"
                },
                {
                    "name": "REFRESH_TOKEN_SECRET",
                    "valueFrom": "/chumme-api/REFRESH_TOKEN_SECRET"
                },
                {
                    "name": "OPENAI_API_KEY",
                    "valueFrom": "/chumme-api/OPENAI_API_KEY"
                },
                {
                    "name": "MAILER_PASSWORD",
                    "valueFrom": "/chumme-api/MAILER_PASSWORD"
                },
                {
                    "name": "REDIS_PASSWORD",
                    "valueFrom": "/chumme-api/REDIS_PASSWORD"
                },
                {
                    "name": "RABBITMQ_URL",
                    "valueFrom": "/chumme-api/RABBITMQ_URL"
                }
            ],
            "environment": [
                {
                    "name": "ACCESS_TOKEN_EXPIRY",
                    "value": "24h"
                },
                {
                    "name": "MAILER_TRANSPORT_HOST",
                    "value": "smtp.ethereal.email"
                },
                {
                    "name": "MAILER_TRANSPORT_PORT",
                    "value": "587"
                },
                {
                    "name": "MAILER_TRANSPORT_SECURE",
                    "value": "false"
                },
                {
                    "name": "MAILER_EMAIL",
                    "value": "lane.schoen83@ethereal.email"
                },
                {
                    "name": "REDIS_HOST",
                    "value": "18.136.33.42"
                },
                {
                    "name": "REDIS_PORT",
                    "value": "6379"
                },
                {
                    "name": "REDIS_TTL_SECONDS",
                    "value": "3600"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/flawless-lion-ibkqr4",
                    "awslogs-region": "ap-southeast-1",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
```

## Option 2: AWS Secrets Manager

### Store secrets in Secrets Manager:

```bash
aws secretsmanager create-secret --name "chumme-api/env" --secret-string '{
  "DATABASE_URL": "your-database-url",
  "ACCESS_TOKEN_SECRET": "your-access-token-secret",
  "REFRESH_TOKEN_SECRET": "your-refresh-token-secret",
  "OPENAI_API_KEY": "your-openai-api-key",
  "MAILER_PASSWORD": "your-email-password",
  "REDIS_PASSWORD": "your-redis-password",
  "RABBITMQ_URL": "amqp://admin:admin123@your-rabbitmq-host:5672/my_vhost"
}'
```

### Reference in task definition:

```json
"secrets": [
  {
    "name": "DATABASE_URL",
    "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:836628543332:secret:chumme-api/env:DATABASE_URL::"
  }
]
```

## Required IAM Permissions

Your ECS task execution role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameters",
                "ssm:GetParameter",
                "secretsmanager:GetSecretValue"
            ],
            "Resource": [
                "arn:aws:ssm:ap-southeast-1:836628543332:parameter/chumme-api/*",
                "arn:aws:secretsmanager:ap-southeast-1:836628543332:secret:chumme-api/*"
            ]
        }
    ]
}
```

## Quick Setup Script

Run this to set up all your parameters:

```bash
#!/bin/bash
# Replace with your actual values
DATABASE_URL="postgresql://user:pass@host:5432/db"
ACCESS_TOKEN_SECRET="your-secret-here"
REFRESH_TOKEN_SECRET="your-refresh-secret-here"
OPENAI_API_KEY="sk-your-key-here"
MAILER_PASSWORD="your-email-password"
REDIS_PASSWORD="your-redis-password"
RABBITMQ_URL="amqp://admin:admin123@host:5672/my_vhost"

# Store in Parameter Store
aws ssm put-parameter --name "/chumme-api/DATABASE_URL" --value "$DATABASE_URL" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/ACCESS_TOKEN_SECRET" --value "$ACCESS_TOKEN_SECRET" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/REFRESH_TOKEN_SECRET" --value "$REFRESH_TOKEN_SECRET" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/OPENAI_API_KEY" --value "$OPENAI_API_KEY" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/MAILER_PASSWORD" --value "$MAILER_PASSWORD" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/REDIS_PASSWORD" --value "$REDIS_PASSWORD" --type "SecureString" --overwrite
aws ssm put-parameter --name "/chumme-api/RABBITMQ_URL" --value "$RABBITMQ_URL" --type "SecureString" --overwrite

echo "Environment variables stored in Parameter Store!"
```
