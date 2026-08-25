#!/usr/bin/env node
/**
 * ISKOLAR Load Balancer Traffic Distribution Test
 * 
 * Verifies:
 * - Round-robin request distribution across Backend A (4001) and Backend B (4002)
 * - Session affinity / sticky session routing
 * - Request ID propagation (X-Request-Id)
 * - Load-balancer diagnostic headers (X-Load-Balancer, X-Served-By)
 * - Response latency statistics (min, max, avg, p95)
 * - Error rates under concurrency
 */

const http = require('http');

const LB_URL = process.env.LB_URL || 'http://127.0.0.1:4000';

function makeRequest(path, headers = {}) {
  const startTime = process.hrtime.bigint();
  return new Promise((resolve) => {
    const url = new URL(path, LB_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 3000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            durationMs,
            success: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      }
    );

    req.on('error', (err) => {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      resolve({
        statusCode: 0,
        headers: {},
        body: null,
        durationMs,
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      resolve({
        statusCode: 408,
        headers: {},
        body: null,
        durationMs,
        success: false,
        error: 'Timeout',
      });
    });

    req.end();
  });
}

async function runDistributionTest() {
  console.log('===============================================================');
  console.log('⚖️ ISKOLAR LOAD BALANCER DISTRIBUTION & METRICS TEST');
  console.log(`   Target: ${LB_URL}`);
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

  // 1. Basic Load Balancer Reachability & Diagnostic Headers
  console.log('📋 Test 1: Load Balancer Diagnostic Headers');
  const singleReq = await makeRequest('/api/health/liveness');
  check(singleReq.statusCode === 200, 'Health liveness probe returns HTTP 200');
  check(singleReq.headers['x-load-balancer'] === 'iskolar-local-lb-v1', 'X-Load-Balancer header present');
  check(!!singleReq.headers['x-served-By'] || !!singleReq.headers['x-served-by'], 'X-Served-By header present');
  check(!!singleReq.headers['x-request-id'], 'X-Request-Id header generated/forwarded');

  // 2. Round-Robin Distribution Test (50 sequential requests without session cookie)
  console.log('\n📋 Test 2: Round-Robin Distribution (50 Requests)');
  const distribution = { 'backend-a': 0, 'backend-b': 0, other: 0 };
  const latencies = [];

  for (let i = 0; i < 50; i++) {
    const res = await makeRequest('/api/health/readiness');
    const servedBy = res.headers['x-served-by'] || res.headers['x-instance-id'] || 'other';
    if (distribution[servedBy] !== undefined) {
      distribution[servedBy]++;
    } else {
      distribution.other++;
    }
    latencies.push(res.durationMs);
  }

  console.log(`   -> Backend A received: ${distribution['backend-a']} requests`);
  console.log(`   -> Backend B received: ${distribution['backend-b']} requests`);
  check(distribution['backend-a'] > 15, 'Backend A handled substantial portion of traffic');
  check(distribution['backend-b'] > 15, 'Backend B handled substantial portion of traffic');

  // Latency Metrics
  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0].toFixed(2);
  const maxLatency = latencies[latencies.length - 1].toFixed(2);
  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);

  console.log(`   -> Latency: Min=${minLatency}ms, Avg=${avgLatency}ms, P95=${p95Latency}ms, Max=${maxLatency}ms`);
  check(parseFloat(avgLatency) < 100, `Average latency is healthy (< 100ms, actual: ${avgLatency}ms)`);

  // 3. Concurrent Traffic Test (50 parallel requests)
  console.log('\n📋 Test 3: Concurrent Traffic Burst (50 Parallel Requests)');
  const burstPromises = [];
  for (let i = 0; i < 50; i++) {
    burstPromises.push(makeRequest('/api/scholarships'));
  }
  const burstResults = await Promise.all(burstPromises);
  const successCount = burstResults.filter((r) => r.success).length;
  const failureCount = burstResults.filter((r) => !r.success).length;

  console.log(`   -> Success: ${successCount}/50, Failures: ${failureCount}/50`);
  check(successCount === 50, 'All concurrent scholarship browsing requests succeeded without errors');

  // 4. Session Affinity / Sticky Session Test
  console.log('\n📋 Test 4: Session Affinity (Sticky Sessions)');
  const initialRes = await makeRequest('/api/health');
  const cookieHeader = initialRes.headers['set-cookie'];
  let cookieVal = '';
  if (cookieHeader) {
    cookieVal = Array.isArray(cookieHeader) ? cookieHeader[0].split(';')[0] : cookieHeader.split(';')[0];
  }

  if (cookieVal) {
    console.log(`   -> Assigned Sticky Cookie: ${cookieVal}`);
    const stickyServedBy = [];
    for (let i = 0; i < 10; i++) {
      const stickyRes = await makeRequest('/api/health', { Cookie: cookieVal });
      stickyServedBy.push(stickyRes.headers['x-served-by']);
    }
    const allSame = stickyServedBy.every((id) => id === stickyServedBy[0]);
    console.log(`   -> Sticky requests routed to: ${stickyServedBy[0]} (${stickyServedBy.length}/10 same instance)`);
    check(allSame, 'Session affinity strictly maintains sticky routing to the same backend instance');
  } else {
    console.log('   ℹ️ No session cookie returned; skipped cookie affinity check.');
  }

  console.log('\n===============================================================');
  console.log(`📊 LOAD BALANCER DISTRIBUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runDistributionTest();
}

module.exports = { runDistributionTest };
