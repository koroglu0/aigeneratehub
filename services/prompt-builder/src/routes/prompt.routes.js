'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { buildRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter.middleware');
const {
  health,
  listMain,
  getMain,
  listObjects,
  buildPromptHandler,
} = require('../controllers/prompt.controller');

const router = Router();

router.get('/health', health);

router.get('/templates/main', generalRateLimiter, authMiddleware, listMain);
router.get('/templates/main/:templateId', generalRateLimiter, authMiddleware, getMain);
router.get('/templates/objects', generalRateLimiter, authMiddleware, listObjects);

router.post('/prompts/build', buildRateLimiter, authMiddleware, buildPromptHandler);

module.exports = router;
