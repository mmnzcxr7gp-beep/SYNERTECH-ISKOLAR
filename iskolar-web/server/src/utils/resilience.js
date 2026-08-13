/**
 * Resilience Utilities — Retry, Timeout, Circuit Breaker
 * 
 * Provides fault-tolerance patterns for external service calls:
 * - Email (SMTP can timeout)
 * - OCR (Tesseract can hang on large images)
 * - MongoDB (transient connection drops)
 * - Firebase (network errors)
 * 
 * Usage:
 *   const { withRetry, withTimeout, withCircuitBreaker } = require('./resilience');
 *   
 *   const result = await withRetry(() => sendEmail(to, body), { retries: 3 });
 *   const result = await withTimeout(() => ocrProcess(file), 30000);
 */

const logger = require('./logger');

/**
 * Retry an async function with exponential backoff.
 * @param {function} fn — async function to retry
 * @param {object} [opts]
 * @param {number} [opts.retries=3] — max retry attempts
 * @param {number} [opts.baseDelayMs=1000] — base delay between retries
 * @param {number} [opts.maxDelayMs=10000] — max delay cap
 * @param {string} [opts.name='operation'] — name for logging
 * @returns {Promise<*>}
 */
const withRetry = async (fn, opts = {}) => {
  const { retries = 3, baseDelayMs = 1000, maxDelayMs = 10000, name = 'operation' } = opts;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        logger.error(`${name} failed after ${retries} attempts`, { error: err.message });
        throw err;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      // Add jitter: ±25% randomization to prevent thundering herd
      const jitter = delay * (0.75 + Math.random() * 0.5);

      logger.warn(`${name} attempt ${attempt}/${retries} failed, retrying in ${Math.round(jitter)}ms`, {
        error: err.message,
      });

      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
};

/**
 * Execute an async function with a timeout.
 * @param {function} fn — async function
 * @param {number} timeoutMs — timeout in milliseconds
 * @param {string} [name='operation'] — name for logging
 * @returns {Promise<*>}
 */
const withTimeout = (fn, timeoutMs, name = 'operation') => {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => {
        logger.warn(`${name} timed out after ${timeoutMs}ms`);
        reject(new Error(`${name} timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    ),
  ]);
};

/**
 * Circuit Breaker pattern — prevents cascading failures.
 * 
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 * 
 * @param {string} name — circuit name
 * @param {object} [opts]
 * @param {number} [opts.failureThreshold=5] — failures before opening
 * @param {number} [opts.resetTimeoutMs=30000] — time before trying half-open
 * @returns {{ execute: function, getState: function }}
 */
const createCircuitBreaker = (name, opts = {}) => {
  const { failureThreshold = 5, resetTimeoutMs = 30000 } = opts;

  let state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
  let failureCount = 0;
  let lastFailureTime = 0;
  let successCount = 0;

  return {
    async execute(fn) {
      // Check if circuit should transition from OPEN to HALF_OPEN
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime >= resetTimeoutMs) {
          state = 'HALF_OPEN';
          logger.info(`Circuit breaker [${name}] transitioning to HALF_OPEN`);
        } else {
          throw new Error(`Circuit breaker [${name}] is OPEN — service unavailable`);
        }
      }

      try {
        const result = await fn();
        
        // Success — reset or close circuit
        if (state === 'HALF_OPEN') {
          successCount++;
          if (successCount >= 2) {
            state = 'CLOSED';
            failureCount = 0;
            successCount = 0;
            logger.info(`Circuit breaker [${name}] CLOSED (recovered)`);
          }
        } else {
          failureCount = 0;
        }
        
        return result;
      } catch (err) {
        failureCount++;
        lastFailureTime = Date.now();
        successCount = 0;

        if (failureCount >= failureThreshold) {
          state = 'OPEN';
          logger.error(`Circuit breaker [${name}] OPENED after ${failureCount} failures`, {
            error: err.message,
          });
        }

        throw err;
      }
    },

    getState() {
      return { name, state, failureCount, lastFailureTime };
    },

    reset() {
      state = 'CLOSED';
      failureCount = 0;
      successCount = 0;
      lastFailureTime = 0;
    },
  };
};

module.exports = {
  withRetry,
  withTimeout,
  createCircuitBreaker,
};
