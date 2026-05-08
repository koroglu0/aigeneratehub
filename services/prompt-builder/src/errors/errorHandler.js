'use strict';

const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Global Express error handler middleware.
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const requestId = req.id || 'unknown';

  if (err.isOperational) {
    logger.error({
      message: err.message,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      requestId,
      stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        requestId,
      },
    });
  }

  logger.error({
    level: 'CRITICAL',
    message: err.message,
    requestId,
    stack: err.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  });
};

module.exports = errorHandler;
