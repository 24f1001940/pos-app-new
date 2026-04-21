const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  defaultMeta: { service: 'mujahid-electronic-goods-api' },
  transports: [
    new transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? format.json()
          : format.combine(
              format.colorize(),
              format.timestamp({ format: 'HH:mm:ss' }),
              format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`),
            ),
    }),
  ],
});

module.exports = logger;
