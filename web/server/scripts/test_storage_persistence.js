/**
 * ISKOLAR Storage & Metadata Persistence Test Suite (Phase 6, Phase 15)
 * 
 * Verifies:
 * 1. Document metadata schema fields (documentId, studentId, applicationId, storedKey, storageDriver, fileHash, size, version, status, history)
 * 2. Cryptographic checksum validation between stored binary and database metadata
 * 3. Persistence and retrieval integrity across storage operations
 */

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/utils/storageService');
const { db, createId } = require('../src/config/db');

async function runPersistenceTests() {
  console.log('========================================================');
  console.log('💾 RUNNING ISKOLAR STORAGE PERSISTENCE & METADATA SUITE');
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

  const samplePdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
  const samplePdfBuffer = Buffer.from(samplePdfContent);
  const expectedHash = crypto.createHash('sha256').update(samplePdfBuffer).digest('hex');

  let testDocId = null;
  let storedKey = null;

  // 1. Upload and persist document
  await test('1. Upload file and persist full Document metadata record', async () => {
    const uploadRes = await storageService.uploadFile({
      buffer: samplePdfBuffer,
      originalName: 'Official_Transcript_Of_Records.pdf',
      mimeType: 'application/pdf',
      applicationId: 55,
      studentId: 24,
    });

    testDocId = createId('documents');
    storedKey = uploadRes.storedKey;

    const docRecord = {
      id: testDocId,
      documentId: String(testDocId),
      studentId: 24,
      providerId: 9,
      applicationId: 55,
      docType: 'Official Transcript of Records (TOR)',
      originalName: 'Official_Transcript_Of_Records.pdf',
      storedKey: uploadRes.storedKey,
      storageDriver: uploadRes.storageDriver,
      fileHash: uploadRes.fileHash,
      mimeType: uploadRes.mimeType,
      size: uploadRes.size,
      version: 1,
      status: 'PENDING',
      previousVersions: [],
      uploadedAt: uploadRes.uploadedAt,
    };

    if (!db.data.documents) db.data.documents = [];
    db.data.documents.push(docRecord);
    await db.write();

    assert.strictEqual(uploadRes.fileHash, expectedHash);
    assert.strictEqual(uploadRes.size, samplePdfBuffer.length);
  });

  // 2. Retrieve document metadata and verify cryptographic hash
  await test('2. Verify stored binary matches database cryptographic SHA-256 checksum', async () => {
    const doc = db.data.documents.find((d) => String(d.id) === String(testDocId));
    assert(doc, 'Document record must exist in database');

    const download = await storageService.downloadFile(doc.storedKey);
    const downloadedHash = crypto.createHash('sha256').update(download.buffer).digest('hex');

    assert.strictEqual(downloadedHash, doc.fileHash);
    assert.strictEqual(download.buffer.length, doc.size);
  });

  // 3. Verify all mandatory metadata fields
  await test('3. Verify all mandatory Document metadata fields are present and typed', async () => {
    const doc = db.data.documents.find((d) => String(d.id) === String(testDocId));
    assert(doc.documentId, 'documentId is required');
    assert.strictEqual(typeof doc.studentId, 'number');
    assert.strictEqual(typeof doc.providerId, 'number');
    assert.strictEqual(typeof doc.applicationId, 'number');
    assert.strictEqual(typeof doc.storedKey, 'string');
    assert(['local', 'r2', 's3'].includes(doc.storageDriver));
    assert.strictEqual(doc.fileHash.length, 64);
    assert.strictEqual(doc.version, 1);
    assert(['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_RESUBMISSION', 'REPLACED', 'ARCHIVED', 'PENDING_MANUAL_REVIEW'].includes(doc.status));
  });

  // Clean up
  await storageService.deleteFile(storedKey);
  const docIdx = db.data.documents.findIndex((d) => String(d.id) === String(testDocId));
  if (docIdx !== -1) db.data.documents.splice(docIdx, 1);
  await db.write();

  console.log(`\n========================================================`);
  console.log(`STORAGE PERSISTENCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runPersistenceTests();
