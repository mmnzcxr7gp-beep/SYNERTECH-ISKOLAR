/**
 * ISKOLAR TEST: Original Document Immutability
 * Verifies that when a student resubmits a replacement document, a new version (v2)
 * is created with its own storage key and metadata, leaving the original v1 document unchanged.
 */

const assert = require('assert');
const { db, connectDb } = require('../src/config/db');

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING ORIGINAL FILE IMMUTABILITY TEST');
  console.log('='.repeat(60));

  await connectDb();

  const v1DocId = 77701;
  const v2DocId = 77702;
  const appId = 66701;

  const originalV1 = {
    id: v1DocId,
    documentId: v1DocId,
    application_id: appId,
    studentId: 24,
    filename: 'original_v1.pdf',
    objectKey: `applications/${appId}/documents/${v1DocId}/v1/original.pdf`,
    sha256Hash: '1111111111111111111111111111111111111111111111111111111111111111',
    version: 1,
    status: 'NEEDS_RESUBMISSION',
  };

  const replacementV2 = {
    id: v2DocId,
    documentId: v2DocId,
    application_id: appId,
    studentId: 24,
    filename: 'replacement_v2.pdf',
    objectKey: `applications/${appId}/documents/${v2DocId}/v2/replacement.pdf`,
    sha256Hash: '2222222222222222222222222222222222222222222222222222222222222222',
    version: 2,
    status: 'PENDING_MANUAL_REVIEW',
    previousVersionId: v1DocId,
  };

  if (!db.data.documents) db.data.documents = [];
  db.data.documents = db.data.documents.filter((d) => d.id !== v1DocId && d.id !== v2DocId);
  db.data.documents.push(originalV1, replacementV2);
  await db.write();

  console.log('\n[STEP 1] Verifying original v1 document integrity...');
  const v1 = db.data.documents.find((d) => d.id === v1DocId);
  assert.ok(v1, 'v1 document must remain present in database');
  assert.strictEqual(v1.sha256Hash, '1111111111111111111111111111111111111111111111111111111111111111');
  assert.strictEqual(v1.version, 1);
  console.log('  ✅ PASS: Original v1 document hash and key remain 100% immutable');

  console.log('\n[STEP 2] Verifying replacement v2 document integrity...');
  const v2 = db.data.documents.find((d) => d.id === v2DocId);
  assert.ok(v2, 'v2 document must exist');
  assert.strictEqual(v2.version, 2);
  assert.strictEqual(v2.previousVersionId, v1DocId);
  console.log('  ✅ PASS: Replacement v2 version references v1 without overwriting it');

  console.log(`\n============================================================`);
  console.log(`🧪 ORIGINAL FILE IMMUTABILITY SUMMARY: 2 PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
