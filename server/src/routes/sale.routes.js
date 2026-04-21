const express = require('express');

const {
  getSales,
  createSale,
  deleteSale,
  emailSaleInvoice,
} = require('../controllers/sale.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { saleValidator } = require('../validators/sale.validator');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getSales)
  .post(
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF),
    (req, res, next) => {
      req.validationErrorMessage = 'Invalid cart data';
      next();
    },
    saleValidator,
    handleValidation,
    createSale,
  );

router.delete('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), deleteSale);
router.post('/:id/email', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF), emailSaleInvoice);

module.exports = router;
