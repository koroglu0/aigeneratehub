'use strict';

const { AIProviderError } = require('../errors/AppError');
const logger = require('../utils/logger');

const generateImage = async (prompt) => {
  const startTime = Date.now();
  const seed = Math.floor(Math.random() * 999999);

  const imageUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1024&height=1024&seed=${seed}&nologo=true`;

  logger.info({ message: 'Pollinations generating image', seed, urlLength: imageUrl.length });

  // Actual GET triggers generation on Pollinations and caches the result.
  // When React Native later loads this URL, Pollinations serves from cache instantly.
  const response = await fetch(imageUrl);

  if (!response.ok) {
    const body = await response.text();
    throw new AIProviderError(`Pollinations API error ${response.status}: ${body.substring(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    const body = await response.text();
    throw new AIProviderError(`Pollinations returned non-image content (${contentType}): ${body.substring(0, 200)}`);
  }

  // Consume body so the download is complete and Pollinations caches it
  await response.arrayBuffer();

  const generationMs = Date.now() - startTime;
  logger.info({ message: 'Pollinations image ready', generationMs });

  return { imageUrl, aiRequestId: null, generationMs };
};

module.exports = { generateImage };
