const dotenv = require('dotenv');

dotenv.config();

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
}

function requireInProduction(name, value) {
  if (process.env.NODE_ENV === 'production' && !String(value || '').trim()) {
    throw new Error(`${name} is required in production`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Mujahid Electronic Goods API',
  port: parseNumber(process.env.PORT, 5000),
  mongoUri:
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/mujahid-electronic-goods',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'PKR',
  defaultTaxRate: parseNumber(process.env.DEFAULT_TAX_RATE, 18),
  jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-key',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  authLockMaxAttempts: parseNumber(process.env.AUTH_LOCK_MAX_ATTEMPTS, 5),
  authLockMinutes: parseNumber(process.env.AUTH_LOCK_MINUTES, 30),
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseNumber(process.env.SMTP_PORT, 587),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'no-reply@mujahidelectronicgoods.local',
  enableDailySummaryScheduler: parseBoolean(process.env.ENABLE_DAILY_SUMMARY_SCHEDULER, false),
  dailySummaryHour: parseNumber(process.env.DAILY_SUMMARY_HOUR, 20),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  sentryDsn: process.env.SENTRY_DSN || '',
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  traceEnabled: parseBoolean(process.env.TRACE_ENABLED, false),
};

requireInProduction('JWT_SECRET', env.jwtSecret);
requireInProduction('JWT_REFRESH_SECRET', env.jwtRefreshSecret);
requireInProduction('MONGO_URI', env.mongoUri);
requireInProduction('CLIENT_URL', env.clientUrl);
if (env.defaultTaxRate < 0 || env.defaultTaxRate > 100) {
  throw new Error('DEFAULT_TAX_RATE must be between 0 and 100');
}

module.exports = env;
