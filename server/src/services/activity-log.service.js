const ActivityLog = require('../models/activity-log.model');

async function logActivity({
  user = null,
  eventType,
  category = 'auth',
  status = 'success',
  message,
  metadata = {},
  req,
}) {
  try {
    await ActivityLog.create({
      user: user?._id || user || null,
      eventType,
      category,
      status,
      message,
      metadata,
      ipAddress: req?.ip || '',
      userAgent: req?.get('user-agent') || '',
    });
  } catch (error) {
    // Logging must not block the main request path.
  }
}

async function listActivityLogs({ userId = null, limit = 50 } = {}) {
  const query = userId ? { user: userId } : {};
  return ActivityLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email role');
}

module.exports = {
  logActivity,
  listActivityLogs,
};
