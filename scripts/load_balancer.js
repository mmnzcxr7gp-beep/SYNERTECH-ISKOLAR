#!/usr/bin/env node
/**
 * ISKOLAR Local Load Balancer & Reverse Proxy
 * 
 * Exposes: http://127.0.0.1:4000
 * Distributes to:
 *   - Backend A: 127.0.0.1:4001 (backend-a)
 *   - Backend B: 127.0.0.1:4002 (backend-b)
 * 
 * Features:
 * - Round-robin HTTP distribution
 * - Session-affinity (sticky sessions) via cookie or IP hash
 * - Full WebSocket / Socket.IO upgrade streaming
 * - Periodic & passive health checks on /api/health/readiness
 * - Dynamic unhealthy instance eviction & auto-recovery
 * - Request ID generation/forwarding (X-Request-Id)
 * - Load balancer diagnostic headers (X-Load-Balancer, X-Served-By)
 */

const http = require('http');
const net = require('net');
const crypto = require('crypto');

const LB_PORT = parseInt(process.env.LB_PORT || '4000', 10);
const BACKENDS = [
  { id: 'backend-a', host: '127.0.0.1', port: 4001, healthy: true, failures: 0, lastCheck: null },
  { id: 'backend-b', host: '127.0.0.1', port: 4002, healthy: true, failures: 0, lastCheck: null },
];

let roundRobinIndex = 0;
const sessionMap = new Map(); // sessionId -> backendId

/**
 * Health check probe for backends
 */
async function probeBackend(backend) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: backend.host,
        port: backend.port,
        path: '/api/health/readiness',
        method: 'GET',
        timeout: 1500,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          backend.lastCheck = Date.now();
          if (res.statusCode === 200) {
            backend.healthy = true;
            backend.failures = 0;
            resolve(true);
          } else {
            backend.failures++;
            if (backend.failures >= 2) backend.healthy = false;
            resolve(false);
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      backend.failures++;
      if (backend.failures >= 2) backend.healthy = false;
      resolve(false);
    });

    req.on('error', () => {
      backend.failures++;
      backend.healthy = false;
      resolve(false);
    });

    req.end();
  });
}

/**
 * Periodic active health checks every 500ms for fast recovery detection
 */
const healthInterval = setInterval(async () => {
  for (const backend of BACKENDS) {
    await probeBackend(backend);
  }
}, 500);


/**
 * Select a backend based on session affinity or round-robin
 */
function selectBackend(req) {
  const healthyBackends = BACKENDS.filter((b) => b.healthy);
  if (healthyBackends.length === 0) {
    return { backend: BACKENDS[0], sessionId: null, isNewSession: false };
  }

  // 1. Check for explicit session cookie or Socket.IO sid query
  const cookies = req.headers.cookie || '';
  let sessionId = null;
  const cookieMatch = cookies.match(/iskolar_session=([^;]+)/);
  if (cookieMatch) {
    sessionId = cookieMatch[1];
  } else {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      sessionId = urlObj.searchParams.get('sid');
    } catch (_) {}
  }

  if (sessionId && sessionMap.has(sessionId)) {
    const assignedId = sessionMap.get(sessionId);
    const assignedBackend = healthyBackends.find((b) => b.id === assignedId);
    if (assignedBackend) {
      return { backend: assignedBackend, sessionId, isNewSession: false };
    }
  }

  // 2. Round-robin among healthy backends
  const backend = healthyBackends[roundRobinIndex % healthyBackends.length];
  roundRobinIndex++;

  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
  }
  sessionMap.set(sessionId, backend.id);

  if (sessionMap.size > 10000) {
    const firstKey = sessionMap.keys().next().value;
    sessionMap.delete(firstKey);
  }

  return { backend, sessionId, isNewSession: true };
}

/**
 * Create HTTP Load Balancer Server with Request Forwarding and Instant Failover
 */
const server = http.createServer((req, res) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const { backend, sessionId, isNewSession } = selectBackend(req);

  function forward(targetBackend, bodyBuffer, isRetry = false) {
    const options = {
      hostname: targetBackend.host,
      port: targetBackend.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'x-forwarded-for': req.socket.remoteAddress,
        'x-forwarded-proto': 'http',
        'x-forwarded-host': req.headers.host,
        'x-request-id': requestId,
        ...(bodyBuffer && bodyBuffer.length > 0 ? { 'content-length': bodyBuffer.length } : {}),
      },
      timeout: 3000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      targetBackend.healthy = true;
      targetBackend.failures = 0;

      res.setHeader('X-Load-Balancer', 'iskolar-local-lb-v1');
      res.setHeader('X-Served-By', targetBackend.id);
      res.setHeader('X-Request-Id', requestId);
      if (isRetry) {
        res.setHeader('X-Failover-From', backend.id);
      }

      if (isNewSession && sessionId) {
        res.setHeader('Set-Cookie', `iskolar_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
      }

      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      targetBackend.healthy = false;
      targetBackend.failures = 10;

      if (!isRetry) {
        const alternate = BACKENDS.find((b) => b.id !== targetBackend.id);
        if (alternate) {
          return forward(alternate, bodyBuffer, true);
        }
      }

      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service Unavailable', details: err.message }));
    });

    if (bodyBuffer && bodyBuffer.length > 0) {
      proxyReq.write(bodyBuffer);
      proxyReq.end();
    } else if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    forward(backend, null, false);
  } else {
    const bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', () => {
      forward(backend, Buffer.concat(bodyChunks), false);
    });
    req.resume();
  }
});


/**
 * Handle WebSocket / Socket.IO Upgrade Requests
 */
server.on('upgrade', (req, socket, head) => {

  const { backend } = selectBackend(req);

  const proxySocket = net.connect(backend.port, backend.host, () => {
    let reqRaw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      reqRaw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    reqRaw += `X-Served-By: ${backend.id}\r\n`;
    reqRaw += '\r\n';

    proxySocket.write(reqRaw);
    if (head && head.length > 0) proxySocket.write(head);

    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on('error', (err) => {
    socket.destroy();
  });

  socket.on('error', () => {
    proxySocket.destroy();
  });
});

process.on('uncaughtException', (err) => {
  console.error('🛡️ [LB CRASH PROTECTION] Uncaught Exception:', err?.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [LB CRASH PROTECTION] Unhandled Rejection:', reason);
});

/**
 * Expose management / programmatic start functions
 */
function startLoadBalancer(port = LB_PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`⚖️ Iskolar Load Balancer running on http://127.0.0.1:${port}`);
      console.log(`   -> Target 1: http://${BACKENDS[0].host}:${BACKENDS[0].port} (${BACKENDS[0].id})`);
      console.log(`   -> Target 2: http://${BACKENDS[1].host}:${BACKENDS[1].port} (${BACKENDS[1].id})`);
      resolve(server);
    });
  });
}

function stopLoadBalancer() {
  clearInterval(healthInterval);
  return new Promise((resolve) => server.close(resolve));
}

if (require.main === module) {
  startLoadBalancer();
  setInterval(() => {}, 10000);
}

module.exports = {
  server,
  BACKENDS,
  probeBackend,
  startLoadBalancer,
  stopLoadBalancer,
};

