/**
 * ISKOLAR TEST: Cloudflare R2 Upload & Key Structure Verification
 * 
 * Verifies:
 * 1. File validation prior to upload (PDF, PNG, JPEG, WebP)
 * 2. Generated non-identifying object key structure: applications/{appId}/documents/{docId}/v{version}/{uuid}.{ext}
 * 3. Safe error thrown when R2 is unconfigured or unavailable without silent local fallback
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/utils/storageService');

async function runTest() {
  console.log('='.repeat(60));
  console.log('☁️ RUNNING CLOUDFLARE R2 UPLOAD & KEY GENERATION TEST');
  console.log('='.repeat(60));

  // 1. Verify object key generation format
  console.log('\n[STEP 1] Verifying non-identifying object key structure...');
  const sampleKey = storageService.generateObjectKey({
    applicationId: 65714,
    documentId: 68687,
    version: 1,
    extension: '.pdf'
  });
  console.log(`  Generated Object Key: "${sampleKey}"`);
  assert.match(
    sampleKey,
    /^applications\/65714\/documents\/68687\/v1\/[a-f0-9-]+\.pdf$/,
    'Object key must follow applications/{appId}/documents/{docId}/v{version}/{uuid}.pdf format'
  );
  assert.ok(!sampleKey.includes('juan'), 'Must contain zero PII');
  console.log('  ✅ PASS: Object key structure matches security standard with zero PII');

  // 2. Test file validation reject on invalid buffer
  console.log('\n[STEP 2] Verifying file validation before upload...');
  const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
  let rejected = false;
  try {
    await storageService.uploadFile({
      buffer: fakeExeBuffer,
      originalName: 'fake.pdf',
      mimeType: 'application/pdf',
      applicationId: 101,
      documentId: 202
    });
  } catch (err) {
    rejected = true;
    assert.ok(err.message.includes('Validation Failed') || err.message.includes('Executable'));
  }
  assert.strictEqual(rejected, true, 'Disguised executable must be rejected before storage');
  console.log('  ✅ PASS: File validation rejects dangerous files prior to upload');

  // 3. Test R2 upload handling when R2 driver is selected
  console.log('\n[STEP 3] Verifying R2 upload handling without silent fallback...');
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  
  if (storageService.r2Driver.isConfigured) {
    console.log('  R2 is configured — testing upload to bucket...');
    const result = await storageService.r2Driver.save({
      storedKey: sampleKey,
      buffer: validPdfBuffer,
      mimeType: 'application/pdf'
    });
    assert.strictEqual(result.driver, 'r2');
    console.log('  ✅ PASS: Real R2 upload succeeded');
  } else {
    console.log('  R2 is unconfigured — verifying safe error without crashing...');
    let threwSafeError = false;
    try {
      await storageService.r2Driver.save({
        storedKey: sampleKey,
        buffer: validPdfBuffer,
        mimeType: 'application/pdf'
      });
    } catch (err) {
      threwSafeError = true;
      assert.ok(err.message.includes('not configured') || err.message.includes('missing'));
    }
    assert.strictEqual(threwSafeError, true, 'Must throw informative error when R2 credentials are unset');
    console.log('  ✅ PASS: Safe error thrown on unconfigured R2 upload attempt');
  }

  console.log('\n' + '='.repeat(60));
  console.log('☁️ R2 UPLOAD SUMMARY: 3 PASSED, 0 FAILED');
  console.log('='.repeat(60));
  process.exit(0);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
