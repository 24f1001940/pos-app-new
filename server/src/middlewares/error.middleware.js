function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  // Lazy import keeps startup lightweight and avoids hard dependency during local dev.
  // eslint-disable-next-line global-require
  const { captureException } = require('../config/sentry');
  captureException(error);

  const statusCode = error.statusCode || res.statusCode || 500;
  const payload = {
    message: error.message || 'Internal server error',
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    payload.stack = error.stack;
  }

  if ((statusCode >= 500 || payload.message === 'Internal server error') && req?.originalUrl) {
    // Lazy import avoids circular dependency and keeps middleware lightweight.
    // eslint-disable-next-line global-require
    const { createSystemAlert } = require('../services/notification.service');
    createSystemAlert(error, req).catch(() => {});
  }

  res.status(statusCode >= 400 ? statusCode : 500).json(payload);
}

module.exports = {
  notFound,
  errorHandler,
};
