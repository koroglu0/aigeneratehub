'use strict';

const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const { buildPrompt } = require('../services/builder.service');
const {
  listMainTemplates,
  getMainTemplateForClient,
  listObjectTemplates,
} = require('../services/template.service');
const { v4: uuidv4 } = require('uuid');

const buildSchema = Joi.object({
  mainTemplateId: Joi.string().required(),
  objectTemplateIds: Joi.array()
    .items(Joi.string().pattern(/^obj_[a-z0-9_]+$/))
    .max(5)
    .default([]),
});

/**
 * GET /api/v1/health
 */
const health = asyncHandler(async (req, res) => {
  res.json({ status: 'ok', service: 'prompt-builder', timestamp: new Date().toISOString() });
});

/**
 * GET /api/v1/templates/main
 */
const listMain = asyncHandler(async (req, res) => {
  const { category, limit, lastKey } = req.query;
  const result = await listMainTemplates({
    category,
    limit: limit ? parseInt(limit, 10) : undefined,
    lastKey: lastKey ? JSON.parse(lastKey) : undefined,
  });
  res.json({ success: true, data: result });
});

/**
 * GET /api/v1/templates/main/:templateId
 */
const getMain = asyncHandler(async (req, res) => {
  const item = await getMainTemplateForClient(req.params.templateId);
  res.json({ success: true, data: item });
});

/**
 * GET /api/v1/templates/objects
 */
const listObjects = asyncHandler(async (req, res) => {
  const { primaryTag, limit, lastKey } = req.query;
  const result = await listObjectTemplates({
    primaryTag,
    limit: limit ? parseInt(limit, 10) : undefined,
    lastKey: lastKey ? JSON.parse(lastKey) : undefined,
  });
  res.json({ success: true, data: result });
});

/**
 * POST /api/v1/prompts/build
 */
const buildPromptHandler = asyncHandler(async (req, res) => {
  const { error, value } = buildSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const { ValidationError } = require('../errors/AppError');
    throw new ValidationError(error.details.map((d) => d.message).join('; '));
  }

  const { mainTemplateId, objectTemplateIds } = value;
  const result = await buildPrompt(mainTemplateId, objectTemplateIds);

  const role = req.user?.role;
  if (role === 'service' || role === 'admin') {
    return res.json({ success: true, data: result });
  }

  // Regular users don't see the finalPrompt (IP protection)
  return res.json({
    success: true,
    data: {
      buildId: uuidv4(),
      objectsUsed: result.objectsUsed,
    },
  });
});

module.exports = { health, listMain, getMain, listObjects, buildPromptHandler };
