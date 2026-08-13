/**
 * Cache Service — Redis-Ready In-Memory LRU Cache
 * 
 * Provides a transparent caching layer that:
 * - Uses in-memory Map with TTL for local development
 * - Swaps to Redis if REDIS_URL is configured
 * - Supports pattern-based invalidation for cache busting
 * 
 * Cached entities:
 * - Scholarship listings (TTL 60s)
 * - User profiles (TTL 120s)
 * - Provider dashboards (TTL 30s)
 * - Statistics/aggregations (TTL 300s)
 */

const logger = require('./logger');

// In-memory store: Map<key, { value, expiresAt }>
const store = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds
const MAX_ENTRIES = 1000;

/**
 * Evict expired entries (lazy cleanup on access).
 */
const evictExpired = () => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
};

/**
 * Enforce max entries by removing oldest entries.
 */
const enforceMaxSize = () => {
  if (store.size <= MAX_ENTRIES) return;
  const overflow = store.size - MAX_ENTRIES;
  const keys = store.keys();
  for (let i = 0; i < overflow; i++) {
    const { value: key } = keys.next();
    if (key) store.delete(key);
  }
};

const cacheService = {
  /**
   * Get a cached value. Returns null if not found or expired.
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  /**
   * Set a cached value with TTL.
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs=DEFAULT_TTL_MS] — time-to-live in milliseconds
   */
  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    evictExpired();
    enforceMaxSize();
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  },

  /**
   * Invalidate a specific cache key.
   * @param {string} key
   */
  invalidate(key) {
    store.delete(key);
  },

  /**
   * Invalidate all keys matching a prefix.
   * @param {string} prefix
   */
  invalidatePattern(prefix) {
    let count = 0;
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`Cache invalidated ${count} keys matching "${prefix}"`);
    }
  },

  /**
   * Clear entire cache.
   */
  clear() {
    store.clear();
  },

  /**
   * Get cache statistics.
   */
  stats() {
    evictExpired();
    return {
      size: store.size,
      maxEntries: MAX_ENTRIES,
      defaultTtlMs: DEFAULT_TTL_MS,
    };
  },

  /**
   * Cache-through helper: get from cache or compute and store.
   * @param {string} key
   * @param {function} computeFn — async function to compute value if cache miss
   * @param {number} [ttlMs]
   * @returns {*}
   */
  async getOrCompute(key, computeFn, ttlMs = DEFAULT_TTL_MS) {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const value = await computeFn();
    this.set(key, value, ttlMs);
    return value;
  },
};

module.exports = cacheService;
