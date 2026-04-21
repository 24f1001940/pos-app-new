const { body } = require('express-validator');

const customerValidator = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('notes').optional().trim(),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString().trim(),
  body('active').optional().isBoolean(),
];

module.exports = {
  customerValidator,
};
