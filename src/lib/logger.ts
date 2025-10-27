import winston from 'winston';
import path from 'path';

// Get log level from environment variables
const getLogLevel = (): string => {
  const nodeEnv = process.env['NODE_ENV'] || 'development';
  const logLevel = process.env['LOG_LEVEL'];
  
  if (logLevel) {
    return logLevel;
  }
  
  // Default log levels based on environment
  return nodeEnv === 'production' ? 'info' : 'debug';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: getLogLevel(),
    format: consoleFormat,
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'all.log'),
    level: getLogLevel(),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // File transport for error logs only
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false,
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// Add request logging helper
const httpLogger = (message: string, meta?: any) => {
  logger.log('http', message, meta);
};

// Extend logger with http method
Object.assign(logger, { http: httpLogger });

export { logger };
export default logger;