/**
 * ISKOLAR Storage Test Suite: Cloudflare R2 Storage Adapter Readiness
 * 
 * Verifies:
 * 1. Cloudflare R2 Driver environment variable configuration detection
 * 2. Graceful error handling when R2 credentials are not set (no crash, safe response)
 * 3. Health check status reporting (MISCONFIGURED when unset vs HEALTHY)
 * 4. Transparent local fallback for cross-driver asset resolution
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const storageService = require('../src/utils/storageService');

async function runR2StorageTests() {
  console.log('========================================================');
  console.log('☁️ RUNNING ISKOLAR CLOUDFLARE R2 DRIVER READINESS SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Check R2 driver configuration status
  await test('1. R2 Driver reports configuration state accurately based on environment', async () => {
    const isConfigured = storageService.r2Driver.isConfigured;
    console.log(`     R2 Configured: ${isConfigured}`);
    assert(typeof isConfigured === 'boolean');
  });

  // 2. Test safe error handling when unconfigured
  await test('2. Unconfigured R2 upload attempts return safe error without crashing process', async () => {
    const mockUnconfiguredR2 = new storageService.r2Driver.constructor({
      bucket: '',
      endpoint: '',
    });

    let caught = false;
    try {
      await mockUnconfiguredR2.save({
        storedKey: 'test.pdf',
        buffer: Buffer.from('test'),
        mimeType: 'application/pdf',
      });
    } catch (err) {
      caught = true;
      assert(err.message.includes('not configured') || err.message.includes('missing'));
    }
    assert.strictEqual(caught, true, 'Must throw informative safe error without unhandled exception');
  });

  // 3. Health Check behavior on R2 driver
  await test('3. R2 Health check reports MISCONFIGURED status when credentials are unset', async () => {
    const mockR2 = new storageService.r2Driver.constructor({ bucket: '' });
    const health = await mockR2.checkHealth();
    assert.strictEqual(health.status, 'MISCONFIGURED');
    assert(health.message.includes('R2_BUCKET') || health.message.includes('missing'));
  });

  // 4. Local Driver Fallback
  await test('4. StorageService safely recovers local files when STORAGE_DRIVER is switched', async () => {
    const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const localUpload = await storageService.localDriver.save({
      storedKey: 'applications/test_fallback/sample.png',
      buffer: validPngBuffer,
      mimeType: 'image/png',
    });

    // Check that StorageService can read the local file regardless of driver state
    const readBack = await storageService.downloadFile(localUpload.storedKey);
    assert(Buffer.isBuffer(readBack.buffer));
    assert.strictEqual(readBack.buffer.length, validPngBuffer.length);

    // Clean up
    await storageService.localDriver.delete(localUpload.storedKey);
  });

  console.log(`\n========================================================`);
  console.log(`CLOUDFLARE R2 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runR2StorageTests();
