const { body } = require('express-validator');

const posDraftValidator = [
  body('title').optional().trim(),
  body('items').isArray().withMessage('Items are required'),
  body('customerName').optional().trim(),
  body('customerPhone').optional().trim(),
  body('paymentMethod').optional().trim(),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('discountType').optional().isIn(['none', 'flat', 'percent']),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
];

module.exports = {
  posDraftValidator,
};
