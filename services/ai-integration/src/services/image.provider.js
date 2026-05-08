'use strict';

const env = require('../config/env');
const pollinations = require('./pollinations.service');
const openai = require('./openai.service');
const huggingface = require('./huggingface.service');
const { ValidationError } = require('../errors/AppError');

const OPENAI_MODELS = new Set(['dall-e-3', 'dall-e-2']);

const requireOpenAI = () => {
  if (!env.OPENAI_API_KEY) {
    throw new ValidationError('OpenAI model requested but OPENAI_API_KEY is not configured');
  }
};

/**
 * Dispatches image generation to the correct provider based on model name.
 * - "dall-e-*" → OpenAI
 * - any other string → Pollinations (model name is passed through)
 * - if model is omitted, falls back to AI_PROVIDER env (legacy behavior)
 *
 * @param {string} prompt
 * @param {string} [model] - Model identifier chosen by the user
 * @returns {Promise<{imageUrl: string, aiRequestId: string|null, generationMs: number}>}
 */
const generateImage = (prompt, model) => {
  if (!model) {
    if (env.AI_PROVIDER === 'huggingface') return huggingface.generateImage(prompt);
    if (env.AI_PROVIDER === 'pollinations') return pollinations.generateImage(prompt);
    requireOpenAI();
    return openai.generateImage(prompt);
  }

  if (OPENAI_MODELS.has(model)) {
    requireOpenAI();
    return openai.generateImage(prompt);
  }

  return pollinations.generateImage(prompt, model);
};

const listModels = () => pollinations.listModels();

module.exports = { generateImage, listModels };
