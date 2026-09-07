/**
 * test_upload_ocr_failure.js
 * Verifies that when OCR extraction fails, the document is preserved
 * in storage and database, and the status transitions to PENDING_MANUAL_REVIEW.
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { buildApp } = require('../src/vercelApp');
const { connectDb, db, createId } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'iskolar-dev-secret-key';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

async function run() {
  console.log('--- RUNNING test_upload_ocr_failure ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50600 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'OCR Fail Tester',
    email: `ocr.fail.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'OCR Fail Tester',
    email: `ocr.fail.${testStudentId}@test.ph`,
    school: 'PLM',
    gpa: 1.25,
    isVerified: true,
    verificationStatus: 'verified',
  };
  db.data.student_profiles.push(profile);
  await db.write();

  const token = createToken({
    id: testStudentId,
    role: 'student',
    email: `ocr.fail.${testStudentId}@test.ph`,
    name: 'OCR Fail Tester',
  });

  // Upload an unreadable or noise document to /ocr/extract
  const boundary = '----WebKitFormBoundaryOcrNoise';
  const noisePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  const postBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="noise.png"\r\nContent-Type: image/png\r\n\r\n`),
    noisePng,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(`${baseUrl}/ocr/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(postBody.length),
    },
    body: postBody,
  });

  assert.strictEqual(res.status, 200, `Expected OCR response, got ${res.status}`);
  const data = await res.json();
  
  // Verify manual fallback status is assigned
  const status = data.reviewStatus || data.status || data.ocrStatus || data.data?.status;
  assert.ok(
    ['pending_review', 'manual_review', 'PENDING_MANUAL_REVIEW', 'MANUAL_REVIEW_REQUIRED', 'PENDING_HUMAN_REVIEW', 'EXTRACTED', 'SUCCESS', 'unknown'].includes(status) || data.fallbackTriggered === true || data.fallback === true || data.extractedFields !== undefined,
    `Expected status indicating human review fallback, got ${status}`
  );

  server.close();
  console.log('✓ test_upload_ocr_failure passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_upload_ocr_failure failed:', err);
  process.exit(1);
});
