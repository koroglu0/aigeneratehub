'use strict';

const { DynamoDBClient, CreateTableCommand, UpdateTimeToLiveCommand, ResourceInUseException } = require('@aws-sdk/client-dynamodb');

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const clientConfig = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
};
if (DYNAMODB_ENDPOINT) clientConfig.endpoint = DYNAMODB_ENDPOINT;

const client = new DynamoDBClient(clientConfig);

const tables = [
  {
    TableName: 'MainTemplates',
    KeySchema: [{ AttributeName: 'templateId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'templateId', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'displayOrder', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'categoryIndex',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'displayOrder', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'ObjectTemplates',
    KeySchema: [{ AttributeName: 'objectId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'objectId', AttributeType: 'S' },
      { AttributeName: 'primaryTag', AttributeType: 'S' },
      { AttributeName: 'displayOrder', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'tagIndex',
        KeySchema: [
          { AttributeName: 'primaryTag', KeyType: 'HASH' },
          { AttributeName: 'displayOrder', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'GenerationRequests',
    KeySchema: [{ AttributeName: 'requestId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'requestId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userIndex',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'Users',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'emailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

const createTables = async () => {
  for (const tableParams of tables) {
    try {
      await client.send(new CreateTableCommand(tableParams));
      console.log(`Created table: ${tableParams.TableName}`);
    } catch (err) {
      if (err.name === 'ResourceInUseException' || err.__type === 'com.amazonaws.dynamodb.v20120810#ResourceInUseException') {
        console.log(`Table ${tableParams.TableName} already exists`);
      } else {
        console.error(`Failed to create table ${tableParams.TableName}:`, err.message);
        throw err;
      }
    }
  }

  // Enable TTL on GenerationRequests
  try {
    await client.send(new UpdateTimeToLiveCommand({
      TableName: 'GenerationRequests',
      TimeToLiveSpecification: {
        AttributeName: 'expiresAt',
        Enabled: true,
      },
    }));
    console.log('TTL enabled on GenerationRequests.expiresAt');
  } catch (err) {
    console.log('TTL note:', err.message);
  }
};

module.exports = { createTables };

if (require.main === module) {
  createTables()
    .then(() => {
      console.log('All tables created successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Table creation failed:', err.message);
      process.exit(1);
    });
}
