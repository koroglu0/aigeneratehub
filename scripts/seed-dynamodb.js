'use strict';

const { DynamoDBClient, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { createTables } = require('./create-tables');

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

const now = '2025-01-01T00:00:00.000Z';

const mainTemplates = [
  {
    templateId: 'main_victory_day',
    displayName: 'Victory Day',
    category: 'national_holidays',
    displayOrder: 1,
    promptText: 'A majestic national victory celebration, golden sunlight over a grand plaza, triumphant crowds, national flags waving against a deep blue sky, cinematic composition, ultra-realistic 8K photography, warm golden-hour lighting, epic wide-angle perspective',
    styleModifiers: ['cinematic', 'ultra-realistic', '8K'],
    aspectRatio: '1:1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    templateId: 'main_birthday',
    displayName: 'Birthday',
    category: 'celebrations',
    displayOrder: 1,
    promptText: 'A joyful birthday celebration scene, colorful balloons and confetti in soft bokeh, warm candlelight, pastel color palette, dreamy and festive atmosphere, professional portrait photography style, shallow depth of field',
    styleModifiers: ['dreamy', 'soft-bokeh'],
    aspectRatio: '1:1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    templateId: 'main_eid',
    displayName: 'Eid Mubarak',
    category: 'religious',
    displayOrder: 1,
    promptText: 'A serene and festive Eid celebration, crescent moon and star motifs, warm lantern light, intricate geometric Islamic art patterns in background, golden and emerald color palette, cinematic composition, ultra-realistic render',
    styleModifiers: ['cinematic', 'ultra-realistic'],
    aspectRatio: '1:1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    templateId: 'main_new_year',
    displayName: 'New Year',
    category: 'celebrations',
    displayOrder: 2,
    promptText: 'Spectacular New Year fireworks over a city skyline at midnight, reflections in water, vibrant colors of gold silver and blue, long exposure photography effect, ultra-realistic 8K, wide cinematic shot',
    styleModifiers: ['long-exposure', '8K'],
    aspectRatio: '1:1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    templateId: 'main_nature_peace',
    displayName: 'Nature & Peace',
    category: 'themes',
    displayOrder: 1,
    promptText: 'A tranquil natural landscape, soft morning mist over green rolling hills, golden sunrise light filtering through ancient trees, crystal clear stream, photorealistic nature photography, National Geographic style, serene and peaceful atmosphere',
    styleModifiers: ['photorealistic', 'National Geographic style'],
    aspectRatio: '1:1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const objectTemplates = [
  {
    objectId: 'obj_bird',
    displayName: 'Bird',
    primaryTag: 'nature',
    displayOrder: 1,
    promptText: 'a graceful white dove in mid-flight with wings fully spread, delicate feather detail visible, golden hour backlighting creating a halo effect',
    promptWeight: 0.25,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    objectId: 'obj_star',
    displayName: 'Star',
    primaryTag: 'symbols',
    displayOrder: 1,
    promptText: 'a radiant five-pointed star with soft golden glow and subtle light rays emanating outward, elegant and symbolic',
    promptWeight: 0.20,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    objectId: 'obj_flag',
    displayName: 'Flag',
    primaryTag: 'national',
    displayOrder: 1,
    promptText: 'a proud national flag waving gracefully in a gentle breeze, fabric texture detailed, dramatic lighting from behind',
    promptWeight: 0.30,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    objectId: 'obj_mosque',
    displayName: 'Mosque',
    primaryTag: 'architecture',
    displayOrder: 1,
    promptText: 'an elegant mosque silhouette with tall minarets against a twilight sky, intricate architectural details, warm internal lighting visible through ornate windows',
    promptWeight: 0.35,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    objectId: 'obj_candle',
    displayName: 'Candle',
    primaryTag: 'celebration',
    displayOrder: 1,
    promptText: 'a single elegant white candle with a warm steady flame, soft wax drips, dark background with intimate bokeh glow',
    promptWeight: 0.20,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    objectId: 'obj_balloon',
    displayName: 'Balloon',
    primaryTag: 'celebration',
    displayOrder: 2,
    promptText: 'clusters of colorful helium balloons tied with golden ribbon, floating upward, soft studio lighting, vibrant and cheerful',
    promptWeight: 0.20,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const batchWrite = async (tableName, items) => {
  const requests = items.map((item) => ({
    PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
  }));

  // DynamoDB batch write supports max 25 items per call
  for (let i = 0; i < requests.length; i += 25) {
    const batch = requests.slice(i, i + 25);
    await client.send(new BatchWriteItemCommand({
      RequestItems: { [tableName]: batch },
    }));
  }

  console.log(`Inserted ${items.length} items into ${tableName}`);
};

const seed = async () => {
  console.log('Creating tables...');
  await createTables();

  console.log('Seeding MainTemplates...');
  await batchWrite('MainTemplates', mainTemplates);

  console.log('Seeding ObjectTemplates...');
  await batchWrite('ObjectTemplates', objectTemplates);

  console.log('Seeding complete.');
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  });
