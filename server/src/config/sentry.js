const env = require('./env');
const logger = require('./logger');

let sentry = null;
let sentryEnabled = false;

function getSentry() {
  if (sentry) {
    return sentry;
  }

  if (!env.sentryDsn) {
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    sentry = require('@sentry/node');
  } catch (error) {
    logger.warn(`Sentry SDK not available: ${error.message}`);
    return null;
  }

  return sentry;
}

function initSentry() {
  const Sentry = getSentry();
  if (!Sentry) {
    return false;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment || env.nodeEnv,
    tracesSampleRate: env.traceEnabled ? 0.1 : 0,
  });

  sentryEnabled = true;
  return true;
}

function sentryRequestHandler() {
  const Sentry = getSentry();
  if (!Sentry || !sentryEnabled) {
    return null;
  }

  return (req, res, next) => {
    req.sentryTraceId = Sentry.getCurrentHub().getScope()?.getSpan()?.traceId || null;
    next();
  };
}

function captureException(error) {
  const Sentry = getSentry();
  if (!Sentry || !sentryEnabled) {
    return;
  }

  Sentry.captureException(error);
}

module.exports = {
  initSentry,
  sentryRequestHandler,
  captureException,
};
