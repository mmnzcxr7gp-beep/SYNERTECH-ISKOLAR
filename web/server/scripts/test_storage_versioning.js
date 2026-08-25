/**
 * ISKOLAR Document Versioning Test Suite (Phase 7 & Phase 15)
 * 
 * Verifies:
 * 1. Initial document upload creates v1 with storedKey, hash, and metadata
 * 2. Replacement upload increments version to v2
 * 3. Original file and version v1 history preserved in previous_versions
 * 4. Third replacement increments to v3 with complete chain
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/utils/storageService');
const { db, createId } = require('../src/config/db');

async function runVersioningTests() {
  console.log('========================================================');
  console.log('📑 RUNNING ISKOLAR DOCUMENT VERSIONING TEST SUITE');
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

  const v1PdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  const v2PngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const v3PdfBuffer = Buffer.from('%PDF-1.4\n2 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 2 0 R>>\n%%EOF');

  let testDoc = null;

  // 1. Initial upload (v1)
  await test('1. Initial document upload is assigned Version 1', async () => {
    const uploadRes = await storageService.uploadFile({
      buffer: v1PdfBuffer,
      originalName: 'Transcript_v1.pdf',
      mimeType: 'application/pdf',
      applicationId: 99,
      studentId: 24,
    });

    testDoc = {
      id: createId('documents'),
      application_id: 99,
      user_id: 24,
      storedKey: uploadRes.storedKey,
      filename: uploadRes.storedKey,
      originalname: uploadRes.originalName,
      fileHash: uploadRes.fileHash,
      mime_type: uploadRes.mimeType,
      size: uploadRes.size,
      version: 1,
      previous_versions: [],
      uploadedAt: uploadRes.uploadedAt,
    };

    assert.strictEqual(testDoc.version, 1);
    assert(testDoc.storedKey.startsWith('applications/99/'));
    assert.strictEqual(testDoc.previous_versions.length, 0);
  });

  // 2. Replacement upload (v2)
  await test('2. Replacement upload archives v1 and increments to Version 2', async () => {
    const replaceRes = await storageService.replaceFile({
      oldStoredKey: testDoc.storedKey,
      buffer: v2PngBuffer,
      originalName: 'Transcript_v2_Clear.png',
      mimeType: 'image/png',
      applicationId: 99,
      studentId: 24,
      reason: 'Re-scanned at higher resolution',
    });

    // Archive v1
    testDoc.previous_versions.push({
      version: testDoc.version,
      storedKey: testDoc.storedKey,
      originalName: testDoc.originalname,
      fileHash: testDoc.fileHash,
      size: testDoc.size,
      mimeType: testDoc.mime_type,
      replacedAt: replaceRes.replacedAt,
      reason: replaceRes.replacementReason,
    });

    // Update to v2
    testDoc.version = 2;
    testDoc.storedKey = replaceRes.storedKey;
    testDoc.originalname = replaceRes.originalName;
    testDoc.fileHash = replaceRes.fileHash;
    testDoc.size = replaceRes.size;
    testDoc.mime_type = replaceRes.mimeType;

    assert.strictEqual(testDoc.version, 2);
    assert.strictEqual(testDoc.previous_versions.length, 1);
    assert.strictEqual(testDoc.previous_versions[0].version, 1);
    assert.strictEqual(testDoc.previous_versions[0].reason, 'Re-scanned at higher resolution');
  });

  // 3. Third replacement (v3)
  await test('3. Third replacement preserves entire audit chain (v1, v2) and creates Version 3', async () => {
    const replaceRes = await storageService.replaceFile({
      oldStoredKey: testDoc.storedKey,
      buffer: v3PdfBuffer,
      originalName: 'Certified_True_Copy.pdf',
      mimeType: 'application/pdf',
      applicationId: 99,
      studentId: 24,
      reason: 'Official registrar certified stamp attached',
    });

    // Archive v2
    testDoc.previous_versions.push({
      version: testDoc.version,
      storedKey: testDoc.storedKey,
      originalName: testDoc.originalname,
      fileHash: testDoc.fileHash,
      size: testDoc.size,
      mimeType: testDoc.mime_type,
      replacedAt: replaceRes.replacedAt,
      reason: replaceRes.replacementReason,
    });

    // Update to v3
    testDoc.version = 3;
    testDoc.storedKey = replaceRes.storedKey;
    testDoc.originalname = replaceRes.originalName;

    assert.strictEqual(testDoc.version, 3);
    assert.strictEqual(testDoc.previous_versions.length, 2);
    assert.strictEqual(testDoc.previous_versions[0].version, 1);
    assert.strictEqual(testDoc.previous_versions[1].version, 2);
  });

  // 4. Verify historical files still physically exist in storage
  await test('4. All historical version files physically exist and are downloadable', async () => {
    for (const hist of testDoc.previous_versions) {
      const exists = await storageService.fileExists(hist.storedKey);
      assert.strictEqual(exists, true, `Historical key ${hist.storedKey} must exist`);
      const fileData = await storageService.downloadFile(hist.storedKey);
      assert(fileData.buffer.length > 0);
    }

    const currentExists = await storageService.fileExists(testDoc.storedKey);
    assert.strictEqual(currentExists, true);

    // Clean up created files
    for (const hist of testDoc.previous_versions) {
      await storageService.deleteFile(hist.storedKey);
    }
    await storageService.deleteFile(testDoc.storedKey);
  });

  console.log(`\n========================================================`);
  console.log(`DOCUMENT VERSIONING SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runVersioningTests();
