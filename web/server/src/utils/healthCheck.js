/**
 * Deep Health Check — Production-Ready Health Endpoint
 * 
 * Provides comprehensive system health status for:
 * - Load balancer health probes
 * - Monitoring dashboards (Grafana, Datadog)
 * - Deployment readiness checks
 * 
 * Endpoints:
 *   GET /health       — lightweight liveness (existing)
 *   GET /api/health/deep — detailed system health
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Build deep health check response.
 * @returns {object}
 */
const getDeepHealth = async () => {
  const checks = {};
  let overallStatus = 'healthy';

  // 1. MongoDB Mongoose connection
  try {
    const mongoState = mongoose.connection.readyState;
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    if (mongoState === 1) {
      // Ping to verify actual connectivity
      await mongoose.connection.db.admin().ping();
      checks.mongoose = {
        status: 'healthy',
        state: stateMap[mongoState],
        database: mongoose.connection.name,
        host: mongoose.connection.host,
      };
    } else {
      checks.mongoose = {
        status: mongoState === 2 ? 'degraded' : 'unhealthy',
        state: stateMap[mongoState] || 'unknown',
      };
      if (mongoState !== 2) overallStatus = 'degraded';
    }
  } catch (err) {
    checks.mongoose = { status: 'unhealthy', error: err.message };
    overallStatus = 'degraded';
  }

  // 2. MongoClient (app_state) connection
  try {
    const { db } = require('../config/db');
    checks.appState = {
      status: db.collection ? 'healthy' : 'degraded',
      hasCollection: !!db.collection,
      usersCount: (db.data.users || []).length,
      scholarshipsCount: (db.data.scholarships || []).length,
      applicationsCount: (db.data.applications || []).length,
    };
    if (!db.collection) overallStatus = 'degraded';
  } catch (err) {
    checks.appState = { status: 'unhealthy', error: err.message };
    overallStatus = 'degraded';
  }

  // 3. Socket.IO
  try {
    const io = global._io;
    checks.socketIO = {
      status: io ? 'healthy' : 'degraded',
      connected: io ? io.engine?.clientsCount || 0 : 0,
    };
  } catch (_) {
    checks.socketIO = { status: 'unknown' };
  }

  // 4. Memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    status: mem.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    externalMB: Math.round(mem.external / 1024 / 1024),
  };

  // 5. Cache status
  try {
    const cacheService = require('./cacheService');
    checks.cache = {
      status: 'healthy',
      ...cacheService.stats(),
    };
  } catch (_) {
    checks.cache = { status: 'unknown' };
  }

  // 6. Task queue status
  try {
    const taskQueue = require('./taskQueue');
    checks.taskQueue = {
      status: 'healthy',
      ...taskQueue.stats(),
    };
  } catch (_) {
    checks.taskQueue = { status: 'unknown' };
  }

  // 7. Storage info
  try {
    const storageService = require('./storageService');
    checks.storage = {
      status: 'healthy',
      ...storageService.info(),
    };
  } catch (_) {
    checks.storage = { status: 'unknown' };
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version || '0.1.0',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    checks,
  };
};

/**
 * Liveness probe handler - verifies process is running.
 */
const livenessHandler = (_req, res) => {
  res.status(200).json({
    status: 'alive',
    instanceId: process.env.INSTANCE_ID || 'default',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Readiness probe handler - verifies critical dependencies:
 * - MongoDB connection
 * - Socket.IO initialization
 * - Required configuration
 * - Storage availability
 * Returns 503 when not ready, 200 when ready.
 */
const readinessHandler = async (_req, res) => {
  try {
    const checks = {};
    let isReady = true;

    // 1. MongoDB Mongoose / MongoClient check
    const mongoState = mongoose.connection.readyState;
    let mongoOk = false;
    if (mongoState === 1) {
      try {
        await mongoose.connection.db.admin().ping();
        mongoOk = true;
      } catch (_) {
        mongoOk = false;
      }
    }
    const { db } = require('../config/db');
    if (!mongoOk && db.collection) {
      mongoOk = true;
    }

    checks.mongodb = {
      status: mongoOk ? 'ready' : 'unready',
      connected: mongoOk,
    };
    if (!mongoOk) isReady = false;

    // 2. Socket.IO initialization
    const io = global._io;
    const socketOk = !!io;
    checks.socketIO = {
      status: socketOk ? 'ready' : 'unready',
      initialized: socketOk,
    };
    if (!socketOk) isReady = false;

    // 3. Required configuration
    const configOk = !!(process.env.JWT_SECRET || process.env.NODE_ENV !== 'production');
    checks.configuration = {
      status: configOk ? 'ready' : 'unready',
      jwtSecretConfigured: !!process.env.JWT_SECRET,
    };
    if (!configOk) isReady = false;

    // 4. Storage availability
    let storageOk = true;
    try {
      const storageService = require('./storageService');
      const info = storageService.info();
      checks.storage = {
        status: 'ready',
        type: info.type || 'local',
      };
    } catch (_) {
      storageOk = false;
      checks.storage = { status: 'unready' };
    }
    if (!storageOk) isReady = false;

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not_ready',
      instanceId: process.env.INSTANCE_ID || 'default',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      instanceId: process.env.INSTANCE_ID || 'default',
      timestamp: new Date().toISOString(),
      error: 'Readiness probe failed',
    });
  }
};

/**
 * Express handler for deep health check.
 */
const deepHealthHandler = async (req, res) => {
  try {
    const health = await getDeepHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    logger.error('Deep health check failed', { error: err.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check internal error',
    });
  }
};

/**
 * Express handler for storage health check (Phase 13).
 */
const storageHealthHandler = async (_req, res) => {
  try {
    const storageService = require('./storageService');
    const health = await storageService.checkHealth();
    const statusCode = health.status === 'HEALTHY' ? 200 : health.status === 'DEGRADED' ? 200 : 503;
    const responsePayload = {
      status: health.status,
      activeDriver: health.driver || storageService.driverName,
      driver: health.driver || storageService.driverName,
      configured: health.configured,
      reachable: health.reachable,
      readable: health.readable,
      writable: health.writable,
      localFallbackAvailable: true,
      timestamp: new Date().toISOString(),
      message: health.message,
    };
    return res.status(statusCode).json(responsePayload);
  } catch (err) {
    return res.status(503).json({
      status: 'MISCONFIGURED',
      activeDriver: 'unknown',
      driver: 'unknown',
      localFallbackAvailable: true,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getDeepHealth,
  deepHealthHandler,
  livenessHandler,
  readinessHandler,
  storageHealthHandler,
};



