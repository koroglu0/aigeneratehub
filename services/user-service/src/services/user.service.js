'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAMES } = require('../config/db');
const { ConflictError, NotFoundError, UnauthorizedError, DatabaseError } = require('../errors/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');

const TABLE = TABLE_NAMES.USERS;

/**
 * Registers a new user.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.displayName
 * @returns {Promise<{userId: string, email: string, displayName: string}>}
 */
const register = async ({ email, password, displayName }) => {
  // Check email uniqueness
  try {
    const existing = await docClient.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'emailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }));
    if (existing.Items && existing.Items.length > 0) {
      throw new ConflictError('Email already registered');
    }
  } catch (err) {
    if (err.isOperational) throw err;
    logger.error({ message: 'Failed to check email uniqueness', error: err.message });
    throw new DatabaseError('Failed to check email uniqueness');
  }

  const userId = `user_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS || 12);
  const now = new Date().toISOString();

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        userId,
        email,
        passwordHash,
        displayName,
        role: 'user',
        generationCount: 0,
        dailyLimit: 10,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    }));
  } catch (err) {
    logger.error({ message: 'Failed to create user', error: err.message });
    throw new DatabaseError('Failed to create user');
  }

  return { userId, email, displayName };
};

/**
 * Authenticates a user and returns a JWT token.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, userId: string, expiresIn: number}>}
 */
const login = async (email, password) => {
  let user;
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'emailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }));
    user = result.Items?.[0];
  } catch (err) {
    logger.error({ message: 'Login query failed', error: err.message });
    throw new DatabaseError('Login failed');
  }

  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const jwt = require('jsonwebtoken');
  const expiresIn = 86400; // 24h
  const token = jwt.sign(
    { userId: user.userId, role: user.role },
    env.JWT_SECRET,
    { expiresIn },
  );

  return { token, userId: user.userId, expiresIn };
};

/**
 * Returns the current user's profile without passwordHash.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getMe = async (userId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { userId },
    }));
    if (!result.Item) throw new NotFoundError('User not found');

    const { passwordHash, ...safe } = result.Item;
    return safe;
  } catch (err) {
    if (err.isOperational) throw err;
    throw new DatabaseError('Failed to fetch user');
  }
};

module.exports = { register, login, getMe };
