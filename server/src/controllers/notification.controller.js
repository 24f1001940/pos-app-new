const asyncHandler = require('../utils/async-handler');
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createDailySalesSummaryNotification,
} = require('../services/notification.service');

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await listNotifications({
    userId: req.user._id,
    unreadOnly: req.query.unreadOnly === 'true',
    limit: Number(req.query.limit) || 50,
  });

  res.json({ notifications });
});

const readNotification = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.params.id, req.user._id);
  res.json({ notification });
});

const readAllNotifications = asyncHandler(async (req, res) => {
  await markAllNotificationsRead(req.user._id);
  res.json({ message: 'Notifications marked as read' });
});

const sendDailySummary = asyncHandler(async (req, res) => {
  const notification = await createDailySalesSummaryNotification();
  res.json({ notification });
});

module.exports = {
  getNotifications,
  readNotification,
  readAllNotifications,
  sendDailySummary,
};
