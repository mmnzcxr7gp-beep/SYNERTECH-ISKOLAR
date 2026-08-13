/**
 * Request Context Middleware — Observability Foundation
 * 
 * Assigns a unique request ID to every incoming request and
 * tracks response timing for performance monitoring.
 * 
 * Headers:
 * - Reads incoming `X-Request-Id` header (for distributed tracing)
 * - Sets `X-Request-Id` on response
 * 
 * Attaches to req:
 * - req.requestId  — unique request identifier
 * - req.startTime  — high-resolution start timestamp
 * - req.log        — child logger bound with requestId
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const requestContext = (req, res, next) => {
  // Use forwarded request ID or generate a new one
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const startTime = process.hrtime.bigint();

  req.requestId = requestId;
  req.startTime = startTime;
  req.log = logger.child({ requestId });

  // Set response header for client-side correlation
  res.setHeader('X-Request-Id', requestId);

  // Log response timing on finish
  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - startTime);
    const durationMs = (durationNs / 1e6).toFixed(2);

    const meta = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs),
      contentLength: res.getHeader('content-length') || 0,
      userAgent: req.headers['user-agent']?.substring(0, 80),
    };

    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`, meta);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`, meta);
    } else {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`, meta);
    }
  });

  next();
};

module.exports = { requestContext };
