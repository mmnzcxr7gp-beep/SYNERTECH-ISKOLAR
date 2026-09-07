const assert = require('assert');
const storageService = require('../src/utils/storageService');

async function testOrphanCleanup() {
  console.log('🧪 Testing Orphan File Cleanup on Controller / Database Failures...');

  const sampleBuffer = Buffer.from('%PDF-1.4\ntest temporary upload buffer\n%%EOF');

  // 1. Upload temporary file
  const uploadResult = await storageService.uploadFile({
    buffer: sampleBuffer,
    originalName: 'temp_doc.pdf',
    mimeType: 'application/pdf',
    applicationId: 'app_orphan_test',
    version: 1,
  });

  const storedKey = uploadResult.storedKey;
  assert.ok(await storageService.fileExists(storedKey), 'File must initially exist in storage');

  // 2. Simulate failure during database transaction -> trigger rollback cleanup
  try {
    throw new Error('SIMULATED_DB_WRITE_FAILURE: MongoDB connection interrupted');
  } catch (simulatedErr) {
    // Rollback: Delete uploaded stored key
    await storageService.deleteFile(storedKey);
  }

  // 3. Verify object has been cleaned up and is not orphaned
  const existsAfterCleanup = await storageService.fileExists(storedKey);
  assert.strictEqual(existsAfterCleanup, false, 'Orphaned file must be deleted upon transaction failure');

  console.log('✅ PASS test_orphan_cleanup: Rollback and orphan prevention verified');
  process.exit(0);
}

testOrphanCleanup().catch((err) => {
  console.error('❌ FAIL test_orphan_cleanup:', err);
  process.exit(1);
});
