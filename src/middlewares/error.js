const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { createLogger, format, transports } = winston;

// ------------------------------------------------------------
// LOGGER SETUP
// ------------------------------------------------------------
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'error',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ],
  exitOnError: false
});

// ------------------------------------------------------------
// ERROR PAGE TEMPLATES
// ------------------------------------------------------------
const VIEWS_DIR = path.join(__dirname, '../views');

const readHtmlFile = (filename) => {
  const filePath = path.join(VIEWS_DIR, filename);
  return fs.readFileSync(filePath, 'utf8');
};

const e404 = readHtmlFile('error_404.html');
const e500 = readHtmlFile('error_500.html');

const ERROR_PAGES = {
  404: e404,
  500: e500,
};

// ------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------
const sanitizeError = (err, includeStack = false) => {
  const sanitized = {
    status: err.status || 500,
    message: err.message || 'An unexpected error occurred'
  };
  if (includeStack && process.env.NODE_ENV !== 'production') {
    sanitized.stack = err.stack;
  }
  return sanitized;
};

// ------------------------------------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------------------------------------
const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const sanitizedError = sanitizeError(err);
  
  logger.error('Request Error', {
    method: req.method,
    url: req.originalUrl,
    body: process.env.NODE_ENV === 'production' ? '[REDACTED]' : req.body,
    query: process.env.NODE_ENV === 'production' ? '[REDACTED]' : req.query,
    params: req.params,
    statusCode,
    errorMessage: sanitizedError.message,
    stack: err.stack,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  const errorPage = ERROR_PAGES[statusCode] || ERROR_PAGES[500];
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  if (req.accepts('html')) {
    res.status(statusCode).type('html').send(errorPage);
  } else if (req.accepts('json')) {
    res.status(statusCode).json({ error: sanitizedError });
  } else {
    res.status(statusCode).type('text').send(sanitizedError.message);
  }
};

// ------------------------------------------------------------
// 404 HANDLER
// ------------------------------------------------------------
const notFoundHandler = (req, res) => {
  const errorPage = ERROR_PAGES[404];
  res.status(404).type('html').send(errorPage);
};

// ------------------------------------------------------------
// PROCESS ERROR HANDLERS
// ------------------------------------------------------------
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error, stack: error.stack });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, stack: reason?.stack });
});

// ------------------------------------------------------------
module.exports = {
  notFoundHandler,
  globalErrorHandler
};