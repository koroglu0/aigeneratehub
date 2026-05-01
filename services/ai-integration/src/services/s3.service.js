'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

const s3 = new S3Client({ region: env.AWS_REGION });

const uploadImageBuffer = async (buffer, contentType = 'image/png') => {
  const ext = contentType.split('/')[1] || 'png';
  const key = `generated/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

module.exports = { uploadImageBuffer };
