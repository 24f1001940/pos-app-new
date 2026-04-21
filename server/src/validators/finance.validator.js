const { body } = require('express-validator');

const supplierValidator = [
  body('name').isString().trim().notEmpty().withMessage('Supplier name is required'),
  body('email').optional().isEmail().withMessage('Supplier email must be valid'),
  body('phone').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('paymentTermsDays').optional().isInt({ min: 0 }),
  body('openingBalance').optional().isFloat(),
  body('notes').optional().isString(),
  body('active').optional().isBoolean(),
];

const expenseValidator = [
  body('title').isString().trim().notEmpty().withMessage('Expense title is required'),
  body('category').isString().trim().notEmpty().withMessage('Expense category is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Expense amount must be 0 or more'),
  body('paymentMethod').optional().isString().trim(),
  body('paidTo').optional().isString().trim(),
  body('notes').optional().isString(),
  body('expenseDate').optional().isISO8601(),
];

const purchaseOrderValidator = [
  body('supplierId').isString().notEmpty().withMessage('Supplier is required'),
  body('warehouseId').isString().notEmpty().withMessage('Warehouse is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isString().notEmpty().withMessage('Product id is required'),
  body('items.*.quantity').isFloat({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be 0 or more'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('amountPaid').optional().isFloat({ min: 0 }),
  body('expectedDate').optional().isISO8601(),
  body('notes').optional().isString(),
  body('status').optional().isIn(['draft', 'ordered']),
];

const purchaseOrderStatusValidator = [
  body('status').isIn(['ordered', 'received', 'cancelled']),
];

module.exports = {
  supplierValidator,
  expenseValidator,
  purchaseOrderValidator,
  purchaseOrderStatusValidator,
};
