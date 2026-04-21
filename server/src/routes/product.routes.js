const express = require('express');

const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductHistory,
} = require('../controllers/product.controller');
const { protect, requirePermission } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { PERMISSIONS } = require('../constants/roles');
const { productValidator } = require('../validators/product.validator');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(requirePermission(PERMISSIONS.PRODUCTS_READ), getProducts)
  .post(requirePermission(PERMISSIONS.PRODUCTS_WRITE), productValidator, handleValidation, createProduct);

router
  .route('/:id')
  .put(requirePermission(PERMISSIONS.PRODUCTS_WRITE), productValidator, handleValidation, updateProduct)
  .delete(requirePermission(PERMISSIONS.PRODUCTS_DELETE), deleteProduct);

router.get('/:id/history', requirePermission(PERMISSIONS.PRODUCTS_READ), getProductHistory);

module.exports = router;
