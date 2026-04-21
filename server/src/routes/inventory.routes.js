const express = require('express');

const {
  getWarehouses,
  createWarehouseController,
  createStockTransfer,
  getSummary,
  getProductMovements,
} = require('../controllers/inventory.controller');
const { protect, requirePermission } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { PERMISSIONS } = require('../constants/roles');
const { warehouseValidator, stockTransferValidator } = require('../validators/inventory.validator');

const router = express.Router();

router.use(protect);

router.get('/summary', requirePermission(PERMISSIONS.INVENTORY_READ), getSummary);
router.get('/warehouses', requirePermission(PERMISSIONS.INVENTORY_READ), getWarehouses);
router.post(
  '/warehouses',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  warehouseValidator,
  handleValidation,
  createWarehouseController,
);
router.post(
  '/transfers',
  requirePermission(PERMISSIONS.INVENTORY_TRANSFER),
  stockTransferValidator,
  handleValidation,
  createStockTransfer,
);
router.get('/products/:productId/movements', requirePermission(PERMISSIONS.INVENTORY_READ), getProductMovements);

module.exports = router;
