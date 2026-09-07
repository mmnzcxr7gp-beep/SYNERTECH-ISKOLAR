require('dotenv').config();

const mongoose = require('mongoose');
const { buildApp, connectMongoose, setupSocketIO } = require('./src/vercelApp');
const { connectDb, db } = require('./src/config/db');
const http = require('http');

// Production environment validation
if (process.env.NODE_ENV === 'production') {
  const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
  const missing = requiredEnv.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    console.error(`❌ [FATAL CONFIG ERROR] Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Process-level Crash Protection (Pillar 12 - Stability & Error Tracking)
process.on('uncaughtException', (err) => {
  console.error('🛡️ [CRASH PROTECTION] Uncaught Exception:', err?.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [CRASH PROTECTION] Unhandled Rejection:', reason);
});

const PORT = process.env.PORT || 4000;
const cloudSyncService = require('./src/utils/cloudSyncService');

// Connect DB on server startup — strictly fail-closed in production
(async () => {
  try {
    await connectDb();
    connectMongoose().catch((err) => {
      console.warn('⚠️ Mongoose initial warning:', err?.message || err);
      if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
        console.error('❌ [FATAL] Mongoose failed to connect in production. Exiting.');
        process.exit(1);
      }
    });
    // Start continuous synchronization and health keep-alive process
    cloudSyncService.startContinuousSync(30000);
  } catch (err) {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
      console.error('❌ [FATAL] Production database startup failure:', err?.message || err);
      console.error('Refusing to run in-memory mock mode in production. Exiting process.');
      process.exit(1);
    }
    console.warn('⚠️ DB connection issue (development mode):', err?.message || err);
  }
})();

const app = buildApp();
const server = http.createServer(app);

// Setup Socket.IO for real-time notifications
setupSocketIO(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Iskolar backend running on http://0.0.0.0:${PORT}`);
});

// Comprehensive Graceful shutdown handler
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`🛑 ${signal} received, shutting down gracefully...`);

  // 1. Stop background sync timers
  try {
    cloudSyncService.stopContinuousSync();
  } catch (_) {}

  // 2. Stop accepting new HTTP connections and finish in-flight requests
  server.close(async () => {
    console.log('✓ HTTP server closed');

    // 3. Close Socket.IO connections
    try {
      if (global._io) {
        global._io.close();
        console.log('✓ Socket.IO server closed');
      }
    } catch (_) {}

    // 4. Close Mongoose connection
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('✓ Mongoose connection closed');
      }
    } catch (_) {}

    // 5. Close MongoClient
    try {
      if (db.client) {
        await db.client.close();
        console.log('✓ MongoClient connection closed');
      }
    } catch (_) {}

    console.log('✓ Graceful shutdown complete. Exiting.');
    process.exit(0);
  });

  // Force exit after 10s timeout if connections hang
  setTimeout(() => {
    console.error('⚠️ Graceful shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

