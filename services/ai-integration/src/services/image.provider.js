'use strict';

const env = require('../config/env');

if (env.AI_PROVIDER === 'huggingface') {
  module.exports = require('./huggingface.service');
} else if (env.AI_PROVIDER === 'pollinations') {
  module.exports = require('./pollinations.service');
} else {
  module.exports = require('./openai.service');
}
