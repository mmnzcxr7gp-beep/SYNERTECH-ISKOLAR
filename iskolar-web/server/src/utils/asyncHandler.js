/**
 * Async Handler — Route Handler Wrapper
 * 
 * Wraps async Express route handlers to automatically catch
 * unhandled promise rejections and pass them to next(err).
 * 
 * Eliminates the need for try/catch in every controller.
 * 
 * Usage:
 *   const { asyncHandler } = require('../utils/asyncHandler');
 *   router.get('/endpoint', asyncHandler(async (req, res) => { ... }));
 */

/**
 * Wrap an async route handler to catch errors.
 * @param {function} fn — async (req, res, next) => void
 * @returns {function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
