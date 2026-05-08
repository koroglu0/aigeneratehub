<<<<<<< HEAD
# aigeneratehub
=======
# AI Generate Hub — Backend

A production-ready Node.js microservices backend for an AI-powered visual generation mobile app.

## Architecture

```
                           ┌─────────────────────────────────────────┐
                           │         AWS API Gateway (HTTP API)       │
React Native App  ──────►  │  Single public URL, JWT auth, CORS       │
                           └───────────┬─────────────┬───────────────┘
                                       │             │             │
                    /api/v1/templates  │  /api/v1/   │  /api/v1/   │  /api/v1/
                    /api/v1/prompts    │  generate   │  users      │
                                       ▼             ▼             ▼
                           ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
                           │ prompt-builder│ │ ai-integration│ │  user-service │
                           │   :3001       │ │   :3002       │ │   :3003       │
                           └──────┬────────┘ └──────┬────────┘ └──────┬────────┘
                                  │                 │                 │
                                  ▼                 ▼                 ▼
                           ┌──────────────┐  ┌──────────────┐ ┌──────────────┐
                           │  DynamoDB    │  │ OpenAI       │ │  DynamoDB    │
                           │  Local :8000 │  │ DALL-E 3     │ │  Local :8000 │
                           └──────────────┘  └──────────────┘ └──────────────┘
```

## Prerequisites

- Node.js 20 LTS
- Docker
- Docker Compose

## Quick Start

```bash
git clone <repository-url>
cp .env.example .env       # fill in OPENAI_API_KEY and JWT_SECRET
docker-compose up -d
node scripts/seed-dynamodb.js
```

For local development with hot reload and DynamoDB Admin UI:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

The local proxy (replicating API Gateway routing) runs on `http://localhost:4000`.

## API Reference

| Method | Path | Service | Auth Required | Description |
|--------|------|---------|---------------|-------------|
| GET | /api/v1/health | prompt-builder | No | Health check |
| GET | /api/v1/templates/main | prompt-builder | Yes | List main templates |
| GET | /api/v1/templates/main/:id | prompt-builder | Yes | Get single main template |
| GET | /api/v1/templates/objects | prompt-builder | Yes | List object templates |
| POST | /api/v1/prompts/build | prompt-builder | Yes | Build AI prompt |
| GET | /api/v1/health | ai-integration | No | Health check |
| POST | /api/v1/generate | ai-integration | Yes | Generate image with DALL-E 3 |
| GET | /api/v1/generate/:requestId | ai-integration | Yes | Get generation status |
| GET | /api/v1/health | user-service | No | Health check |
| POST | /api/v1/users/register | user-service | No | Register new user |
| POST | /api/v1/users/login | user-service | No | Login, receive JWT |
| GET | /api/v1/users/me | user-service | Yes | Get current user profile |

## Environment Variables

| Variable | Service | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| NODE_ENV | All | No | development | Runtime environment |
| LOG_LEVEL | All | No | info | Winston log level |
| JWT_SECRET | All | Yes | — | JWT signing secret (min 32 chars) |
| SERVICE_JWT_SECRET | All | Yes | — | Service-to-service JWT secret |
| CORS_ORIGINS | All | Yes | — | Comma-separated allowed origins |
| AWS_REGION | All | Yes | — | AWS region |
| AWS_ACCESS_KEY_ID | All | Yes | — | AWS credentials |
| AWS_SECRET_ACCESS_KEY | All | Yes | — | AWS credentials |
| DYNAMODB_ENDPOINT | All | No | — | DynamoDB endpoint (local dev) |
| PORT | prompt-builder | No | 3001 | Service port |
| PORT | ai-integration | No | 3002 | Service port |
| PORT | user-service | No | 3003 | Service port |
| OPENAI_API_KEY | ai-integration | Yes | — | OpenAI API key |
| OPENAI_MODEL | ai-integration | No | dall-e-3 | OpenAI model |
| OPENAI_IMAGE_SIZE | ai-integration | No | 1024x1024 | Image size |
| OPENAI_IMAGE_QUALITY | ai-integration | No | standard | Image quality |
| PROMPT_BUILDER_URL | ai-integration | Yes | — | URL of prompt-builder service |
| BCRYPT_ROUNDS | user-service | No | 12 | bcrypt hash rounds |
| API_GATEWAY_URL | — | No | — | AWS API Gateway public URL |
| AI_INTEGRATION_URL | — | No | — | AI integration URL for API GW |
| USER_SERVICE_URL | — | No | — | User service URL for API GW |

## Running Tests

```bash
cd services/prompt-builder
npm install
npm test
```

Tests use Jest + Supertest with mocked DynamoDB. Coverage report is generated in `coverage/`.

## How to Add a New Main Template

Use the AWS CLI or DynamoDB Admin UI at `http://localhost:8001`. Example PutItem:

```bash
aws dynamodb put-item \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --table-name MainTemplates \
  --item '{
    "templateId": {"S": "main_ramadan"},
    "displayName": {"S": "Ramadan"},
    "category": {"S": "religious"},
    "displayOrder": {"N": "2"},
    "promptText": {"S": "A peaceful Ramadan night scene..."},
    "styleModifiers": {"L": [{"S": "cinematic"}, {"S": "warm"}]},
    "aspectRatio": {"S": "1:1"},
    "isActive": {"BOOL": true},
    "createdAt": {"S": "2025-01-01T00:00:00.000Z"},
    "updatedAt": {"S": "2025-01-01T00:00:00.000Z"}
  }'
```

## Deploying API Gateway

```bash
export PROMPT_BUILDER_URL=https://your-prompt-builder-url
export AI_INTEGRATION_URL=https://your-ai-integration-url
export USER_SERVICE_URL=https://your-user-service-url
export CORS_ORIGINS="https://your-app.com"

bash infrastructure/deploy.sh
```

## Future Roadmap

- **AWS Cognito integration** — Replace custom JWT auth with Cognito user pools for enterprise SSO and MFA support
- **S3 for image storage** — Persist generated images to S3 instead of relying on OpenAI's temporary URLs
- **Social sharing feature** — Allow users to share generated images directly to social platforms
- **Image history with pagination** — Browse past generations using the GenerationRequests GSI with cursor-based pagination
- **Kubernetes deployment** — Migrate from Docker Compose to Kubernetes (EKS) with Helm charts for autoscaling and rolling deployments
>>>>>>> main
