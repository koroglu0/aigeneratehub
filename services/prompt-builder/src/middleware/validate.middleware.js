'use strict';

const { ValidationError } = require('../errors/AppError');

/**
 * Returns middleware that validates req.body against a Joi schema.
 * @param {import('joi').Schema} schema - Joi validation schema
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join('; ');
    return next(new ValidationError(message));
  }
  req.body = value;
  return next();
};

module.exports = validate;
