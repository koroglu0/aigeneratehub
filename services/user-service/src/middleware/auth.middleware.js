'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { UnauthorizedError } = require('../errors/AppError');
const env = require('../config/env');

const authMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

module.exports = authMiddleware;
