const { body } = require('express-validator');

const warehouseValidator = [
  body('name').trim().notEmpty().withMessage('Warehouse name is required'),
  body('address').optional().trim(),
  body('contactPhone').optional().trim(),
  body('isDefault').optional().isBoolean(),
  body('active').optional().isBoolean(),
];

const stockTransferValidator = [
  body('productId').isString().notEmpty().withMessage('Product id is required'),
  body('fromWarehouseId').isString().notEmpty().withMessage('Source warehouse is required'),
  body('toWarehouseId').isString().notEmpty().withMessage('Destination warehouse is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('notes').optional().trim(),
];

module.exports = {
  warehouseValidator,
  stockTransferValidator,
};
