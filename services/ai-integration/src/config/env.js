'use strict';

const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  PORT: Joi.number().integer().default(3002),
  JWT_SECRET: Joi.string().min(32).required(),
  SERVICE_JWT_SECRET: Joi.string().min(32).required(),
  CORS_ORIGINS: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  DYNAMODB_ENDPOINT: Joi.string().uri().optional(),
  AI_PROVIDER: Joi.string().valid('openai', 'huggingface', 'pollinations').default('openai'),
  OPENAI_API_KEY: Joi.string().when('AI_PROVIDER', { is: 'openai', then: Joi.required(), otherwise: Joi.optional() }),
  OPENAI_MODEL: Joi.string().default('dall-e-3'),
  OPENAI_IMAGE_SIZE: Joi.string().default('1024x1024'),
  OPENAI_IMAGE_QUALITY: Joi.string().default('standard'),
  HF_API_KEY: Joi.string().when('AI_PROVIDER', { is: 'huggingface', then: Joi.required(), otherwise: Joi.optional() }),
  HF_MODEL: Joi.string().default('stabilityai/stable-diffusion-xl-base-1.0'),
  HF_NEGATIVE_PROMPT: Joi.string().optional(),
  S3_BUCKET: Joi.string().when('AI_PROVIDER', { is: 'huggingface', then: Joi.required(), otherwise: Joi.optional() }),
  PROMPT_BUILDER_URL: Joi.string().uri().required(),
}).unknown(true);

const { error, value } = schema.validate(process.env);

if (error) {
  // eslint-disable-next-line no-console
  console.error(`FATAL: Missing required env vars: ${error.message}`);
  process.exit(1);
}

module.exports = value;
