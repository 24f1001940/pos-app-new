const UserSession = require('../models/auth-session.model');
const env = require('../config/env');
const {
  hashToken,
  signRefreshToken,
  signToken,
  verifyRefreshToken,
} = require('../utils/token');
const { createHttpError } = require('../utils/http');

function getRefreshTokenExpiryDate() {
  const expiresIn = String(env.jwtRefreshExpiresIn || '30d');
  const match = expiresIn.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + amount * multipliers[unit]);
}

async function createSession(user, req, deviceLabel = '') {
  const session = await UserSession.create({
    user: user._id,
    refreshTokenHash: 'pending',
    userAgent: req?.get('user-agent') || '',
    ipAddress: req?.ip || '',
    deviceLabel,
    tokenVersion: user.tokenVersion || 0,
    expiresAt: getRefreshTokenExpiryDate(),
  });

  const accessToken = signToken(user, { sessionId: session.sessionId });
  const refreshToken = signRefreshToken(user, session.sessionId);

  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  return {
    accessToken,
    refreshToken,
    session,
  };
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw createHttpError(401, 'Refresh token is required');
  }

  const decoded = verifyRefreshToken(refreshToken);
  const session = await UserSession.findOne({
    sessionId: decoded.sessionId,
    user: decoded.userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('user');

  if (!session || !session.user || !session.user.active) {
    throw createHttpError(401, 'Session is no longer active');
  }

  if (session.tokenVersion !== (session.user.tokenVersion || 0)) {
    throw createHttpError(401, 'Session has been invalidated');
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw createHttpError(401, 'Refresh token is invalid');
  }

  const accessToken = signToken(session.user, { sessionId: session.sessionId });
  const nextRefreshToken = signRefreshToken(session.user, session.sessionId);

  session.refreshTokenHash = hashToken(nextRefreshToken);
  session.lastUsedAt = new Date();
  await session.save();

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    session,
  };
}

async function revokeSession(sessionId, reason = 'logout') {
  if (!sessionId) {
    return null;
  }

  return UserSession.findOneAndUpdate(
    { sessionId, revokedAt: null },
    { revokedAt: new Date(), revokedReason: reason },
    { returnDocument: 'after' },
  );
}

async function revokeAllSessions(userId, reason = 'logout-all') {
  return UserSession.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date(), revokedReason: reason },
  );
}

module.exports = {
  createSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
};
