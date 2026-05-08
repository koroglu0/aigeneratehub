'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const env = require('./config/env');
const routes = require('./routes/user.routes');
const errorHandler = require('./errors/errorHandler');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

const allowedOrigins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((o) => o.trim()) : [];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 300,
}));

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use('/api/v1', routes);
app.use(errorHandler);

module.exports = app;
