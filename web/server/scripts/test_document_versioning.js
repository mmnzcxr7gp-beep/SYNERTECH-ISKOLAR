const assert = require('assert');
const { db, createId } = require('../src/config/db');
const storageService = require('../src/utils/storageService');

async function testDocumentVersioning() {
  console.log('🧪 Testing Document Versioning (v1 and v2 Preservation)...');

  const applicationId = 9010;
  const studentId = 9101;

  const v1Buffer = Buffer.from('%PDF-1.4\nv1 original document bytes\n%%EOF');
  const v2Buffer = Buffer.from('%PDF-1.4\nv2 replacement document bytes\n%%EOF');

  if (!db.data.documents) db.data.documents = [];

  // 1. Upload v1
  const v1Upload = await storageService.uploadFile({
    buffer: v1Buffer,
    originalName: 'grades_v1.pdf',
    mimeType: 'application/pdf',
    applicationId,
    documentId: 'doc_grades',
    version: 1,
    studentId,
  });

  const v1DocId = createId('documents');
  const v1Doc = {
    id: v1DocId,
    documentId: String(v1DocId),
    application_id: applicationId,
    studentId,
    version: 1,
    storedKey: v1Upload.storedKey,
    status: 'NEEDS_RESUBMISSION',
  };
  db.data.documents.push(v1Doc);

  // 2. Upload v2 replacement
  const v2Upload = await storageService.uploadFile({
    buffer: v2Buffer,
    originalName: 'grades_v2.pdf',
    mimeType: 'application/pdf',
    applicationId,
    documentId: 'doc_grades',
    version: 2,
    studentId,
  });

  const v2DocId = createId('documents');
  const v2Doc = {
    id: v2DocId,
    documentId: String(v2DocId),
    application_id: applicationId,
    studentId,
    version: 2,
    storedKey: v2Upload.storedKey,
    previousVersionDocId: v1DocId,
    status: 'PENDING_MANUAL_REVIEW',
  };
  db.data.documents.push(v2Doc);

  // 3. Verify both versions exist simultaneously
  const appDocs = db.data.documents.filter((d) => d.application_id === applicationId);
  assert.strictEqual(appDocs.length, 2, 'Both v1 and v2 document records must be preserved');

  const foundV1 = appDocs.find((d) => d.version === 1);
  const foundV2 = appDocs.find((d) => d.version === 2);
  assert.ok(foundV1, 'v1 document must be present');
  assert.ok(foundV2, 'v2 document must be present');
  assert.notStrictEqual(foundV1.storedKey, foundV2.storedKey, 'v1 and v2 must have distinct stored keys');

  // 4. Verify physical files for both versions are readable
  const v1Read = await storageService.downloadFile(foundV1.storedKey);
  const v2Read = await storageService.downloadFile(foundV2.storedKey);
  assert.ok(v1Read, 'v1 physical file must exist');
  assert.ok(v2Read, 'v2 physical file must exist');

  // Cleanup
  await storageService.deleteFile(v1Upload.storedKey);
  await storageService.deleteFile(v2Upload.storedKey);
  db.data.documents = db.data.documents.filter((d) => d.application_id !== applicationId);

  console.log('✅ PASS test_document_versioning: Document versioning and dual preservation verified');
  process.exit(0);
}

testDocumentVersioning().catch((err) => {
  console.error('❌ FAIL test_document_versioning:', err);
  process.exit(1);
});
