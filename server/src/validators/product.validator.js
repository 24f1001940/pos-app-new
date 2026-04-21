const { body } = require('express-validator');

const productValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().trim(),
  body('variants').optional().isArray().withMessage('Variants must be an array'),
  body('variants.*.name').optional().isString().trim(),
  body('variants.*.sku').optional().isString().trim(),
  body('variants.*.barcode').optional().isString().trim(),
  body('variants.*.stock').optional().isFloat({ min: 0 }),
  body('variants.*.cp').optional().isFloat({ min: 0 }),
  body('variants.*.sp').optional().isFloat({ min: 0 }),
  body('supplier.name').optional().isString().trim(),
  body('supplier.email').optional().isEmail(),
  body('supplier.phone').optional().isString().trim(),
  body('supplier.referenceCode').optional().isString().trim(),
  body('warrantyMonths').optional().isInt({ min: 0 }),
  body('expiryDate').optional().isISO8601(),
  body('stock').isFloat({ min: 0 }).withMessage('Stock must be 0 or more'),
  body('lowStockLimit')
    .isFloat({ min: 0 })
    .withMessage('Low stock limit must be 0 or more'),
  body('cp').isFloat({ min: 0 }).withMessage('Cost price must be 0 or more'),
  body('sp').isFloat({ min: 0 }).withMessage('Selling price must be 0 or more'),
  body('sku').optional().trim(),
  body('barcode').optional().trim(),
  body('image.url').optional().trim(),
  body('image.publicId').optional().trim(),
];

module.exports = {
  productValidator,
};
