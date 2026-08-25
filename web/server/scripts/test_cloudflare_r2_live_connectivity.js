/**
 * Comprehensive Live Cloudflare R2 End-to-End Functional Test
 * 
 * Verifies live connection against Cloudflare R2 bucket:
 * 1. Health check & S3 Client credentials validation
 * 2. Uploading binary documents (PDF, PNG) to Cloudflare R2
 * 3. File existence verification
 * 4. Object metadata inspection (ContentLength, ContentType, LastModified)
 * 5. Document download & cryptographic SHA-256 hash verification
 * 6. Document replacement with version incrementing (v1 -> v2)
 * 7. Clean object deletion from Cloudflare R2 bucket
 * 8. Confirmation of deletion (404 / NotFound handling)
 */

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const storageService = require('../src/utils/storageService');

async function runLiveR2Test() {
  console.log('================================================================');
  console.log('🚀 ISKOLAR LIVE CLOUDFLARE R2 BUCKET CONNECTIVITY VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(step, name, fn) {
    try {
      console.log(`\n[STEP ${step}] ${name}...`);
      await fn();
      console.log(`  ✅ [PASS] Step ${step}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] Step ${step}: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Check
  await test(1, 'Cloudflare R2 Health Check & Bucket Reachability', async () => {
    const health = await storageService.healthCheck();
    console.log('     Active Driver:', health.driver);
    console.log('     Configured:', health.configured);
    console.log('     Reachable:', health.reachable);
    console.log('     Status:', health.status);
    console.log('     Message:', health.message);

    assert.strictEqual(health.driver, 'r2');
    assert.strictEqual(health.configured, true);
    assert.strictEqual(health.reachable, true);
    assert.strictEqual(health.status, 'HEALTHY');
  });

  // 2. Upload PDF
  const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  const expectedPdfHash = crypto.createHash('sha256').update(testPdfBuffer).digest('hex');
  let pdfUploadResult = null;

  await test(2, 'Upload PDF document to Cloudflare R2 bucket', async () => {
    pdfUploadResult = await storageService.uploadFile({
      buffer: testPdfBuffer,
      originalName: 'Iskolar_Official_Transcript.pdf',
      mimeType: 'application/pdf',
      applicationId: 'live_test_app',
      documentId: 'transcript_doc',
      version: 1,
    });

    console.log('     Stored Key:', pdfUploadResult.storedKey);
    console.log('     Driver:', pdfUploadResult.storageDriver);
    console.log('     File Hash:', pdfUploadResult.fileHash);
    console.log('     File Size:', pdfUploadResult.size, 'bytes');

    assert.strictEqual(pdfUploadResult.storageDriver, 'r2');
    assert.strictEqual(pdfUploadResult.fileHash, expectedPdfHash);
    assert.strictEqual(pdfUploadResult.size, testPdfBuffer.length);
    assert(pdfUploadResult.storedKey.includes('applications/live_test_app/documents/transcript_doc/v1/'));
  });

  // 3. Check File Exists
  await test(3, 'Verify file existence in Cloudflare R2 bucket', async () => {
    const exists = await storageService.fileExists(pdfUploadResult.storedKey);
    assert.strictEqual(exists, true, 'Uploaded file must exist in R2 bucket');
  });

  // 4. Inspect Metadata
  await test(4, 'Inspect object metadata from Cloudflare R2', async () => {
    const meta = await storageService.getMetadata(pdfUploadResult.storedKey);
    console.log('     Metadata Size:', meta.size);
    console.log('     Metadata MIME Type:', meta.mimeType);
    console.log('     Last Modified:', meta.lastModified);

    assert.strictEqual(meta.size, testPdfBuffer.length);
    assert.strictEqual(meta.mimeType, 'application/pdf');
    assert.strictEqual(meta.driver, 'r2');
  });

  // 5. Download and Cryptographic Hash Check
  await test(5, 'Download object and verify byte-for-byte integrity & SHA-256 hash', async () => {
    const downloaded = await storageService.downloadFile(pdfUploadResult.storedKey);
    const downloadedHash = crypto.createHash('sha256').update(downloaded.buffer).digest('hex');

    assert.strictEqual(downloaded.buffer.length, testPdfBuffer.length);
    assert.strictEqual(downloadedHash, expectedPdfHash);
    assert.strictEqual(downloaded.buffer.toString('utf8'), testPdfBuffer.toString('utf8'));
    console.log('     Downloaded Hash Matches Expected SHA-256 Hash Perfectly');
  });

  // 6. Upload Replacement Document (Versioning v2)
  const v2PdfBuffer = Buffer.from('%PDF-1.4\n% Updated Document Content v2\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  let v2Result = null;

  await test(6, 'Upload document replacement with version increment (v2)', async () => {
    v2Result = await storageService.replaceFile({
      oldStoredKey: pdfUploadResult.storedKey,
      buffer: v2PdfBuffer,
      originalName: 'Iskolar_Official_Transcript_v2.pdf',
      mimeType: 'application/pdf',
      applicationId: 'live_test_app',
      documentId: 'transcript_doc',
      version: 2,
      reason: 'Resubmitted updated official transcript',
    });

    console.log('     v2 Stored Key:', v2Result.storedKey);
    console.log('     Previous Key:', v2Result.previousStoredKey);
    console.log('     Replacement Reason:', v2Result.replacementReason);

    assert.strictEqual(v2Result.version, 2);
    assert(v2Result.storedKey.includes('/v2/'));
    assert.strictEqual(v2Result.previousStoredKey, pdfUploadResult.storedKey);
  });

  // 7. Verify both v1 and v2 coexist in R2
  await test(7, 'Verify both v1 and v2 objects coexist in R2 without overwriting', async () => {
    const v1Exists = await storageService.fileExists(pdfUploadResult.storedKey);
    const v2Exists = await storageService.fileExists(v2Result.storedKey);

    assert.strictEqual(v1Exists, true, 'v1 object must still exist');
    assert.strictEqual(v2Exists, true, 'v2 object must exist');
  });

  // 8. Delete test objects
  await test(8, 'Delete test objects from Cloudflare R2 bucket', async () => {
    await storageService.deleteFile(pdfUploadResult.storedKey);
    await storageService.deleteFile(v2Result.storedKey);

    const v1After = await storageService.fileExists(pdfUploadResult.storedKey);
    const v2After = await storageService.fileExists(v2Result.storedKey);

    assert.strictEqual(v1After, false, 'v1 object must no longer exist after deletion');
    assert.strictEqual(v2After, false, 'v2 object must no longer exist after deletion');
    console.log('     Test objects cleanly purged from R2');
  });

  console.log('\n================================================================');
  console.log(`🎉 LIVE CLOUDFLARE R2 TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runLiveR2Test().catch((err) => {
  console.error('Fatal live test failure:', err);
  process.exit(1);
});
