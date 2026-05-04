'use strict';

const { PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAMES } = require('../config/db');
const { DatabaseError } = require('../errors/AppError');
const logger = require('../utils/logger');

const TABLE = TABLE_NAMES.GENERATION_REQUESTS;

/**
 * Checks if a request with the given idempotency key already exists.
 * @param {string} idempotencyKey
 * @returns {Promise<Object|null>} Existing record or null
 */
const checkIdempotency = async (idempotencyKey) => {
  try {
    const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
    // We need to scan with a filter since idempotencyKey is not a key
    // In production, add a GSI on idempotencyKey for efficiency
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'idempotencyKey = :ik',
      ExpressionAttributeValues: { ':ik': idempotencyKey },
      Limit: 1,
    }));
    return result.Items?.[0] || null;
  } catch (err) {
    logger.error({ message: 'Idempotency check failed', error: err.message });
    throw new DatabaseError('Failed to check idempotency');
  }
};

/**
 * Creates a new GenerationRequest record with status "pending".
 * @param {Object} params
 * @param {string} params.requestId
 * @param {string} params.idempotencyKey
 * @param {string} params.userId
 * @param {string} params.mainTemplateId
 * @param {string[]} params.objectTemplateIds
 * @returns {Promise<void>}
 */
const createRequest = async ({ requestId, idempotencyKey, userId, mainTemplateId, objectTemplateIds, model }) => {
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        requestId,
        idempotencyKey,
        userId,
        mainTemplateId,
        objectTemplateIds,
        finalPrompt: null,
        status: 'pending',
        imageUrl: null,
        errorMessage: null,
        aiModel: model || 'flux',
        aiRequestId: null,
        generationMs: null,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      },
    }));
  } catch (err) {
    logger.error({ message: 'Failed to create request record', error: err.message });
    throw new DatabaseError('Failed to create generation request');
  }
};

/**
 * Updates a GenerationRequest record's status.
 * @param {string} requestId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
const updateRequest = async (requestId, updates) => {
  const now = new Date().toISOString();
  const setExpressions = ['#updatedAt = :updatedAt'];
  const expressionNames = { '#updatedAt': 'updatedAt' };
  const expressionValues = { ':updatedAt': now };

  Object.entries(updates).forEach(([key, val]) => {
    setExpressions.push(`#${key} = :${key}`);
    expressionNames[`#${key}`] = key;
    expressionValues[`:${key}`] = val;
  });

  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { requestId },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    }));
  } catch (err) {
    logger.error({ message: 'Failed to update request record', error: err.message, requestId });
    throw new DatabaseError('Failed to update generation request');
  }
};

/**
 * Gets a GenerationRequest by requestId.
 * @param {string} requestId
 * @returns {Promise<Object|null>}
 */
const getRequest = async (requestId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { requestId },
    }));
    return result.Item || null;
  } catch (err) {
    logger.error({ message: 'Failed to get request', error: err.message, requestId });
    throw new DatabaseError('Failed to get generation request');
  }
};

/**
 * Gets all completed/failed GenerationRequests for a user, newest first.
 * @param {string} userId
 * @param {number} limit
 * @param {string|null} lastKey - base64-encoded ExclusiveStartKey for pagination
 * @returns {Promise<{items: Object[], lastKey: string|null}>}
 */
const getUserHistory = async (userId, limit = 20, lastKey = null) => {
  const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

  const params = {
    TableName: TABLE,
    IndexName: 'userIndex',
    KeyConditionExpression: 'userId = :uid',
    FilterExpression: '#status IN (:completed, :failed)',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':uid': userId,
      ':completed': 'completed',
      ':failed': 'failed',
    },
    ScanIndexForward: false, // newest first
    Limit: limit,
  };

  if (lastKey) {
    try {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString('utf8'));
    } catch (_) {
      // ignore invalid cursor
    }
  }

  try {
    const result = await docClient.send(new QueryCommand(params));
    const items = (result.Items || []).map(({ aiRequestId, idempotencyKey, finalPrompt, ...safe }) => safe);
    const nextKey = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;
    return { items, lastKey: nextKey };
  } catch (err) {
    logger.error({ message: 'Failed to get user history', error: err.message, userId });
    throw new DatabaseError('Failed to get generation history');
  }
};

module.exports = { checkIdempotency, createRequest, updateRequest, getRequest, getUserHistory };
