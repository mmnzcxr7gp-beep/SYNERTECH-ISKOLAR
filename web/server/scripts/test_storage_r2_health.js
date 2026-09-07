/**
 * ISKOLAR TEST: Storage Health Check Subsystem
 * 
 * Verifies:
 * 1. Health check interface returns: { driver, configured, reachable, readable, writable, status }
 * 2. Allowed statuses: HEALTHY, DEGRADED, MISCONFIGURED, UNAVAILABLE
 * 3. Zero credential leakage in health check output
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/utils/storageService');

async function runTest() {
  console.log('='.repeat(60));
  console.log('☁️ RUNNING STORAGE HEALTH CHECK TEST');
  console.log('='.repeat(60));

  // 1. Check active driver health
  console.log('\n[STEP 1] Running storageService.healthCheck()...');
  const health = await storageService.healthCheck();
  console.log('  Health Result:', health);

  // 2. Validate fields
  assert.ok(['local', 'r2'].includes(health.driver), 'driver must be local or r2');
  assert.strictEqual(typeof health.configured, 'boolean', 'configured must be boolean');
  assert.strictEqual(typeof health.reachable, 'boolean', 'reachable must be boolean');
  assert.strictEqual(typeof health.readable, 'boolean', 'readable must be boolean');
  assert.strictEqual(typeof health.writable, 'boolean', 'writable must be boolean');
  assert.ok(
    ['HEALTHY', 'DEGRADED', 'MISCONFIGURED', 'UNAVAILABLE'].includes(health.status),
    `status "${health.status}" must be one of allowed statuses`
  );
  console.log('  ✅ PASS: Health check payload matches strict schema');

  // 3. Verify zero credential leakage
  console.log('\n[STEP 2] Verifying zero credential or secret leakage...');
  const disallowedKeys = ['accessKeyId', 'secretAccessKey', 'password', 'token', 'key', 'endpoint', 'accountId'];
  for (const key of disallowedKeys) {
    assert.strictEqual(health[key], undefined, `Health report must NOT expose "${key}"`);
  }
  console.log('  ✅ PASS: No credentials, account IDs, or private URLs exposed');

  // 4. Test mock unconfigured R2 health report
  console.log('\n[STEP 3] Testing unconfigured R2 health report...');
  const mockUnconfiguredR2 = new storageService.r2Driver.constructor({ bucket: '' });
  const r2Health = await mockUnconfiguredR2.checkHealth();
  assert.strictEqual(r2Health.driver, 'r2');
  assert.strictEqual(r2Health.status, 'MISCONFIGURED');
  assert.strictEqual(r2Health.configured, false);
  console.log('  ✅ PASS: Unconfigured R2 correctly reports MISCONFIGURED status');

  console.log('\n' + '='.repeat(60));
  console.log('☁️ STORAGE HEALTH CHECK SUMMARY: 4 PASSED, 0 FAILED');
  console.log('='.repeat(60));
  process.exit(0);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
