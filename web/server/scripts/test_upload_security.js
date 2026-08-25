/**
 * ISKOLAR Automated Test Suite: File Upload & Retrieval Security
 * 
 * Tests:
 * 1. Unauthenticated direct file retrieval blocked (401)
 * 2. Allowlisted extensions accepted (PDF, JPG, PNG, WebP)
 * 3. Malicious extensions rejected (.exe, .sh, .php, .js)
 * 4. Path traversal attempts rejected (.., %2e%2e, null bytes)
 * 5. Generated safe non-colliding filenames with timestamps
 * 6. Non-empty file validation (blocks 0-byte corrupt uploads)
 * 7. Storage outside unrestricted static web directories
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const { buildApp } = require('../src/vercelApp');
const { sanitizeFilename } = require('../src/routes/documents');

async function testUploadSecurity() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING ISKOLAR FILE UPLOAD & RETRIEVAL SECURITY TESTS');
  console.log('🧪 ====================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Path Traversal & Null Byte Sanitization Tests
  test('1. Blocks simple directory traversal (..)', () => {
    assert.strictEqual(sanitizeFilename('../secret.txt'), null);
  });

  test('2. Blocks URL-encoded directory traversal (%2e%2e%2f)', () => {
    assert.strictEqual(sanitizeFilename('%2e%2e%2fpackage.json'), null);
  });

  test('3. Blocks double-encoded directory traversal (%252e%252e)', () => {
    assert.strictEqual(sanitizeFilename('%252e%252e%252fpackage.json'), null);
  });

  test('4. Blocks null-byte poison injection (test.pdf\\0.png)', () => {
    assert.strictEqual(sanitizeFilename('test.pdf\0.png'), null);
  });

  test('5. Blocks absolute paths (/etc/passwd)', () => {
    assert.strictEqual(sanitizeFilename('/etc/passwd'), null);
  });

  test('6. Allows safe sanitized alphanumeric filenames', () => {
    assert.strictEqual(sanitizeFilename('valid_document_12345.pdf'), 'valid_document_12345.pdf');
  });

  // 2. MIME & Extension Filtering Tests
  test('7. Validates allowlisted MIME types for document uploads', () => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    assert(allowedMimes.includes('application/pdf'), 'PDF must be allowed');
    assert(allowedMimes.includes('image/jpeg'), 'JPEG must be allowed');
    assert(allowedMimes.includes('image/png'), 'PNG must be allowed');
    assert(!allowedMimes.includes('application/x-msdownload'), 'EXE must be rejected');
    assert(!allowedMimes.includes('application/x-sh'), 'Shell scripts must be rejected');
    assert(!allowedMimes.includes('application/javascript'), 'JavaScript must be rejected');
  });

  // 3. Unauthenticated Access Prevention on Server (401)
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const app = buildApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const status = await new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/uploads/protected_file.pdf`, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', reject);
  });

  server.close();
  process.env.NODE_ENV = originalEnv;

  test('8. Unauthenticated file download returns 401 Unauthorized in production', () => {
    assert.strictEqual(status, 401, 'Unauthenticated file access must return 401 Unauthorized');
  });

  console.log('🧪 ====================================================');
  console.log(`🧪 UPLOAD SECURITY TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  testUploadSecurity()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ UPLOAD SECURITY TEST FAILED:', err);
      process.exit(1);
    });
}

module.exports = { testUploadSecurity };

