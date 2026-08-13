const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

// Phase 8: Guard Sentry initialization against placeholder DSN
const sentryDsn = process.env.SENTRY_DSN || '';
const isPlaceholderDsn = !sentryDsn || sentryDsn.includes('o4500000000000000') || sentryDsn.includes('0000000000');

if (!isPlaceholderDsn) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    logger.info('Sentry Error Tracking initialized');
  } catch (e) {
    logger.warn('Sentry initialization notice', { error: e.message });
  }
} else {
  logger.info('Sentry skipped (placeholder DSN detected)');
}

/**
 * Sanitize request body before sending to Sentry — strip sensitive fields.
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return {};
  const sensitive = ['password', 'token', 'otp', 'mfaCode', 'secret', 'jwt', 'authorization', 'creditCard'];
  const sanitized = { ...body };
  for (const key of Object.keys(sanitized)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
};

const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  const statusCode = err.statusCode || err.status || 500;

  // Phase 1: Structured error logging with request context
  logger.error(`[ErrorHandler] ${err.message}`, {
    requestId,
    name: err.name,
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id || null,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Capture to Sentry (if initialized) with sanitized body
  if (!isPlaceholderDsn) {
    try {
      Sentry.captureException(err, {
        extra: {
          requestId,
          path: req.path,
          method: req.method,
          userId: req.user?.id || null,
          body: sanitizeBody(req.body),
        },
      });
    } catch (_) {}
  }

  // Phase 9: Handle specific error types with consistent response shape

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false, message: 'Invalid authentication token', errorCode: 'INVALID_TOKEN', requestId,
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false, message: 'Authentication token has expired', errorCode: 'TOKEN_EXPIRED', requestId,
    });
  }

  // Multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false, message: 'File too large. Maximum size is 10MB.', errorCode: 'FILE_TOO_LARGE', requestId,
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false, message: 'Unexpected file field', errorCode: 'UNEXPECTED_FILE', requestId,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errorCode: 'VALIDATION_ERROR',
      details: Object.values(err.errors || {}).map((e) => e.message).join(', '),
      requestId,
    });
  }

  // MongoDB duplicate key errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError' || err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'unknown field';
    return res.status(409).json({
      success: false,
      message: `Duplicate entry for ${field}`,
      errorCode: 'DUPLICATE_ENTRY',
      details: `A record with this ${field} already exists`,
      requestId,
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false, message: 'Database temporarily unavailable', errorCode: 'DB_UNAVAILABLE', requestId,
    });
  }

  // Default error response — consistent shape
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && !isDev ? 'Internal server error' : (err.message || 'Server error'),
    errorCode: 'INTERNAL_ERROR',
    requestId,
    ...(isDev ? { details: err.stack } : {}),
  });
};

module.exports = {
  errorHandler,
  Sentry,
};
