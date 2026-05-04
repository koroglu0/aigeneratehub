'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { generateRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter.middleware');
const { health, generate, getGenerationById, getModels } = require('../controllers/generate.controller');

const router = Router();

router.get('/health', health);
router.get('/models', generalRateLimiter, authMiddleware, getModels);
router.post('/generate', generateRateLimiter, authMiddleware, generate);
router.get('/generate/:requestId', generalRateLimiter, authMiddleware, getGenerationById);

module.exports = router;
