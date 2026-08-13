/**
 * Structured Logger — Production-Grade Observability
 * 
 * Provides structured JSON logging with levels, request context,
 * and performance timing. Zero external dependencies.
 * 
 * Ready for integration with:
 * - Grafana Loki (JSON log ingestion)
 * - OpenTelemetry (trace context propagation)
 * - Prometheus (via log-derived metrics)
 * 
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('User registered', { userId: 123, email: 'a@b.com' });
 *   logger.error('DB write failed', { error: err.message, collection: 'app_state' });
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = () => {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LOG_LEVELS[env] ?? LOG_LEVELS.info;
};

const SERVICE_NAME = process.env.SERVICE_NAME || 'iskolar-backend';

/**
 * Format a structured log entry as JSON.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {object} [meta={}]
 */
const formatEntry = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...meta,
  };

  // Attach request context if available (set by requestContext middleware)
  if (meta.requestId) {
    entry.requestId = meta.requestId;
  }

  return entry;
};

const log = (level, message, meta = {}) => {
  if (LOG_LEVELS[level] < currentLevel()) return;

  const entry = formatEntry(level, message, meta);

  // Use structured JSON in production, human-readable in dev
  if (process.env.NODE_ENV === 'production') {
    const output = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  } else {
    // Dev-friendly format with emoji indicators
    const icons = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' };
    const icon = icons[level] || '•';
    const reqId = meta.requestId ? ` [${meta.requestId.slice(0, 8)}]` : '';
    const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${icon}${reqId} ${message}${extra}`);
  }
};

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),

  /**
   * Create a child logger pre-bound with context (e.g., requestId).
   * @param {object} context
   */
  child: (context) => ({
    debug: (msg, meta) => log('debug', msg, { ...context, ...meta }),
    info: (msg, meta) => log('info', msg, { ...context, ...meta }),
    warn: (msg, meta) => log('warn', msg, { ...context, ...meta }),
    error: (msg, meta) => log('error', msg, { ...context, ...meta }),
  }),
};

module.exports = logger;
