'use strict';

const { GetCommand, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAMES } = require('../config/db');
const { NotFoundError, DatabaseError } = require('../errors/AppError');
const logger = require('../utils/logger');

const MAIN_TEMPLATES_TABLE = TABLE_NAMES.MAIN_TEMPLATES;
const OBJECT_TEMPLATES_TABLE = TABLE_NAMES.OBJECT_TEMPLATES;
const DEFAULT_LIMIT = 20;
const DEFAULT_OBJECT_LIMIT = 50;

/**
 * Fetches a single main template by ID (returns full item including promptText).
 * @param {string} templateId
 * @returns {Promise<Object>} Full DynamoDB item
 */
const getMainTemplateById = async (templateId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: MAIN_TEMPLATES_TABLE,
      Key: { templateId },
    }));
    if (!result.Item) {
      throw new NotFoundError(`Template ${templateId} was not found`);
    }
    return result.Item;
  } catch (err) {
    if (err.isOperational) throw err;
    logger.error({ message: 'DynamoDB GetItem failed', error: err.message, templateId });
    throw new DatabaseError('Failed to fetch main template');
  }
};

/**
 * Lists main templates, optionally filtered by category, with pagination.
 * Strips promptText and styleModifiers before returning.
 * @param {Object} opts
 * @param {string} [opts.category]
 * @param {number} [opts.limit]
 * @param {Object} [opts.lastKey]
 * @returns {Promise<{items: Object[], count: number, lastKey: Object|null}>}
 */
const listMainTemplates = async ({ category, limit = DEFAULT_LIMIT, lastKey } = {}) => {
  try {
    let result;
    if (category) {
      result = await docClient.send(new QueryCommand({
        TableName: MAIN_TEMPLATES_TABLE,
        IndexName: 'categoryIndex',
        KeyConditionExpression: 'category = :cat',
        ExpressionAttributeValues: { ':cat': category },
        Limit: limit,
        ExclusiveStartKey: lastKey || undefined,
      }));
    } else {
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      result = await docClient.send(new ScanCommand({
        TableName: MAIN_TEMPLATES_TABLE,
        Limit: limit,
        ExclusiveStartKey: lastKey || undefined,
      }));
    }

    const items = (result.Items || []).map((item) => {
      const { promptText, styleModifiers, ...safe } = item;
      return safe;
    });

    return {
      items,
      count: items.length,
      lastKey: result.LastEvaluatedKey || null,
    };
  } catch (err) {
    if (err.isOperational) throw err;
    logger.error({ message: 'DynamoDB scan/query failed', error: err.message });
    throw new DatabaseError('Failed to list main templates');
  }
};

/**
 * Gets a single main template for client (strips promptText and styleModifiers).
 * @param {string} templateId
 * @returns {Promise<Object>}
 */
const getMainTemplateForClient = async (templateId) => {
  const item = await getMainTemplateById(templateId);
  const { promptText, styleModifiers, ...safe } = item;
  return safe;
};

/**
 * Lists object templates, optionally filtered by primaryTag.
 * Strips promptText and promptWeight before returning.
 * @param {Object} opts
 * @param {string} [opts.primaryTag]
 * @param {number} [opts.limit]
 * @param {Object} [opts.lastKey]
 * @returns {Promise<{items: Object[], count: number, lastKey: Object|null}>}
 */
const listObjectTemplates = async ({ primaryTag, limit = DEFAULT_OBJECT_LIMIT, lastKey } = {}) => {
  try {
    let result;
    if (primaryTag) {
      result = await docClient.send(new QueryCommand({
        TableName: OBJECT_TEMPLATES_TABLE,
        IndexName: 'tagIndex',
        KeyConditionExpression: 'primaryTag = :tag',
        ExpressionAttributeValues: { ':tag': primaryTag },
        Limit: limit,
        ExclusiveStartKey: lastKey || undefined,
      }));
    } else {
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      result = await docClient.send(new ScanCommand({
        TableName: OBJECT_TEMPLATES_TABLE,
        Limit: limit,
        ExclusiveStartKey: lastKey || undefined,
      }));
    }

    const items = (result.Items || []).map((item) => {
      const { promptText, promptWeight, ...safe } = item;
      return safe;
    });

    return {
      items,
      count: items.length,
      lastKey: result.LastEvaluatedKey || null,
    };
  } catch (err) {
    if (err.isOperational) throw err;
    logger.error({ message: 'DynamoDB scan/query failed for objects', error: err.message });
    throw new DatabaseError('Failed to list object templates');
  }
};

/**
 * Batch fetches object templates by IDs (full items including promptText and promptWeight).
 * @param {string[]} objectIds
 * @returns {Promise<Object[]>}
 */
const batchGetObjectTemplates = async (objectIds) => {
  if (!objectIds || objectIds.length === 0) return [];

  try {
    const keys = objectIds.map((id) => ({ objectId: id }));
    const result = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [OBJECT_TEMPLATES_TABLE]: { Keys: keys },
      },
    }));

    const found = result.Responses?.[OBJECT_TEMPLATES_TABLE] || [];
    const foundIds = new Set(found.map((item) => item.objectId));

    objectIds.forEach((id) => {
      if (!foundIds.has(id)) {
        logger.warn({ message: 'Object template not found, skipping', objectId: id });
      }
    });

    return found;
  } catch (err) {
    if (err.isOperational) throw err;
    logger.error({ message: 'DynamoDB BatchGet failed', error: err.message });
    throw new DatabaseError('Failed to batch fetch object templates');
  }
};

module.exports = {
  getMainTemplateById,
  listMainTemplates,
  getMainTemplateForClient,
  listObjectTemplates,
  batchGetObjectTemplates,
};
