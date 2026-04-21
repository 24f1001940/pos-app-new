const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const financeRoutes = require('./routes/finance.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const customerRoutes = require('./routes/customer.routes');
const productRoutes = require('./routes/product.routes');
const posDraftRoutes = require('./routes/pos-draft.routes');
const notificationRoutes = require('./routes/notification.routes');
const saleRoutes = require('./routes/sale.routes');
const settingsRoutes = require('./routes/settings.routes');
const uploadRoutes = require('./routes/upload.routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { applyRateLimit, sanitizeRequest } = require('./middlewares/security.middleware');
const logger = require('./config/logger');

const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

const app = express();

app.use(
  cors({
    origin:
      env.nodeEnv === 'production'
        ? [env.clientUrl]
        : [env.clientUrl, localDevOriginPattern],
    credentials: true,
  }),
);
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(applyRateLimit);
app.use(sanitizeRequest);
app.use(
  morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: env.appName,
    env: env.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mujahid Electronic Goods API is running',
    health: '/api/health',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/pos-drafts', posDraftRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
