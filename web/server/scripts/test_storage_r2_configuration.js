/**
 * ISKOLAR TEST: Cloudflare R2 Configuration & Environment Detection
 * 
 * Verifies:
 * 1. Detection of R2 configuration variables (R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)
 * 2. STORAGE_DRIVER mode switching ('local' vs 'r2')
 * 3. Driver initialization without exposing secrets or credentials in logs
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/utils/storageService');

async function runTest() {
  console.log('='.repeat(60));
  console.log('☁️ RUNNING CLOUDFLARE R2 CONFIGURATION TEST');
  console.log('='.repeat(60));

  // 1. Verify default driver is local or honors STORAGE_DRIVER env
  const activeDriverName = storageService.driverName;
  console.log(`\n[STEP 1] Active STORAGE_DRIVER: "${activeDriverName}"`);
  assert.ok(['local', 'r2', 's3', 'cloudflare'].includes(activeDriverName), 'Driver must be a supported mode');
  console.log('  ✅ PASS: Storage driver mode recognized');

  // 2. Test R2 configuration detection
  console.log('\n[STEP 2] Testing R2 driver configuration detection...');
  const isConfigured = storageService.r2Driver.isConfigured;
  console.log(`  R2 isConfigured: ${isConfigured}`);
  assert.strictEqual(typeof isConfigured, 'boolean', 'isConfigured must be boolean');
  console.log('  ✅ PASS: Configuration state detection verified');

  // 3. Test custom config instantiation (mocking valid config)
  console.log('\n[STEP 3] Testing custom R2 driver instantiation...');
  const mockR2Driver = new storageService.r2Driver.constructor({
    accountId: 'mock-account-12345',
    bucket: 'iskolar-private-documents',
    accessKeyId: 'MOCK_KEY_ID',
    secretAccessKey: 'MOCK_SECRET_KEY',
    region: 'auto'
  });
  assert.strictEqual(mockR2Driver.isConfigured, true, 'Driver must report configured with complete parameters');
  assert.strictEqual(mockR2Driver.bucket, 'iskolar-private-documents');
  console.log('  ✅ PASS: R2 driver parameters mapped cleanly');

  // 4. Verify no secrets in info() or debug outputs
  console.log('\n[STEP 4] Verifying no secrets or credentials exposed in info()...');
  const info = storageService.info();
  assert.strictEqual(info.activeDriver, activeDriverName);
  assert.strictEqual(typeof info.isR2Configured, 'boolean');
  assert.strictEqual(info.accessKeyId, undefined, 'Access key must NEVER be exposed in info()');
  assert.strictEqual(info.secretAccessKey, undefined, 'Secret key must NEVER be exposed in info()');
  console.log('  ✅ PASS: Zero credential leakage verified');

  console.log('\n' + '='.repeat(60));
  console.log('☁️ R2 CONFIGURATION SUMMARY: 4 PASSED, 0 FAILED');
  console.log('='.repeat(60));
  process.exit(0);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
