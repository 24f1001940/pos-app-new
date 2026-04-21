const { body } = require('express-validator');

const settingsValidator = [
  body('shopName').trim().notEmpty().withMessage('Shop name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('contactPhone').trim().notEmpty().withMessage('Contact phone is required'),
  body('contactEmail').trim().isEmail().withMessage('Valid email is required'),
  body('taxRate').isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be 0-100'),
  body('currency').trim().notEmpty().withMessage('Currency is required'),
  body('darkMode').isBoolean().withMessage('Dark mode must be boolean'),
  body('enableLowStockPopup').isBoolean(),
  body('enableEmailAlerts').isBoolean(),
  body('lowStockEmail').optional({ values: 'falsy' }).trim().isEmail(),
  body('receiptFooter').optional().trim(),
];

module.exports = {
  settingsValidator,
};
