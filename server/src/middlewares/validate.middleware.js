const { validationResult } = require('express-validator');

const { createHttpError } = require('../utils/http');

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const message = req.validationErrorMessage || 'Validation failed';
  return next(createHttpError(422, message, result.array()));
}

module.exports = {
  handleValidation,
};
