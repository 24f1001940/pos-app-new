const express = require('express');

const {
  createExpense,
  createPurchaseOrderController,
  createSupplier,
  getExpenses,
  getPayablesAgingController,
  getPurchaseOrders,
  getSummary,
  getSuppliers,
  updatePurchaseOrderStatusController,
  updateSupplier,
} = require('../controllers/finance.controller');
const { PERMISSIONS } = require('../constants/roles');
const { protect, requirePermission } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const {
  expenseValidator,
  purchaseOrderStatusValidator,
  purchaseOrderValidator,
  supplierValidator,
} = require('../validators/finance.validator');

const router = express.Router();

router.use(protect);

router.get('/summary', requirePermission(PERMISSIONS.ANALYTICS_READ), getSummary);

router.get('/suppliers', requirePermission(PERMISSIONS.FINANCE_READ), getSuppliers);
router.post(
  '/suppliers',
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  supplierValidator,
  handleValidation,
  createSupplier,
);
router.put(
  '/suppliers/:id',
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  supplierValidator,
  handleValidation,
  updateSupplier,
);

router.get('/expenses', requirePermission(PERMISSIONS.FINANCE_READ), getExpenses);
router.post(
  '/expenses',
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  expenseValidator,
  handleValidation,
  createExpense,
);

router.get('/purchase-orders', requirePermission(PERMISSIONS.FINANCE_READ), getPurchaseOrders);
router.get('/payables-aging', requirePermission(PERMISSIONS.FINANCE_READ), getPayablesAgingController);
router.post(
  '/purchase-orders',
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  purchaseOrderValidator,
  handleValidation,
  createPurchaseOrderController,
);
router.patch(
  '/purchase-orders/:id/status',
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  purchaseOrderStatusValidator,
  handleValidation,
  updatePurchaseOrderStatusController,
);

module.exports = router;
