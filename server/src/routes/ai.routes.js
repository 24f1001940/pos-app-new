const express = require('express');

const { getAiInsightsController } = require('../controllers/ai.controller');
const { PERMISSIONS } = require('../constants/roles');
const { protect, requirePermission } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/insights', requirePermission(PERMISSIONS.ANALYTICS_READ), getAiInsightsController);

module.exports = router;
