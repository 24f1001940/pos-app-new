const env = require('../config/env');

const rateBuckets = new Map();

function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function applyRateLimit(req, res, next) {
  if (env.nodeEnv === 'test') {
    return next();
  }

  const now = Date.now();
  const key = `${getClientKey(req)}:${req.path}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + env.rateLimitWindowMs,
    });
    return next();
  }

  if (bucket.count >= env.rateLimitMaxRequests) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      message: 'Too many requests. Please try again shortly.',
    });
  }

  bucket.count += 1;
  return next();
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      const cleanKey = key.replace(/\$/g, '').replace(/\./g, '');
      if (!cleanKey) {
        return acc;
      }

      acc[cleanKey] = sanitizeValue(value[key]);
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  return value;
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }

  return next();
}

module.exports = {
  applyRateLimit,
  sanitizeRequest,
};
