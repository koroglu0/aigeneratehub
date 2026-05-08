'use strict';

const { ValidationError } = require('../errors/AppError');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new ValidationError(error.details.map((d) => d.message).join('; ')));
  }
  req.body = value;
  return next();
};

module.exports = validate;
