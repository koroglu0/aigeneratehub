'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set env vars before requiring app
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
jest.mock('../services/builder.service');

const { listMainTemplates, getMainTemplateForClient, listObjectTemplates } = require('../services/template.service');
const { buildPrompt } = require('../services/builder.service');

const app = require('../app');

const makeToken = (role = 'user') => jwt.sign(
  { userId: 'user_test123', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' },
);

describe('GET /api/v1/health', () => {
  it('returns 200 with correct shape', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'prompt-builder');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/v1/templates/main', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/templates/main');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with items array when JWT is valid', async () => {
    listMainTemplates.mockResolvedValue({
      items: [
        {
          templateId: 'main_victory_day',
          displayName: 'Victory Day',
          category: 'national_holidays',
          displayOrder: 1,
          aspectRatio: '1:1',
          isActive: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      count: 1,
      lastKey: null,
    });

    const res = await request(app)
      .get('/api/v1/templates/main')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0]).not.toHaveProperty('promptText');
    expect(res.body.data.items[0]).not.toHaveProperty('styleModifiers');
  });
});

describe('POST /api/v1/prompts/build', () => {
  it('returns 400 when mainTemplateId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/prompts/build')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ objectTemplateIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with buildId for user role', async () => {
    buildPrompt.mockResolvedValue({
      finalPrompt: 'A great scene...',
      truncated: false,
      objectsUsed: ['obj_bird'],
      mainTemplateId: 'main_victory_day',
    });

    const res = await request(app)
      .post('/api/v1/prompts/build')
      .set('Authorization', `Bearer ${makeToken('user')}`)
      .send({ mainTemplateId: 'main_victory_day', objectTemplateIds: ['obj_bird'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('buildId');
    expect(res.body.data).not.toHaveProperty('finalPrompt');
  });

  it('returns 200 with finalPrompt for service role', async () => {
    buildPrompt.mockResolvedValue({
      finalPrompt: 'A great scene...',
      truncated: false,
      objectsUsed: ['obj_bird'],
      mainTemplateId: 'main_victory_day',
    });

    const serviceToken = jwt.sign(
      { userId: 'service_ai', role: 'service' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .post('/api/v1/prompts/build')
      .set('Authorization', `Bearer ${serviceToken}`)
      .send({ mainTemplateId: 'main_victory_day', objectTemplateIds: ['obj_bird'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('finalPrompt');
  });
});
