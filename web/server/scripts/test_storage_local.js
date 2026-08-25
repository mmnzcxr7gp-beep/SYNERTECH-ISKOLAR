/**
 * ISKOLAR Storage Test Suite: Local Storage Driver & Validation
 * 
 * Verifies:
 * 1. File signature & magic bytes validation (PDF, PNG, JPEG, WebP)
 * 2. Rejection of executables, scripts, archives, and disguised files
 * 3. File upload via StorageService (anonymous UUID path generation)
 * 4. File download (buffer & stream)
 * 5. File existence, metadata, and deletion
 * 6. File replacement and versioning
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_TYPE = 'local';

const storageService = require('../src/utils/storageService');
const { validateFile } = require('../src/utils/fileValidation');

async function runLocalStorageTests() {
  console.log('========================================================');
  console.log('📦 RUNNING ISKOLAR LOCAL STORAGE & VALIDATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        return res
          .then(() => {
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ [FAIL] ${name}`);
            console.error(`     Error: ${err.message}`);
            failed++;
          });
      }
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Valid PDF buffer (%PDF- header)
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nxref\n0 1\ntrailer<</Size 1/Root 1 0 R>>\nstartxref\n9\n%%EOF');
  // 2. Valid PNG buffer (PNG header)
  const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  // 3. Valid JPEG buffer (FF D8 FF)
  const validJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  // 4. Executable disguised as PDF (MZ header)
  const maliciousExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
  // 5. Shell script disguised as PNG
  const scriptDisguisedBuffer = Buffer.from('#!/bin/bash\necho "pwned"\n');
  // 6. Zip archive disguised as PDF
  const zipDisguisedBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

  // Validation tests
  test('1. Valid PDF file signature passes validation with sha256 hash', () => {
    const res = validateFile(validPdfBuffer, 'transcript.pdf', 'application/pdf');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.mimeType, 'application/pdf');
    assert.strictEqual(typeof res.hash, 'string');
    assert.strictEqual(res.hash.length, 64);
  });

  test('2. Valid PNG file signature passes validation', () => {
    const res = validateFile(validPngBuffer, 'id_card.png', 'image/png');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.mimeType, 'image/png');
  });

  test('3. Executable binary disguised as .pdf is rejected', () => {
    const res = validateFile(maliciousExeBuffer, 'payload.pdf', 'application/pdf');
    assert.strictEqual(res.valid, false);
    assert(res.error.includes('Executable'));
  });

  test('4. Shell script disguised as .png is rejected', () => {
    const res = validateFile(scriptDisguisedBuffer, 'innocent.png', 'image/png');
    assert.strictEqual(res.valid, false);
    assert(res.error.includes('script') || res.error.includes('signature'));
  });

  test('5. ZIP archive disguised as .pdf is rejected', () => {
    const res = validateFile(zipDisguisedBuffer, 'doc.pdf', 'application/pdf');
    assert.strictEqual(res.valid, false);
    assert(res.error.includes('archive'));
  });

  test('6. Empty (0-byte) file is rejected', () => {
    const res = validateFile(Buffer.alloc(0), 'empty.pdf', 'application/pdf');
    assert.strictEqual(res.valid, false);
  });

  // StorageService upload/download/replace tests
  let uploadedStoredKey = null;

  await test('7. StorageService uploads file using anonymous UUID path (no PII)', async () => {
    const uploadRes = await storageService.uploadFile({
      buffer: validPdfBuffer,
      originalName: 'Student_Transcript_Juan_Dela_Cruz.pdf',
      mimeType: 'application/pdf',
      applicationId: 42,
      studentId: 101,
    });

    assert.strictEqual(uploadRes.storageDriver, 'local');
    assert(uploadRes.storedKey.startsWith('applications/42/'));
    assert(!uploadRes.storedKey.includes('Juan'));
    assert(!uploadRes.storedKey.includes('Cruz'));
    assert(uploadRes.storedKey.endsWith('.pdf'));
    uploadedStoredKey = uploadRes.storedKey;
  });

  await test('8. StorageService checks file existence and retrieves metadata', async () => {
    const exists = await storageService.fileExists(uploadedStoredKey);
    assert.strictEqual(exists, true);

    const meta = await storageService.getMetadata(uploadedStoredKey);
    assert.strictEqual(meta.size, validPdfBuffer.length);
    assert.strictEqual(meta.driver, 'local');
  });

  await test('9. StorageService downloads file buffer and stream', async () => {
    const download = await storageService.downloadFile(uploadedStoredKey);
    assert(Buffer.isBuffer(download.buffer));
    assert.strictEqual(download.buffer.toString(), validPdfBuffer.toString());
    assert(download.stream);
  });

  await test('10. StorageService replaces file and produces new version key', async () => {
    const replaceRes = await storageService.replaceFile({
      oldStoredKey: uploadedStoredKey,
      buffer: validPngBuffer,
      originalName: 'Replacement_ID.png',
      mimeType: 'image/png',
      applicationId: 42,
      studentId: 101,
      reason: 'Original document was unreadable',
    });

    assert(replaceRes.storedKey.startsWith('applications/42/'));
    assert.strictEqual(replaceRes.previousStoredKey, uploadedStoredKey);
    assert.strictEqual(replaceRes.replacementReason, 'Original document was unreadable');
    assert.notStrictEqual(replaceRes.storedKey, uploadedStoredKey);

    // Clean up replaced file
    await storageService.deleteFile(replaceRes.storedKey);
  });

  await test('11. StorageService deletes file cleanly', async () => {
    await storageService.deleteFile(uploadedStoredKey);
    const existsAfter = await storageService.fileExists(uploadedStoredKey);
    assert.strictEqual(existsAfter, false);
  });

  console.log(`\n========================================================`);
  console.log(`LOCAL STORAGE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runLocalStorageTests();
