const express = require('express');

const {
  getAnalyticsOverviewController,
  exportAnalyticsController,
} = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/overview', getAnalyticsOverviewController);
router.get('/export', exportAnalyticsController);

module.exports = router;
