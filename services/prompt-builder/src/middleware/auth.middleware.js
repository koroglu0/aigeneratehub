'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { UnauthorizedError } = require('../errors/AppError');
const env = require('../config/env');

/**
 * JWT authentication middleware. Verifies Bearer token and attaches user to req.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    // Detect token type without verification, then verify with the correct secret.
    // Service tokens (role: "service") are signed with SERVICE_JWT_SECRET;
    // user tokens are signed with JWT_SECRET.
    const unverified = jwt.decode(token);
    const secret = unverified?.role === 'service' ? env.SERVICE_JWT_SECRET : env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

module.exports = authMiddleware;
