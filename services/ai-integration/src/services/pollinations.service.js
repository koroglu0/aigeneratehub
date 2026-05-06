'use strict';

const { uploadImageBuffer } = require('./s3.service');
const { AIProviderError } = require('../errors/AppError');
const logger = require('../utils/logger');

const DEFAULT_MODEL = 'flux';
const MODELS_ENDPOINT = 'https://image.pollinations.ai/models';

// Pollinations'ın /models endpoint'i şu anda çoğu modeli listelemiyor (yalnızca "sana" dönüyor),
// ancak URL ile doğrudan istek atılınca aşağıdaki modeller hâlâ çalışıyor.
const KNOWN_MODELS = [
  { id: 'flux',       name: 'Flux',          description: 'High-quality general-purpose image model' },
  { id: 'flux-realism', name: 'Flux Realism', description: 'Photorealistic Flux variant' },
  { id: 'flux-anime', name: 'Flux Anime',    description: 'Anime/illustration-tuned Flux' },
  { id: 'flux-3d',    name: 'Flux 3D',       description: '3D render style Flux variant' },
  { id: 'flux-pro',   name: 'Flux Pro',      description: 'Premium Flux quality tier' },
  { id: 'turbo',      name: 'Turbo',         description: 'Fast generation, lower quality' },
  { id: 'gptimage',   name: 'GPT Image',     description: 'OpenAI-style image model' },
  { id: 'sana',       name: 'Sana',          description: 'NVIDIA Sana model' },
];

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

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const s3Url = await uploadImageBuffer(buffer, contentType);

  const generationMs = Date.now() - startTime;
  logger.info({ message: 'Pollinations image ready', model, generationMs });

  return { imageUrl: s3Url, aiRequestId: null, generationMs };
};

let cachedModels = null;
let cachedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

const listModels = async () => {
  const now = Date.now();
  if (cachedModels && now - cachedAt < CACHE_TTL_MS) {
    return cachedModels;
  }

  let apiModels = [];
  try {
    const response = await fetch(MODELS_ENDPOINT);
    if (response.ok) {
      const data = await response.json();
      apiModels = Array.isArray(data)
        ? data.map((m) =>
            typeof m === 'string'
              ? { id: m, name: m }
              : { id: m.name || m.id, name: m.name || m.id, description: m.description }
          )
        : [];
    } else {
      logger.warn({ message: 'Pollinations /models returned non-OK', status: response.status });
    }
  } catch (err) {
    logger.warn({ message: 'Pollinations /models fetch failed, using known list', error: err.message });
  }

  // Bilinen modelleri API yanıtıyla id'ye göre birleştir; API'nin verdiği açıklama varsa onu koru.
  const byId = new Map();
  for (const m of KNOWN_MODELS) byId.set(m.id, { ...m });
  for (const m of apiModels) {
    const existing = byId.get(m.id);
    byId.set(m.id, {
      id: m.id,
      name: m.name || existing?.name || m.id,
      description: m.description || existing?.description,
    });
  }

  const models = Array.from(byId.values());
  cachedModels = models;
  cachedAt = now;
  return models;
};

module.exports = { generateImage, listModels };
