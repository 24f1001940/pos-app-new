const express = require('express');

const {
  getNotifications,
  readNotification,
  readAllNotifications,
  sendDailySummary,
} = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);
router.post('/daily-summary', authorize(ROLES.ADMIN, ROLES.MANAGER), sendDailySummary);

module.exports = router;
