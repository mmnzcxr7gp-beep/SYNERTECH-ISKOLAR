const assert = require('assert');
const { validateFile } = require('../src/utils/fileValidation');
const storageService = require('../src/utils/storageService');

async function testMultipartContract() {
  console.log('🧪 Testing Multipart Upload Contracts, Fields & Signatures...');

  // 1. Valid PDF file contract
  const validPdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const pdfValidation = validateFile(validPdfHeader, 'transcript.pdf', 'application/pdf');
  assert.strictEqual(pdfValidation.valid, true);
  assert.strictEqual(pdfValidation.extension, '.pdf');
  assert.strictEqual(pdfValidation.mimeType, 'application/pdf');
  assert.ok(pdfValidation.hash, 'SHA-256 hash must be generated');

  // 2. Valid PNG file contract
  const validPngHeader = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const pngValidation = validateFile(validPngHeader, 'id_card.png', 'image/png');
  assert.strictEqual(pngValidation.valid, true);
  assert.strictEqual(pngValidation.extension, '.png');
  assert.strictEqual(pngValidation.mimeType, 'image/png');

  // 3. Valid JPEG file contract
  const validJpgHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpgValidation = validateFile(validJpgHeader, 'photo.jpg', 'image/jpeg');
  assert.strictEqual(jpgValidation.valid, true);
  assert.strictEqual(jpgValidation.extension, '.jpg');
  assert.strictEqual(jpgValidation.mimeType, 'image/jpeg');

  // 4. Executable / Dangerous binary rejection
  const peBinary = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
  const peValidation = validateFile(peBinary, 'exploit.exe', 'application/x-msdownload');
  assert.strictEqual(peValidation.valid, false);
  assert.strictEqual(peValidation.code, 'FILE_SIGNATURE_INVALID');

  // 5. ZIP disguised as PDF rejection
  const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
  const zipValidation = validateFile(zipHeader, 'disguised.pdf', 'application/pdf');
  assert.strictEqual(zipValidation.valid, false);
  assert.strictEqual(zipValidation.code, 'FILE_SIGNATURE_INVALID');

  // 6. Path traversal in stored key contract
  const generatedKey = storageService.generateObjectKey({
    applicationId: 'app_123',
    documentId: 'doc_456',
    version: 1,
    extension: '.pdf',
  });
  assert.ok(!generatedKey.includes('..'), 'Object key must not contain parent directory traversal');
  assert.ok(!generatedKey.startsWith('/'), 'Object key must not start with leading slash');
  assert.ok(generatedKey.startsWith('applications/app_123/documents/doc_456/v1/'), 'Object key follows standard hierarchy');

  console.log('✅ PASS test_multipart_contract: Multipart contracts, extensions, and magic bytes verified');
  process.exit(0);
}

testMultipartContract().catch((err) => {
  console.error('❌ FAIL test_multipart_contract:', err);
  process.exit(1);
});
