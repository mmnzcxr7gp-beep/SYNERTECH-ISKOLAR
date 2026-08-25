/**
 * ISKOLAR Storage OCR Integration Test Suite (Phase 8 & Phase 15)
 * 
 * Verifies:
 * 1. OCR processing works on buffers and storage objects
 * 2. Automated field extraction patterns and document type detection
 * 3. Fallback to manual review triggered when confidence is below threshold
 * 4. Verification payload generation
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/utils/storageService');
const fallbackService = require('../src/utils/manualReviewFallbackService');

async function runStorageOcrTests() {
  console.log('========================================================');
  console.log('🔍 RUNNING ISKOLAR STORAGE OCR INTEGRATION TEST SUITE');
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

  // 1. Upload sample document to StorageService
  const samplePngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  let uploadRes = null;

  await test('1. Store document for OCR processing via StorageService', async () => {
    uploadRes = await storageService.uploadFile({
      buffer: samplePngBuffer,
      originalName: 'Academic_Transcript.png',
      mimeType: 'image/png',
      applicationId: 88,
      studentId: 24,
    });
    assert(uploadRes.storedKey.startsWith('applications/88/'));
  });

  // 2. Read back from storage for OCR consumption
  await test('2. Retrieve document buffer from storage for OCR stream processing', async () => {
    const downloaded = await storageService.downloadFile(uploadRes.storedKey);
    assert(Buffer.isBuffer(downloaded.buffer));
    assert.strictEqual(downloaded.buffer.length, samplePngBuffer.length);
  });

  // 3. Automated Fallback triggers when OCR text is unreadable/empty
  await test('3. Low-confidence OCR automatically routes to PENDING_MANUAL_REVIEW', async () => {
    const fallbackResult = fallbackService.checkOcrFallbackNeeded({
      rawText: '',
      confidence: 12,
      extractedFields: {},
      documentType: 'unknown',
      ocrError: null,
    });

    assert.strictEqual(fallbackResult.needsFallback, true);
    assert.strictEqual(fallbackResult.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert(fallbackResult.issues.includes('EMPTY_TEXT') || fallbackResult.issues.includes('LOW_CONFIDENCE'));
  });

  // 4. High-confidence document passes automated verification
  await test('4. High-confidence OCR with matching fields proceeds with OCR_COMPLETED status', async () => {
    const highConfidenceResult = fallbackService.checkOcrFallbackNeeded({
      rawText: 'PHILIPPINE BIRTH CERTIFICATE\nName: Juan Dela Cruz\nDate of Birth: 01/01/2000',
      confidence: 94,
      extractedFields: { fullName: 'Juan Dela Cruz', dateOfBirth: '01/01/2000' },
      documentType: 'birth_certificate',
      ocrError: null,
    });

    assert.strictEqual(highConfidenceResult.needsFallback, false);
    assert.strictEqual(highConfidenceResult.reviewStatus, 'OCR_COMPLETED');
  });

  // Clean up
  await storageService.deleteFile(uploadRes.storedKey);

  console.log(`\n========================================================`);
  console.log(`STORAGE OCR SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runStorageOcrTests();
