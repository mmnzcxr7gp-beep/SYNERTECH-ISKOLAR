require('dotenv').config();

const { buildApp, connectMongoose, setupSocketIO } = require('./src/vercelApp');
const { connectDb } = require('./src/config/db');
const http = require('http');

// Process-level Crash Protection (Pillar 12 - Stability & Error Tracking)
process.on('uncaughtException', (err) => {
  console.error('🛡️ [CRASH PROTECTION] Uncaught Exception:', err?.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [CRASH PROTECTION] Unhandled Rejection:', reason);
});

const PORT = process.env.PORT || 4000;

// Connect DB in background without blocking server startup
(async () => {
  try {
    await connectDb();
    connectMongoose().catch((err) => console.warn('⚠️ Mongoose non-blocking warning:', err?.message || err));
  } catch (err) {
    console.warn('⚠️ DB connection issue:', err?.message || err);
  }
})();

const app = buildApp();
const server = http.createServer(app);

// Setup Socket.IO for real-time notifications
setupSocketIO(server);

server.listen(PORT, () => {
  console.log(`🚀 Iskolar backend running on http://localhost:${PORT}`);
});
