/**
 * test_submission_state_transition.js
 * Verifies that automated application processing strictly transitions
 * to PENDING_HUMAN_REVIEW or PENDING_MANUAL_REVIEW and NEVER assigns
 * final VERIFIED, APPROVED, or REJECTED statuses without human provider action.
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
  console.log('--- RUNNING test_submission_state_transition ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 51100 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'State Transition Tester',
    email: `state.tester.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'State Transition Tester',
    email: `state.tester.${testStudentId}@test.ph`,
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
    email: `state.tester.${testStudentId}@test.ph`,
    name: 'State Transition Tester',
  });

  const scholarship = (db.data.scholarships || [])[0] || { id: 1, title: 'Sample' };

  const boundary = '----WebKitFormBoundaryStateTest';
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');

  const postBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="doc.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    dummyPdf,
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

  // Verify application status is not finalized
  const appStatus = data.application.status;
  assert.ok(
    ['pending', 'Pending Review', 'PENDING_HUMAN_REVIEW', 'PENDING_MANUAL_REVIEW'].includes(appStatus),
    `Application status must be pending review, got: ${appStatus}`
  );
  assert.notStrictEqual(appStatus, 'VERIFIED', 'Automation must NOT assign VERIFIED status to application');
  assert.notStrictEqual(appStatus, 'APPROVED', 'Automation must NOT assign APPROVED status to application');
  assert.notStrictEqual(appStatus, 'REJECTED', 'Automation must NOT assign REJECTED status to application');

  // Verify document status is not finalized
  for (const doc of data.documents) {
    assert.notStrictEqual(doc.status, 'VERIFIED', 'Automation must NOT assign VERIFIED status to document');
    assert.notStrictEqual(doc.status, 'APPROVED', 'Automation must NOT assign APPROVED status to document');
    assert.notStrictEqual(doc.status, 'REJECTED', 'Automation must NOT assign REJECTED status to document');
    assert.ok(
      ['PENDING_HUMAN_REVIEW', 'PENDING_MANUAL_REVIEW', 'PENDING', 'pending_review', 'UPLOADED'].includes(doc.status),
      `Document status must be in pending review state, got: ${doc.status}`
    );
  }

  server.close();
  console.log('✓ test_submission_state_transition passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_submission_state_transition failed:', err);
  process.exit(1);
});
