/**
 * test_required_document_validation.js
 * Validates that omitted required documents return explicit 400 with code FILE_REQUIRED.
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
  console.log('--- RUNNING test_required_document_validation ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50300 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'Req Validation',
    email: `req.validation.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'Req Validation',
    email: `req.validation.${testStudentId}@test.ph`,
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
    email: `req.validation.${testStudentId}@test.ph`,
    name: 'Req Validation',
  });

  const scholarship = (db.data.scholarships || [])[0] || {
    id: 1,
    title: 'SM College Scholarship',
    requirements: ['Certificate of Grades', 'School ID'],
  };

  // Case 1: Submit with zero files attached
  const boundary = '----WebKitFormBoundaryReqEmpty';
  const postBodyEmpty = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="gpa"\r\n\r\n1.25\r\n`),
    Buffer.from(`--${boundary}--\r\n`),
  ]);

  const res = await fetch(`${baseUrl}/applications/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(postBodyEmpty.length),
    },
    body: postBodyEmpty,
  });

  assert.strictEqual(res.status, 400, `Expected status 400 for empty files, got ${res.status}`);
  const data = await res.json();
  assert.ok(data.message.includes('Missing required documents') || data.code === 'FILE_REQUIRED', 'Expected missing required documents error message');

  server.close();
  console.log('✓ test_required_document_validation passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_required_document_validation failed:', err);
  process.exit(1);
});
