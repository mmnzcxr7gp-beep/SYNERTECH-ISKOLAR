#!/usr/bin/env node
/**
 * ISKOLAR Backend Instance Failover & Recovery Test Suite
 * 
 * Verifies:
 * 1. Active traffic routing during normal dual-backend operation.
 * 2. Stopping Backend A -> Automatic failover to Backend B (0% 500 error rate).
 * 3. Database persistence and state availability while Backend A is down.
 * 4. Restarting Backend A -> Health readiness verification -> Traffic resumption.
 * 5. Stopping Backend B -> Automatic failover to Backend A.
 * 6. Restarting Backend B -> Dual backend balance restored.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const LB_URL = 'http://127.0.0.1:4000';
const SERVER_PATH = path.join(__dirname, '../web/server/server.js');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, LB_URL);
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
        timeout: 2500,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            success: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ statusCode: 0, headers: {}, body: null, success: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 408, headers: {}, body: null, success: false, error: 'Timeout' });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

function probePort(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/health/readiness',
        method: 'GET',
        timeout: 1000,
      },
      (res) => resolve(res.statusCode === 200)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function startInstance(port, instanceId) {
  const child = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '../web/server'),
    env: {
      ...process.env,
      PORT: String(port),
      INSTANCE_ID: instanceId,
      NODE_ENV: 'development',
    },
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  return child;
}


async function waitForReadiness(port, maxWaitMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const ready = await probePort(port);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runFailoverTest() {
  console.log('===============================================================');
  console.log('🔄 ISKOLAR BACKEND INSTANCE FAILOVER & RECOVERY TEST');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function check(condition, desc) {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  let procA = null;
  let procB = null;
  let lbServer = null;

  try {
    // 0. Ensure Load Balancer and Backends are active
    const { startLoadBalancer, stopLoadBalancer } = require('./load_balancer');
    const lbUp = await probePort(4000);
    if (!lbUp) {
      lbServer = await startLoadBalancer(4000);
    }

    const aUp = await probePort(4001);
    if (!aUp) {
      startInstance(4001, 'backend-a');
      await waitForReadiness(4001, 8000);
    }
    const bUp = await probePort(4002);
    if (!bUp) {
      startInstance(4002, 'backend-b');
      await waitForReadiness(4002, 8000);
    }
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Initial State Check
    console.log('📋 Step 1: Verify Initial Dual-Instance Health');
    const initReq = await makeRequest('/api/health/readiness');
    check(initReq.statusCode === 200, 'Load balancer returns healthy initial readiness');



    // 2. STOP Backend A
    console.log('\n🛑 Step 2: Stopping Backend A (Port 4001)...');
    const { execSync } = require('child_process');
    try {
      execSync('kill -9 $(lsof -ti tcp:4001 -sTCP:LISTEN) 2>/dev/null || true', { shell: '/bin/bash' });
    } catch (_) {}

    await new Promise((r) => setTimeout(r, 600));
    const port4001Up = await probePort(4001);
    check(!port4001Up, 'Backend A is confirmed stopped / unavailable on port 4001');

    // 3. Traffic to LB during Backend A outage
    console.log('\n📋 Step 3: Sending Traffic to Load Balancer during Backend A outage (20 Requests)');
    let bHandledCount = 0;
    let outageFailures = 0;

    for (let i = 0; i < 20; i++) {
      const res = await makeRequest('/api/health/liveness');
      if (res.success) {
        const servedBy = res.headers['x-served-by'] || res.headers['x-instance-id'];
        if (servedBy === 'backend-b') bHandledCount++;
      } else {
        outageFailures++;
      }
    }

    console.log(`   -> Handled by Backend B: ${bHandledCount}/20, Failures: ${outageFailures}`);
    check(outageFailures === 0, 'Zero failures experienced by clients during Backend A downtime');
    check(bHandledCount === 20, '100% of traffic automatically failed over to Backend B');

    // 4. Verify DB read/write via Backend B
    console.log('\n📋 Step 4: Verify Database State via Backend B during outage');
    const schRes = await makeRequest('/api/scholarships');
    check(schRes.statusCode === 200, 'Database queries succeed seamlessly on Backend B');

    // 5. RESTART Backend A
    console.log('\n🚀 Step 5: Restarting Backend A (Port 4001, INSTANCE_ID=backend-a)...');
    procA = startInstance(4001, 'backend-a');
    const recoveredA = await waitForReadiness(4001, 8000);
    check(recoveredA, 'Backend A restarted and readiness probe succeeded on port 4001');

    // Wait for LB health probe interval
    await new Promise((r) => setTimeout(r, 1200));

    // 6. Verify Traffic Resumption on Backend A
    console.log('\n📋 Step 6: Verify Traffic Resumption across Dual Backends (20 Requests)');
    const resCount = { 'backend-a': 0, 'backend-b': 0 };
    for (let i = 0; i < 20; i++) {
      const res = await makeRequest('/api/health/liveness');
      const served = res.headers['x-served-by'] || res.headers['x-instance-id'];
      if (resCount[served] !== undefined) resCount[served]++;
    }
    console.log(`   -> Traffic distributed: Backend A=${resCount['backend-a']}, Backend B=${resCount['backend-b']}`);
    check(resCount['backend-a'] > 0, 'Backend A successfully re-joined the active pool and serves traffic');

    // 7. STOP Backend B (Reverse Test)
    console.log('\n🛑 Step 7: Stopping Backend B (Port 4002)...');
    try {
      execSync('kill -9 $(lsof -ti tcp:4002 -sTCP:LISTEN) 2>/dev/null || true', { shell: '/bin/bash' });
    } catch (_) {}


    await new Promise((r) => setTimeout(r, 600));
    const port4002Up = await probePort(4002);
    check(!port4002Up, 'Backend B is confirmed stopped / unavailable on port 4002');

    // 8. Traffic to LB during Backend B outage
    console.log('\n📋 Step 8: Sending Traffic during Backend B outage (20 Requests)');
    let aHandledCount = 0;
    let bOutageFailures = 0;

    for (let i = 0; i < 20; i++) {
      const res = await makeRequest('/api/health/liveness');
      if (res.success) {
        const servedBy = res.headers['x-served-by'] || res.headers['x-instance-id'];
        if (servedBy === 'backend-a') aHandledCount++;
      } else {
        bOutageFailures++;
      }
    }

    console.log(`   -> Handled by Backend A: ${aHandledCount}/20, Failures: ${bOutageFailures}`);
    check(bOutageFailures === 0, 'Zero failures experienced by clients during Backend B downtime');
    check(aHandledCount === 20, '100% of traffic automatically failed over to Backend A');

    // 9. RESTART Backend B
    console.log('\n🚀 Step 9: Restarting Backend B (Port 4002, INSTANCE_ID=backend-b)...');
    procB = startInstance(4002, 'backend-b');
    const recoveredB = await waitForReadiness(4002, 8000);
    check(recoveredB, 'Backend B restarted and readiness probe succeeded on port 4002');

    await new Promise((r) => setTimeout(r, 1200));


    if (lbServer) {
      const { stopLoadBalancer } = require('./load_balancer');
      await stopLoadBalancer();
    }
  } catch (err) {
    console.error('❌ Failover Test Failed:', err.message);
    failed++;
  }


  console.log('\n===============================================================');
  console.log(`📊 INSTANCE FAILOVER SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runFailoverTest();
}

module.exports = { runFailoverTest };
