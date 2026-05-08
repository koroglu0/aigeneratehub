'use strict';

const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { register, login, getMe } = require('../services/user.service');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

/**
 * GET /api/v1/health
 */
const health = asyncHandler(async (req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

/**
 * POST /api/v1/users/register
 */
const registerHandler = asyncHandler(async (req, res) => {
  const result = await register(req.body);
  res.status(201).json({ success: true, data: result });
});

/**
 * POST /api/v1/users/login
 */
const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  res.json({ success: true, data: result });
});

/**
 * GET /api/v1/users/me
 */
const meHandler = asyncHandler(async (req, res) => {
  const user = await getMe(req.user.userId);
  res.json({ success: true, data: user });
});

module.exports = {
  health,
  registerHandler,
  loginHandler,
  meHandler,
  registerSchema,
  loginSchema,
};
