const dayjs = require('dayjs');

const Notification = require('../models/notification.model');
const Sale = require('../models/sale.model');
const Settings = require('../models/settings.model');
const { emitToAll, emitToUser } = require('./realtime.service');
const { sendEmail } = require('./email.service');

async function createNotification(payload) {
  const notification = await Notification.create(payload);

  if (notification.recipient) {
    emitToUser(String(notification.recipient), 'notification:new', notification.toJSON());
  } else {
    emitToAll('notification:new', notification.toJSON());
  }

  return notification;
}

async function listNotifications({ userId, unreadOnly = false, limit = 50 }) {
  const query = {
    $or: [{ recipient: null }, { recipient: userId }],
  };

  if (unreadOnly) {
    query.read = false;
  }

  return Notification.find(query).sort({ createdAt: -1 }).limit(limit);
}

async function markNotificationRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      $or: [{ recipient: null }, { recipient: userId }],
    },
    { read: true },
    { returnDocument: 'after' },
  );
}

async function markAllNotificationsRead(userId) {
  return Notification.updateMany(
    {
      $or: [{ recipient: null }, { recipient: userId }],
      read: false,
    },
    { read: true },
  );
}

async function sendLowStockEmailAlert(product, stock, settings) {
  if (!settings?.enableEmailAlerts || !settings?.lowStockEmail) {
    return;
  }

  await sendEmail({
    to: settings.lowStockEmail,
    subject: `Low stock alert: ${product.name}`,
    text: `${product.name} is low on stock (${stock}). Reorder soon.`,
    html: `<p><strong>${product.name}</strong> is low on stock (<strong>${stock}</strong>). Reorder soon.</p>`,
  });
}

async function createLowStockAlert({ product, stock, warehouseName }) {
  const settings = await Settings.findOne({ shopCode: 'default' }).lean();

  const notification = await createNotification({
    type: 'low-stock',
    level: stock <= 0 ? 'danger' : 'warning',
    title: stock <= 0 ? 'Out of stock product' : 'Low stock warning',
    message: `${product.name} has ${stock} unit(s) left${warehouseName ? ` in ${warehouseName}` : ''}.`,
    metadata: {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      barcode: product.barcode,
      warehouseName,
      stock,
      lowStockLimit: product.lowStockLimit,
    },
  });

  await sendLowStockEmailAlert(product, stock, settings);
  return notification;
}

async function createSystemAlert(error, req) {
  return createNotification({
    type: 'system-alert',
    level: 'danger',
    title: 'System failure captured',
    message: error.message || 'Unexpected server error',
    metadata: {
      path: req?.originalUrl || '',
      method: req?.method || '',
      stack: error?.stack || '',
    },
  });
}

async function createDailySalesSummaryNotification() {
  const start = dayjs().startOf('day').toDate();
  const end = dayjs().endOf('day').toDate();

  const sales = await Sale.find({ date: { $gte: start, $lte: end } }).lean();
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalProfit = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);

  const settings = await Settings.findOne({ shopCode: 'default' }).lean();

  const notification = await createNotification({
    type: 'daily-summary',
    level: 'info',
    title: 'Daily sales summary',
    message: `${sales.length} order(s) processed today with revenue ${totalRevenue.toFixed(2)}.`,
    metadata: {
      date: dayjs().format('YYYY-MM-DD'),
      orders: sales.length,
      revenue: Number(totalRevenue.toFixed(2)),
      profit: Number(totalProfit.toFixed(2)),
    },
  });

  if (settings?.enableEmailAlerts && settings?.lowStockEmail) {
    await sendEmail({
      to: settings.lowStockEmail,
      subject: `Daily Sales Summary - ${dayjs().format('DD MMM YYYY')}`,
      text: `Orders: ${sales.length}\nRevenue: ${totalRevenue.toFixed(2)}\nProfit: ${totalProfit.toFixed(2)}`,
      html: `<p><strong>Orders:</strong> ${sales.length}</p><p><strong>Revenue:</strong> ${totalRevenue.toFixed(2)}</p><p><strong>Profit:</strong> ${totalProfit.toFixed(2)}</p>`,
    });
  }

  return notification;
}

module.exports = {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createLowStockAlert,
  createSystemAlert,
  createDailySalesSummaryNotification,
};
