const User = require('../models/user.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const env = require('../config/env');
const {
  createSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
} = require('../services/session.service');
const { logActivity, listActivityLogs } = require('../services/activity-log.service');
const { ROLES } = require('../constants/roles');

function serializeUser(user) {
  return {
    id: user.id || String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt || null,
  };
}

const getBootstrapStatus = asyncHandler(async (req, res) => {
  const userCount = await User.countDocuments();
  res.json({
    setupRequired: userCount === 0,
  });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existingUsers = await User.countDocuments();
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw createHttpError(409, 'A user with this email already exists');
  }

  let role = req.body.role || ROLES.STAFF;
  if (existingUsers === 0) {
    role = ROLES.ADMIN;
  } else if (!req.user || req.user.role !== ROLES.ADMIN) {
    throw createHttpError(403, 'Only the admin can create additional users');
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  const payload = {
    user: serializeUser(user),
  };

  if (existingUsers === 0) {
    const session = await createSession(user, req, 'bootstrap-admin');
    payload.token = session.accessToken;
    payload.refreshToken = session.refreshToken;
    res.cookie('refreshToken', session.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  await logActivity({
    user,
    eventType: 'user_registered',
    category: 'auth',
    message: `User ${email} registered`,
    metadata: { role },
    req,
  });

  res.status(201).json(payload);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw createHttpError(401, 'Invalid email or password');
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw createHttpError(423, 'Account is temporarily locked. Try again later.');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= env.authLockMaxAttempts) {
      user.lockUntil = new Date(Date.now() + env.authLockMinutes * 60 * 1000);
      user.failedLoginAttempts = 0;
    }

    await user.save();
    await logActivity({
      user,
      eventType: 'login_failed',
      category: 'auth',
      status: 'failure',
      message: `Failed login for ${email}`,
      req,
    });
    throw createHttpError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const session = await createSession(user, req, req.body.deviceLabel || 'web');

  await logActivity({
    user,
    eventType: 'login',
    category: 'auth',
    message: `User ${email} logged in`,
    req,
  });

  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  res.json({
    token: session.accessToken,
    refreshToken: session.refreshToken,
    user: serializeUser(user),
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
  const session = await refreshSession(refreshToken);

  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  res.json({
    token: session.accessToken,
    refreshToken: session.refreshToken,
    user: serializeUser(session.session.user),
  });
});

const logout = asyncHandler(async (req, res) => {
  await revokeSession(req.sessionId, 'logout');

  await User.findByIdAndUpdate(req.user._id, {
    lastLogoutAt: new Date(),
  });

  await logActivity({
    user: req.user,
    eventType: 'logout',
    category: 'auth',
    message: `User ${req.user.email} logged out`,
    req,
  });

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

const logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { tokenVersion: 1 },
    lastLogoutAt: new Date(),
  });

  await revokeAllSessions(req.user._id, 'logout-all');

  await logActivity({
    user: req.user,
    eventType: 'logout_all',
    category: 'auth',
    message: `User ${req.user.email} logged out from all sessions`,
    req,
  });

  res.clearCookie('refreshToken');
  res.json({ message: 'All sessions have been logged out' });
});

const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await listActivityLogs({
    userId: req.user.role === ROLES.ADMIN ? req.query.userId || null : req.user._id,
    limit: Number(req.query.limit) || 50,
  });

  res.json({ logs });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    user: serializeUser(req.user),
  });
});

module.exports = {
  getBootstrapStatus,
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getActivityLogs,
  me,
};
