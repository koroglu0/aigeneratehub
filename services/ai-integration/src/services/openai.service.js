'use strict';

const OpenAI = require('openai');
const env = require('../config/env');
const { AIProviderError } = require('../errors/AppError');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Generates an image using DALL-E 3.
 * @param {string} prompt - The finalized prompt string
 * @returns {Promise<{imageUrl: string, aiRequestId: string, generationMs: number}>}
 */
const generateImage = async (prompt) => {
  const startTime = Date.now();

  try {
    const response = await openai.images.generate({
      model: env.OPENAI_MODEL || 'dall-e-3',
      prompt,
      n: 1,
      size: env.OPENAI_IMAGE_SIZE || '1024x1024',
      quality: env.OPENAI_IMAGE_QUALITY || 'standard',
      response_format: 'url',
    });

    const generationMs = Date.now() - startTime;
    const imageUrl = response.data[0].url;
    const aiRequestId = response.id || null;

    logger.info({ message: 'Image generated', generationMs, aiRequestId });

    return { imageUrl, aiRequestId, generationMs };
  } catch (err) {
    logger.error({ message: 'OpenAI DALL-E 3 error', error: err.message });
    throw new AIProviderError(`Image generation failed: ${err.message}`);
  }
};

module.exports = { generateImage };
