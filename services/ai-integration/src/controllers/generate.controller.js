'use strict';

const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const callService = require('../utils/callService');
const { generateImage } = require('../services/image.provider');
const { checkIdempotency, createRequest, updateRequest, getRequest } = require('../services/idempotency.service');
const { ValidationError, NotFoundError, UnauthorizedError } = require('../errors/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');

const generateSchema = Joi.object({
  mainTemplateId: Joi.string().required(),
  objectTemplateIds: Joi.array().items(Joi.string()).max(5).default([]),
  userId: Joi.string().required(),
});

/**
 * GET /api/v1/health
 */
const health = asyncHandler(async (req, res) => {
  res.json({ status: 'ok', service: 'ai-integration', timestamp: new Date().toISOString() });
});

/**
 * POST /api/v1/generate
 */
const generate = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    throw new ValidationError('Idempotency-Key header is required');
  }

  const { error, value } = generateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new ValidationError(error.details.map((d) => d.message).join('; '));
  }

  const { mainTemplateId, objectTemplateIds, userId } = value;

  // Check idempotency
  const existing = await checkIdempotency(idempotencyKey);
  if (existing) {
    if (existing.status === 'completed') {
      return res.json({
        success: true,
        data: {
          requestId: existing.requestId,
          imageUrl: existing.imageUrl,
          generationMs: existing.generationMs,
          status: 'completed',
        },
      });
    }
    if (existing.status === 'processing') {
      return res.status(202).json({
        success: true,
        data: { requestId: existing.requestId, status: 'processing' },
      });
    }
  }

  const requestId = uuidv4();

  // Create record with status "pending"
  await createRequest({ requestId, idempotencyKey, userId, mainTemplateId, objectTemplateIds });

  // Call prompt-builder with service JWT
  const builderUrl = `${env.PROMPT_BUILDER_URL}/api/v1/prompts/build`;
  const builderResponse = await callService(builderUrl, {
    method: 'POST',
    body: { mainTemplateId, objectTemplateIds },
  });

  const { finalPrompt } = builderResponse.data;
  logger.info({ message: 'Prompt built', requestId, finalPrompt });

  // Update status to processing and return 202 immediately
  await updateRequest(requestId, { status: 'processing', finalPrompt });

  res.status(202).json({
    success: true,
    data: { requestId, status: 'processing' },
  });

  // Fire-and-forget: call OpenAI in background after response is sent
  setImmediate(async () => {
    try {
      const { imageUrl, aiRequestId, generationMs } = await generateImage(finalPrompt);
      await updateRequest(requestId, { status: 'completed', imageUrl, aiRequestId, generationMs });
    } catch (err) {
      logger.error({ message: 'Background generation failed', requestId, error: err.message });
      await updateRequest(requestId, { status: 'failed', errorMessage: err.message });
    }
  });
});

/**
 * GET /api/v1/generate/:requestId
 */
const getGenerationById = asyncHandler(async (req, res) => {
  const record = await getRequest(req.params.requestId);
  if (!record) {
    throw new NotFoundError(`Request ${req.params.requestId} was not found`);
  }

  const { aiRequestId, ...safeRecord } = record;
  res.json({ success: true, data: safeRecord });
});

module.exports = { health, generate, getGenerationById };
