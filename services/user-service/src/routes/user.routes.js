'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('../errors/AppError');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  health,
  registerHandler,
  loginHandler,
  meHandler,
  registerSchema,
  loginSchema,
} = require('../controllers/user.controller');

const router = Router();

// Login rate limiter: 5 req/15min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next) => next(new RateLimitError('Too many login attempts')),
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter: 100 req/min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next) => next(new RateLimitError('Rate limit exceeded')),
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/health', health);
router.post('/users/register', generalLimiter, validate(registerSchema), registerHandler);
router.post('/users/login', loginLimiter, validate(loginSchema), loginHandler);
router.get('/users/me', generalLimiter, authMiddleware, meHandler);

module.exports = router;
