const { body } = require('express-validator');

const saleValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Invalid cart data'),
  body('items').custom((items) => {
    if (!Array.isArray(items) || !items.length) {
      throw new Error('Invalid cart data');
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid cart data');
      }

      if (!String(item.productId || '').trim()) {
        throw new Error('Invalid cart data');
      }

      const quantity = Number(item.quantity ?? item.qty);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Invalid cart data');
      }

      if (item.price !== undefined && item.price !== null) {
        const price = Number(item.price);
        if (!Number.isFinite(price) || price < 0) {
          throw new Error('Invalid cart data');
        }
      }
    }

    return true;
  }),
  body('subtotal').optional().isFloat({ min: 0 }).withMessage('Invalid cart data'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Invalid cart data'),
  body('total').optional().isFloat({ min: 0 }).withMessage('Invalid cart data'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('paymentMethod').optional().trim(),
  body('customerName').optional().trim(),
  body('customerPhone').optional().trim(),
  body('customerEmail').optional({ checkFalsy: true }).isEmail(),
  body('customerId').optional({ checkFalsy: true }).isString().notEmpty(),
  body('salespersonId').optional({ checkFalsy: true }).isString().notEmpty(),
  body('discountType').optional().isIn(['none', 'flat', 'percent']),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('amountPaid').optional().isFloat({ min: 0 }),
  body('payments').optional().isArray(),
  body('payments.*.method').optional({ checkFalsy: true }).isString(),
  body('payments.*.amount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('payments.*.reference').optional({ checkFalsy: true }).isString(),
  body('notes').optional().trim(),
  body('warehouseId').optional({ checkFalsy: true }).isString().notEmpty(),
];

module.exports = {
  saleValidator,
};
