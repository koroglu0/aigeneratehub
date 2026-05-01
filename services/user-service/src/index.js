'use strict';

const env = require('./config/env');
const logger = require('./utils/logger');
const app = require('./app');

const PORT = env.PORT || 3003;

const server = app.listen(PORT, () => {
  logger.info({ message: `user-service listening on port ${PORT}`, port: PORT });
});

process.on('SIGTERM', () => {
  logger.info({ message: 'SIGTERM received, shutting down gracefully' });
  server.close(() => {
    logger.info({ message: 'Server closed' });
    process.exit(0);
  });
});
