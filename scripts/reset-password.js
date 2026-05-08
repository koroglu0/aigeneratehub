'use strict';

const { DynamoDBClient, QueryCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const bcrypt = require('bcryptjs');

const EMAIL    = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error('Usage: node reset-password.js <email> <newPassword>');
  process.exit(1);
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function run() {
  // Find user by email via GSI
  const query = await client.send(new QueryCommand({
    TableName: 'Users',
    IndexName: 'emailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: marshall({ ':email': EMAIL }),
    Limit: 1,
  }));

  if (!query.Items || query.Items.length === 0) {
    console.error(`No user found with email: ${EMAIL}`);
    process.exit(1);
  }

  const user = unmarshall(query.Items[0]);
  console.log(`Found user: ${user.userId} (${user.displayName})`);

  const newHash = await bcrypt.hash(PASSWORD, 12);

  await client.send(new UpdateItemCommand({
    TableName: 'Users',
    Key: marshall({ userId: user.userId }),
    UpdateExpression: 'SET passwordHash = :hash, updatedAt = :now',
    ExpressionAttributeValues: marshall({
      ':hash': newHash,
      ':now':  new Date().toISOString(),
    }),
  }));

  console.log('Password updated successfully.');
}

run().catch(err => { console.error(err); process.exit(1); });
