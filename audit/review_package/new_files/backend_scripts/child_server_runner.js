/**
 * child_server_runner.js
 * Independent Node.js process runner for multi-process distributed testing.
 * Runs in its own separate V8 heap, separate process space, and separate port.
 */

// MUST load testHelper before any application/database modules to guarantee isolated test environment
require('./testHelper');

const http = require('http');
const port = parseInt(process.env.PORT, 10) || 4011;
const { buildApp, setupSocketIO } = require('../src/vercelApp');
const { connectDb } = require('../src/config/db');

async function main() {
  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  const io = setupSocketIO(server);

  server.listen(port, '127.0.0.1', () => {
    console.log(`[CHILD_PROCESS_${port}] Server listening on http://127.0.0.1:${port} (PID: ${process.pid})`);
    if (process.send) {
      process.send({ type: 'ready', port, pid: process.pid });
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(`[CHILD_PROCESS_${port}] Startup error:`, err);
  process.exit(1);
});
