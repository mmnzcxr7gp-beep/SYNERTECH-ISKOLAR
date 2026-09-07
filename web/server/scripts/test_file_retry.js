/**
 * test_file_retry.js
 * Verifies that when a single file fails validation, an explicit error is returned,
 * and retrying with a valid file completes successfully.
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
  console.log('--- RUNNING test_file_retry ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50800 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'Retry Tester',
    email: `retry.tester.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'Retry Tester',
    email: `retry.tester.${testStudentId}@test.ph`,
    school: 'PLM',
    gpa: 1.30,
    isVerified: true,
    verificationStatus: 'verified',
  };
  db.data.student_profiles.push(profile);
  await db.write();

  const token = createToken({
    id: testStudentId,
    role: 'student',
    email: `retry.tester.${testStudentId}@test.ph`,
    name: 'Retry Tester',
  });

  const scholarship = (db.data.scholarships || [])[0] || { id: 1, title: 'Sample' };

  // Step 1: Submit with invalid executable file disguised as pdf
  const boundary = '----WebKitFormBoundaryRetryTest';
  const badExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');

  const badBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="malicious.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    badExeBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res1 = await fetch(`${baseUrl}/applications/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(badBody.length),
    },
    body: badBody,
  });

  assert.strictEqual(res1.status, 400, `Expected status 400 for bad file signature, got ${res1.status}`);
  const data1 = await res1.json();
  assert.ok(data1.code === 'FILE_SIGNATURE_INVALID' || data1.errorCode === 'FILE_SIGNATURE_INVALID' || data1.message.includes('signature') || data1.message.includes('Validation'), 'Expected file signature invalid error');

  // Step 2: Retry with genuine valid PDF file
  const validPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');
  const validBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="valid_doc.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    validPdf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res2 = await fetch(`${baseUrl}/applications/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(validBody.length),
    },
    body: validBody,
  });

  assert.strictEqual(res2.status, 201, `Expected status 201 on valid retry, got ${res2.status}`);
  const data2 = await res2.json();
  assert.strictEqual(data2.success, true, 'Expected retry to succeed');

  server.close();
  console.log('✓ test_file_retry passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_file_retry failed:', err);
  process.exit(1);
});
