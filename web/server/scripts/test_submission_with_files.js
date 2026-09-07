/**
 * test_submission_with_files.js
 * Verifies complete scholarship application submission with attached files across the full pipeline.
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
  console.log('--- RUNNING test_submission_with_files ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50100 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'Maria Santos',
    email: `maria.santos.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'Maria Santos',
    email: `maria.santos.${testStudentId}@test.ph`,
    school: 'University of the Philippines',
    gpa: 1.15,
    isVerified: true,
    verificationStatus: 'verified',
  };
  db.data.student_profiles.push(profile);
  await db.write();

  const token = createToken({
    id: testStudentId,
    role: 'student',
    email: `maria.santos.${testStudentId}@test.ph`,
    name: 'Maria Santos',
  });

  const scholarship = (db.data.scholarships || [])[0] || {
    id: 1,
    title: 'SM College Scholarship',
    requirements: ['Certificate of Grades', 'School ID'],
  };

  const boundary = '----WebKitFormBoundarySubFilesTest';
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  const postBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="gpa"\r\n\r\n1.15\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="grades.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    dummyPdf,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="file_1"; filename="id.png"\r\nContent-Type: image/png\r\n\r\n`),
    dummyPng,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(`${baseUrl}/applications/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(postBody.length),
    },
    body: postBody,
  });

  assert.strictEqual(res.status, 201, `Expected status 201, got ${res.status}`);
  const data = await res.json();

  assert.strictEqual(data.success, true, 'Expected success: true');
  assert.ok(data.application, 'Expected application object');
  assert.strictEqual(data.application.student_id, testStudentId);
  assert.ok(Array.isArray(data.documents) && data.documents.length >= 2, 'Expected at least 2 saved documents');

  // Verify state transitions: Automation sets PENDING_HUMAN_REVIEW
  for (const doc of data.documents) {
    assert.strictEqual(doc.status, 'PENDING_HUMAN_REVIEW', `Expected doc status PENDING_HUMAN_REVIEW, got ${doc.status}`);
    assert.strictEqual(doc.ocr_status, 'PENDING_HUMAN_REVIEW', `Expected ocr_status PENDING_HUMAN_REVIEW, got ${doc.ocr_status}`);
    assert.ok(doc.storedKey, 'Expected storedKey to be populated');
    assert.ok(doc.fileHash, 'Expected fileHash to be populated');
  }

  server.close();
  console.log('✓ test_submission_with_files passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_submission_with_files failed:', err);
  process.exit(1);
});
