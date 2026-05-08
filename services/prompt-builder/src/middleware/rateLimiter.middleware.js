'use strict';

const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('../errors/AppError');

const createLimiter = (windowMs, max, keyGenerator) => rateLimit({
  windowMs,
  max,
  keyGenerator,
  handler: (req, res, next) => next(new RateLimitError('Rate limit exceeded')),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for POST /prompts/build: 30 req/min per userId.
 */
const buildRateLimiter = createLimiter(
  60 * 1000,
  30,
  (req) => (req.user ? req.user.userId : req.ip),
);

/**
 * General rate limiter: 100 req/min per IP.
 */
const generalRateLimiter = createLimiter(
  60 * 1000,
  100,
  (req) => req.ip,
);

module.exports = { buildRateLimiter, generalRateLimiter };
