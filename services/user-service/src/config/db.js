'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const env = require('./env');

const clientConfig = { region: env.AWS_REGION };

if (env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = env.DYNAMODB_ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

const dynamoClient = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAMES = {
  USERS: 'Users',
};

module.exports = { docClient, TABLE_NAMES };
