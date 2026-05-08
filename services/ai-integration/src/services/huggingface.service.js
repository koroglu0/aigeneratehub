'use strict';

const { uploadImageBuffer } = require('./s3.service');
const { AIProviderError } = require('../errors/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateImage = async (prompt) => {
  const startTime = Date.now();
  const apiUrl = `https://api-inference.huggingface.co/models/${env.HF_MODEL}`;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.HF_API_KEY}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
        Accept: 'image/png,image/jpeg,image/*',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: env.HF_NEGATIVE_PROMPT || 'blurry, bad quality, distorted, deformed',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
        options: { wait_for_model: true },
      }),
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'image/png';

      if (!contentType.startsWith('image/')) {
        const body = await response.text();
        throw new AIProviderError(`HF API returned unexpected content-type ${contentType}: ${body}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const generationMs = Date.now() - startTime;
      const imageUrl = await uploadImageBuffer(buffer, contentType);

      logger.info({ message: 'HF SDXL image generated', model: env.HF_MODEL, generationMs });
      return { imageUrl, aiRequestId: null, generationMs };
    }

    const errorBody = await response.text();
    logger.warn({ message: `HF API attempt ${attempt} failed`, status: response.status, body: errorBody });

    // 503 means the model is still loading — retry after delay
    if (response.status === 503 && attempt < 3) {
      await sleep(20000);
      continue;
    }

    lastError = `HF API error ${response.status}: ${errorBody}`;
    break;
  }

  throw new AIProviderError(`Image generation failed: ${lastError}`);
};

module.exports = { generateImage };
