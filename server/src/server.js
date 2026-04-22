const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/db');
const logger = require('./config/logger');
const { initSentry } = require('./config/sentry');
const { setSocketServer } = require('./services/realtime.service');
const { startSchedulers } = require('./services/scheduler.service');

const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
const desktopOriginWhitelist = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'null',
]);

function resolveSocketCorsOrigins() {
  if (env.nodeEnv === 'production') {
    return [env.clientUrl, ...desktopOriginWhitelist];
  }

  return [env.clientUrl, localDevOriginPattern, ...desktopOriginWhitelist];
}

async function startServer() {
  if (env.nodeEnv === 'production' && env.jwtSecret === 'development-secret-key') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  await connectDatabase();
  initSentry();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: resolveSocketCorsOrigins(),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('notification:subscribe', (payload) => {
      if (!payload?.userId) {
        return;
      }

      socket.join(`user:${payload.userId}`);
    });
  });

  setSocketServer(io);
  startSchedulers();

  server.listen(env.port, () => {
    logger.info(`API server listening on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
