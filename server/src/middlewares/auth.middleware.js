const User = require('../models/user.model');
const UserSession = require('../models/auth-session.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const { verifyToken } = require('../utils/token');
const { ROLE_PERMISSIONS } = require('../constants/roles');

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
}

const attachUserIfExists = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    if (user && user.active && user.tokenVersion === (decoded.tokenVersion || 0)) {
      if (decoded.sessionId) {
        const session = await UserSession.findOne({
          sessionId: decoded.sessionId,
          user: user._id,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        });

        if (!session) {
          return next();
        }
      }

      req.user = user;
    }
  } catch (error) {
    req.user = null;
  }

  next();
});

const protect = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    throw createHttpError(401, 'Authentication required');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw createHttpError(401, 'Invalid or expired token');
  }

  const user = await User.findById(decoded.userId).select('-password');
  if (!user || !user.active || user.tokenVersion !== (decoded.tokenVersion || 0)) {
    throw createHttpError(401, 'User account is not available');
  }

  if (decoded.sessionId) {
    const session = await UserSession.findOne({
      sessionId: decoded.sessionId,
      user: user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw createHttpError(401, 'Session is no longer active');
    }

    req.sessionId = decoded.sessionId;
  }

  req.user = user;
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createHttpError(403, 'You do not have permission'));
    }

    return next();
  };
}

function hasPermission(user, permission) {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createHttpError(401, 'Authentication required'));
    }

    if (!hasPermission(req.user, permission)) {
      return next(createHttpError(403, 'You do not have permission'));
    }

    return next();
  };
}

module.exports = {
  attachUserIfExists,
  protect,
  authorize,
  hasPermission,
  requirePermission,
};
