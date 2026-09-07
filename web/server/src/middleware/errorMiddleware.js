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
      success: false,
      code: 'UPLOAD_UNAUTHORIZED',
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      retryable: false,
      requestId,
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'UPLOAD_UNAUTHORIZED',
      errorCode: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
      retryable: false,
      requestId,
    });
  }

  // Multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      code: 'FILE_TOO_LARGE',
      errorCode: 'FILE_TOO_LARGE',
      message: 'The selected document exceeds the 10 MB limit.',
      field: err.field || 'document',
      retryable: true,
      requestId,
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      code: 'FILE_TYPE_NOT_ALLOWED',
      errorCode: 'UNEXPECTED_FILE',
      message: 'Unexpected file field: ' + (err.field || 'document'),
      field: err.field || 'document',
      retryable: true,
      requestId,
    });
  }

  // Known upload error codes
  const uploadCodes = [
    'FILE_REQUIRED',
    'FILE_TYPE_NOT_ALLOWED',
    'FILE_TOO_LARGE',
    'FILE_SIGNATURE_INVALID',
    'FILE_CORRUPT',
    'DUPLICATE_FILE',
    'UPLOAD_UNAUTHORIZED',
    'STORAGE_UNAVAILABLE',
  ];
  if (err.code && uploadCodes.includes(err.code)) {
    const status = err.code === 'UPLOAD_UNAUTHORIZED' ? 401 :
      err.code === 'STORAGE_UNAVAILABLE' ? 503 : 400;
    return res.status(status).json({
      success: false,
      code: err.code,
      errorCode: err.code,
      message: err.message,
      field: err.field || 'document',
      retryable: err.code !== 'UPLOAD_UNAUTHORIZED',
      requestId,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation error: ' + Object.values(err.errors || {}).map((e) => e.message).join(', '),
      retryable: true,
      requestId,
    });
  }

  // MongoDB duplicate key errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError' || err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'record';
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_FILE',
      errorCode: 'DUPLICATE_ENTRY',
      message: `A duplicate record with this ${field} already exists.`,
      field,
      retryable: false,
      requestId,
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      errorCode: 'DB_UNAVAILABLE',
      message: 'Database temporarily unavailable',
      retryable: true,
      requestId,
    });
  }

  // Default error response — consistent shape without leaking stack traces or internal paths
  const safeMessage = (err.message && !err.message.includes('/') && !err.message.includes('\\'))
    ? err.message
    : (statusCode === 500 ? 'An unexpected server error occurred.' : 'Request could not be processed.');

  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    errorCode: err.errorCode || 'INTERNAL_ERROR',
    message: safeMessage,
    field: err.field || null,
    retryable: statusCode >= 500,
    requestId,
  });
};

module.exports = {
  errorHandler,
  Sentry,
};
