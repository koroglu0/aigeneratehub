'use strict';

/**
 * Higher-order function that wraps async Express route handlers to catch errors.
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware that catches promise rejections
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
