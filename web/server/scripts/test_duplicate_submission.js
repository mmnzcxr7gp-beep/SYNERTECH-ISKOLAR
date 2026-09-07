/**
 * test_duplicate_submission.js
 * Verifies that duplicate submissions for the same scholarship are cleanly rejected.
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
  console.log('--- RUNNING test_duplicate_submission ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50700 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'Duplicate Tester',
    email: `duplicate.tester.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'Duplicate Tester',
    email: `duplicate.tester.${testStudentId}@test.ph`,
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
    email: `duplicate.tester.${testStudentId}@test.ph`,
    name: 'Duplicate Tester',
  });

  let scholarship = (db.data.scholarships || []).find(s => s && (s.status === 'open' || s.status === 'active') && (s.id != null || s._id != null));
  if (!scholarship) {
    scholarship = {
      id: 1001,
      sponsor_id: 101,
      title: 'Sample Open Scholarship',
      status: 'open',
      criteria_json: JSON.stringify({ gpa: 40 }),
    };
    if (!db.data.scholarships) db.data.scholarships = [];
    db.data.scholarships.push(scholarship);
    await db.write();
  }
  const scholarId = scholarship.id != null ? scholarship.id : scholarship._id;

  const boundary = '----WebKitFormBoundaryDupTest';
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');

  const postBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="doc.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    dummyPdf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  // First submission
  const res1 = await fetch(`${baseUrl}/applications/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(postBody.length),
    },
    body: postBody,
  });

  assert.strictEqual(res1.status, 201, `Expected status 201 on first submission, got ${res1.status}`);

  // Duplicate submission attempt
  const res2 = await fetch(`${baseUrl}/applications/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(postBody.length),
    },
    body: postBody,
  });

  assert.strictEqual(res2.status, 409, `Expected status 409 on duplicate, got ${res2.status}`);
  const data2 = await res2.json();
  assert.ok(data2.message || data2.error || data2.success === false, 'Expected duplicate error message or success: false');

  server.close();
  console.log('✓ test_duplicate_submission passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_duplicate_submission failed:', err);
  process.exit(1);
});
