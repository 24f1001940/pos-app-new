const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const env = require('../config/env');

function buildTokenPayload(user, extras = {}) {
  return {
    userId: user._id,
    role: user.role,
    email: user.email,
    tokenVersion: user.tokenVersion || 0,
    ...extras,
  };
}

function signToken(user, extras = {}) {
  return jwt.sign(
    buildTokenPayload(user, extras),
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(buildTokenPayload(user, { sessionId }), env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
  hashToken,
};
