const express = require('express');

const {
  getSettings,
  updateSettings,
  backupData,
  restoreData,
  resetSystem,
} = require('../controllers/settings.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { settingsValidator } = require('../validators/settings.validator');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', authorize(ROLES.ADMIN), settingsValidator, handleValidation, updateSettings);
router.get('/backup', authorize(ROLES.ADMIN), backupData);
router.post('/restore', authorize(ROLES.ADMIN), restoreData);
router.post('/reset', authorize(ROLES.ADMIN), resetSystem);

module.exports = router;
