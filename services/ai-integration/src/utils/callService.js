'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ServiceUnavailableError, AIProviderError } = require('../errors/AppError');
const logger = require('./logger');

const RETRY_DELAYS = [100, 200, 400];

/**
 * Makes an HTTP call to an internal service with retry and exponential backoff.
 * @param {string} url - Target URL
 * @param {Object} options
 * @param {string} [options.method] - HTTP method (default: POST)
 * @param {Object} [options.body] - Request body
 * @param {Object} [options.headers] - Additional headers
 * @param {number} [options.attempt] - Internal retry counter
 * @returns {Promise<Object>} Parsed JSON response
 */
const callService = async (url, { method = 'POST', body, headers = {}, attempt = 0 } = {}) => {
  const serviceToken = jwt.sign(
    { userId: 'service_ai_integration', role: 'service' },
    env.SERVICE_JWT_SECRET,
    { expiresIn: '5m' },
  );

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
      ...headers,
    },
    signal: AbortSignal.timeout(5000),
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new ServiceUnavailableError(`Service returned ${response.status}: ${data?.error?.message || 'Unknown error'}`);
      }
      throw new AIProviderError(`Service returned ${response.status}: ${data?.error?.message || 'Unknown error'}`);
    }

    return data;
  } catch (err) {
    if (err.isOperational && err.name !== 'AIProviderError') throw err;

    if (attempt < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[attempt];
      logger.warn({ message: `Service call failed, retrying in ${delay}ms`, url, attempt, error: err.message });
      await new Promise((resolve) => { setTimeout(resolve, delay); });
      return callService(url, { method, body, headers, attempt: attempt + 1 });
    }

    logger.error({ message: 'Service call failed after all retries', url, error: err.message });
    throw new ServiceUnavailableError('Prompt builder unavailable');
  }
};

module.exports = callService;
