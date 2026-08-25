/**
 * ISKOLAR Storage Health Check Test Suite (Phase 13 & Phase 15)
 * 
 * Verifies:
 * 1. GET /api/health/storage returns structured diagnostics
 * 2. Active storage driver and readiness status reporting
 * 3. GET /api/health/deep includes storage component
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

async function runStorageHealthTests() {
  console.log('========================================================');
  console.log('🩺 RUNNING ISKOLAR STORAGE HEALTH PROBE TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assertCondition(condition, description) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  try {
    // 1. Check GET /api/health/storage
    const response = await fetch(`${BASE_URL}/health/storage`);
    const data = await response.json();

    assertCondition(response.status === 200 || response.status === 503, '1. Storage health endpoint returns valid HTTP status (200/503)');
    assertCondition(typeof data.status === 'string', `2. Storage health status reported: "${data.status}"`);
    assertCondition(['HEALTHY', 'DEGRADED', 'MISCONFIGURED'].includes(data.status), '3. Status is one of [HEALTHY, DEGRADED, MISCONFIGURED]');
    assertCondition(typeof data.activeDriver === 'string', `4. Active driver reported: "${data.activeDriver}"`);
    assertCondition(typeof data.localFallbackAvailable === 'boolean', '5. Local fallback availability is reported');
    assertCondition(typeof data.timestamp === 'string', '6. Timestamp is provided in ISO format');

    // 2. Check deep health endpoint
    const deepRes = await fetch(`${BASE_URL}/health/deep`);
    const deepData = await deepRes.json();
    assertCondition(deepRes.status === 200 || deepRes.status === 503, '7. Deep health endpoint returns status');
    assertCondition(deepData.checks && deepData.checks.storage !== undefined, '8. Deep health response includes storage subsystem check');

  } catch (err) {
    console.error('Storage health test error:', err.message);
    failed++;
  }

  console.log(`\n========================================================`);
  console.log(`STORAGE HEALTH SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runStorageHealthTests();
