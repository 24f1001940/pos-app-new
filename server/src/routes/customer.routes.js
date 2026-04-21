const express = require('express');

const {
  listCustomers,
  createCustomer,
  updateCustomer,
  getCustomer,
  getCustomerSales,
} = require('../controllers/customer.controller');
const { protect, requirePermission } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { PERMISSIONS } = require('../constants/roles');
const { customerValidator } = require('../validators/customer.validator');

const router = express.Router();

router.use(protect);

router.get('/', requirePermission(PERMISSIONS.INVENTORY_READ), listCustomers);
router.post('/', requirePermission(PERMISSIONS.PRODUCTS_WRITE), customerValidator, handleValidation, createCustomer);
router.get('/:id', requirePermission(PERMISSIONS.INVENTORY_READ), getCustomer);
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_WRITE), customerValidator, handleValidation, updateCustomer);
router.get('/:id/sales', requirePermission(PERMISSIONS.INVENTORY_READ), getCustomerSales);

module.exports = router;
