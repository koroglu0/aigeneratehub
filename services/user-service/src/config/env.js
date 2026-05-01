'use strict';

const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  PORT: Joi.number().integer().default(3003),
  JWT_SECRET: Joi.string().min(32).required(),
  SERVICE_JWT_SECRET: Joi.string().min(32).required(),
  CORS_ORIGINS: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  DYNAMODB_ENDPOINT: Joi.string().uri().optional(),
  BCRYPT_ROUNDS: Joi.number().integer().default(12),
}).unknown(true);

const { error, value } = schema.validate(process.env);

if (error) {
  // eslint-disable-next-line no-console
  console.error(`FATAL: Missing required env vars: ${error.message}`);
  process.exit(1);
}

module.exports = value;
