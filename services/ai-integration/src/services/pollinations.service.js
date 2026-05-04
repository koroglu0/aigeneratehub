'use strict';

const { AIProviderError } = require('../errors/AppError');
const logger = require('../utils/logger');

const DEFAULT_MODEL = 'flux';
const MODELS_ENDPOINT = 'https://image.pollinations.ai/models';

const generateImage = async (prompt, model = DEFAULT_MODEL) => {
  const startTime = Date.now();
  const seed = Math.floor(Math.random() * 999999);

  const params = new URLSearchParams({
    width: '1024',
    height: '1024',
    seed: String(seed),
    model,
    nologo: 'true',
  });
  const imageUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

  logger.info({ message: 'Pollinations generating image', model, seed });

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

  await response.arrayBuffer();

  const generationMs = Date.now() - startTime;
  logger.info({ message: 'Pollinations image ready', model, generationMs });

  return { imageUrl, aiRequestId: null, generationMs };
};

let cachedModels = null;
let cachedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

const listModels = async () => {
  const now = Date.now();
  if (cachedModels && now - cachedAt < CACHE_TTL_MS) {
    return cachedModels;
  }

  const response = await fetch(MODELS_ENDPOINT);
  if (!response.ok) {
    throw new AIProviderError(`Pollinations models endpoint returned ${response.status}`);
  }

  const data = await response.json();
  const models = Array.isArray(data)
    ? data.map((m) => (typeof m === 'string' ? { id: m, name: m } : { id: m.name || m.id, name: m.name || m.id, description: m.description }))
    : [];

  cachedModels = models;
  cachedAt = now;
  return models;
};

module.exports = { generateImage, listModels };
