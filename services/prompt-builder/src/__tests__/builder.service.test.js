'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars!!';
process.env.SERVICE_JWT_SECRET = 'service-secret-that-is-32-chars!!';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'local';
process.env.AWS_SECRET_ACCESS_KEY = 'local';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.LOG_LEVEL = 'error';

jest.mock('../services/template.service');

const { getMainTemplateById, batchGetObjectTemplates } = require('../services/template.service');
const { buildPrompt } = require('../services/builder.service');

const MAIN_TEMPLATE = {
  templateId: 'main_victory_day',
  displayName: 'Victory Day',
  category: 'national_holidays',
  displayOrder: 1,
  promptText: 'A majestic national victory celebration, golden sunlight over a grand plaza, triumphant crowds, national flags waving against a deep blue sky, cinematic composition, ultra-realistic 8K photography, warm golden-hour lighting, epic wide-angle perspective',
  styleModifiers: ['cinematic', 'ultra-realistic', '8K'],
  aspectRatio: '1:1',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const OBJ_BIRD = {
  objectId: 'obj_bird',
  displayName: 'Bird',
  primaryTag: 'nature',
  displayOrder: 1,
  promptText: 'a graceful white dove in mid-flight with wings fully spread, delicate feather detail visible, golden hour backlighting creating a halo effect',
  promptWeight: 0.25,
  isActive: true,
};

const OBJ_FLAG = {
  objectId: 'obj_flag',
  displayName: 'Flag',
  primaryTag: 'national',
  displayOrder: 1,
  promptText: 'a proud national flag waving gracefully in a gentle breeze, fabric texture detailed, dramatic lighting from behind',
  promptWeight: 0.30,
  isActive: true,
};

describe('builder.service.buildPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct finalPrompt when no objectTemplateIds are provided', async () => {
    getMainTemplateById.mockResolvedValue(MAIN_TEMPLATE);
    batchGetObjectTemplates.mockResolvedValue([]);

    const result = await buildPrompt('main_victory_day', []);

    expect(result.finalPrompt).toContain(MAIN_TEMPLATE.promptText);
    expect(result.finalPrompt).toContain('high quality, professional digital art');
    expect(result.truncated).toBe(false);
    expect(result.objectsUsed).toEqual([]);
    expect(result.mainTemplateId).toBe('main_victory_day');
  });

  it('sorts objects by promptWeight descending before building objectClause', async () => {
    getMainTemplateById.mockResolvedValue(MAIN_TEMPLATE);
    batchGetObjectTemplates.mockResolvedValue([OBJ_BIRD, OBJ_FLAG]);

    const result = await buildPrompt('main_victory_day', ['obj_bird', 'obj_flag']);

    // flag (0.30) should appear before bird (0.25)
    const flagIdx = result.finalPrompt.indexOf(OBJ_FLAG.promptText);
    const birdIdx = result.finalPrompt.indexOf(OBJ_BIRD.promptText);
    expect(flagIdx).toBeLessThan(birdIdx);
    expect(result.objectsUsed[0]).toBe('obj_flag');
    expect(result.objectsUsed[1]).toBe('obj_bird');
  });

  it('appends styleModifiers to finalPrompt when array is non-empty', async () => {
    getMainTemplateById.mockResolvedValue(MAIN_TEMPLATE);
    batchGetObjectTemplates.mockResolvedValue([]);

    const result = await buildPrompt('main_victory_day', []);

    expect(result.finalPrompt).toContain('cinematic');
    expect(result.finalPrompt).toContain('ultra-realistic');
    expect(result.finalPrompt).toContain('8K');
  });

  it('truncates prompt at 1000 characters and returns truncated: true', async () => {
    const longTemplate = {
      ...MAIN_TEMPLATE,
      promptText: 'A'.repeat(900),
      styleModifiers: ['style1', 'style2'],
    };
    getMainTemplateById.mockResolvedValue(longTemplate);
    batchGetObjectTemplates.mockResolvedValue([OBJ_BIRD, OBJ_FLAG]);

    const result = await buildPrompt('main_victory_day', ['obj_bird', 'obj_flag']);

    expect(result.finalPrompt.length).toBeLessThanOrEqual(1000);
    expect(result.truncated).toBe(true);
  });

  it('uses ", featuring " for first object and ", alongside " for subsequent', async () => {
    getMainTemplateById.mockResolvedValue(MAIN_TEMPLATE);
    batchGetObjectTemplates.mockResolvedValue([OBJ_BIRD, OBJ_FLAG]);

    const result = await buildPrompt('main_victory_day', ['obj_bird', 'obj_flag']);

    expect(result.finalPrompt).toContain(', featuring ');
    expect(result.finalPrompt).toContain(', alongside ');
  });

  it('throws NotFoundError when mainTemplateId does not exist', async () => {
    const { NotFoundError } = require('../errors/AppError');
    getMainTemplateById.mockRejectedValue(new NotFoundError('Template main_unknown was not found'));

    await expect(buildPrompt('main_unknown', [])).rejects.toMatchObject({
      errorCode: 'NOT_FOUND',
      statusCode: 404,
    });
  });
});
