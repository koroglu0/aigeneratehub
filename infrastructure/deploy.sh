#!/usr/bin/env bash
set -euo pipefail

: "${PROMPT_BUILDER_URL:?Need to set PROMPT_BUILDER_URL}"
: "${AI_INTEGRATION_URL:?Need to set AI_INTEGRATION_URL}"
: "${USER_SERVICE_URL:?Need to set USER_SERVICE_URL}"
: "${CORS_ORIGINS:?Need to set CORS_ORIGINS}"

aws cloudformation deploy \
  --template-file infrastructure/api-gateway.json \
  --stack-name aigeneratehub-api-gateway \
  --parameter-overrides \
    PromptBuilderUrl="$PROMPT_BUILDER_URL" \
    AiIntegrationUrl="$AI_INTEGRATION_URL" \
    UserServiceUrl="$USER_SERVICE_URL" \
    CorsOrigins="$CORS_ORIGINS" \
  --capabilities CAPABILITY_IAM

echo "Deployment complete."
aws cloudformation describe-stacks \
  --stack-name aigeneratehub-api-gateway \
  --query "Stacks[0].Outputs" \
  --output table
