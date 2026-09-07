const assert = require('assert');
const crypto = require('crypto');
const storageService = require('../src/utils/storageService');

async function testR2UploadAndRetrieval() {
  console.log('🧪 Testing Storage / R2 Upload, Retrieval, and Cryptographic Integrity...');

  const fixtureBuffer = Buffer.from(
    '%PDF-1.4\n%ISKOLAR Controlled Synthetic Non-Personal Test Fixture\n1 0 obj\n<< /Title (Academic Record) >>\nendobj\ntrailer\n<<>>\n%%EOF'
  );
  const expectedHash = crypto.createHash('sha256').update(fixtureBuffer).digest('hex');

  // 1. Upload through StorageService
  const uploadResult = await storageService.uploadFile({
    buffer: fixtureBuffer,
    originalName: 'synthetic_record.pdf',
    mimeType: 'application/pdf',
    applicationId: 'app_test_r2',
    documentId: 'doc_test_r2',
    version: 1,
  });

  assert.ok(uploadResult.storedKey, 'Uploaded file must receive a storedKey');
  assert.strictEqual(uploadResult.fileHash, expectedHash, 'SHA-256 hash must match fixture');
  assert.strictEqual(uploadResult.mimeType, 'application/pdf');

  // 2. Verify Key Privacy (contains NO student names, emails, ID numbers, or JWT tokens)
  assert.ok(!uploadResult.storedKey.includes('student'), 'Stored key must not contain personal names');
  assert.ok(!uploadResult.storedKey.includes('@'), 'Stored key must not contain emails');
  assert.ok(!uploadResult.storedKey.includes('Bearer'), 'Stored key must not contain tokens');

  // 3. Retrieve and verify byte contents
  const downloaded = await storageService.downloadFile(uploadResult.storedKey);
  assert.ok(downloaded.buffer || downloaded.stream, 'Downloaded file must contain buffer or stream');
  const downloadedBuffer = downloaded.buffer || await (async () => {
    const chunks = [];
    for await (const chunk of downloaded.stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  })();

  const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
  assert.strictEqual(downloadedHash, expectedHash, 'Downloaded file bytes must have matching SHA-256 hash');

  // 4. Verify fileExists & getMetadata
  const exists = await storageService.fileExists(uploadResult.storedKey);
  assert.strictEqual(exists, true, 'File must exist in storage');

  const meta = await storageService.getMetadata(uploadResult.storedKey);
  assert.strictEqual(meta.size, fixtureBuffer.length);

  // 5. Cleanup
  await storageService.deleteFile(uploadResult.storedKey);

  console.log('✅ PASS test_r2_upload_and_retrieval: Storage / R2 upload, retrieval, and integrity verified');
  process.exit(0);
}

testR2UploadAndRetrieval().catch((err) => {
  console.error('❌ FAIL test_r2_upload_and_retrieval:', err);
  process.exit(1);
});
