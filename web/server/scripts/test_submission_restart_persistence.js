/**
 * test_submission_restart_persistence.js
 * Verifies that submitted applications, documents, and storage object metadata
 * survive backend restarts and reload cleanly.
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
  console.log('--- RUNNING test_submission_restart_persistence ---');

  await connectDb();
  if (db.read) await db.read();

  let app = buildApp();
  let server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  let port = server.address().port;
  let baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 51200 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'Persistence Tester',
    email: `persist.tester.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'Persistence Tester',
    email: `persist.tester.${testStudentId}@test.ph`,
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
    email: `persist.tester.${testStudentId}@test.ph`,
    name: 'Persistence Tester',
  });

  const scholarship = (db.data.scholarships || [])[0] || { id: 1, title: 'Sample' };

  const boundary = '----WebKitFormBoundaryPersistTest';
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');

  const postBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="persist_doc.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
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
  const appId = data.application.id;
  const docId = data.documents[0].id;

  // Simulate server shutdown
  await new Promise((resolve) => server.close(resolve));

  // Simulate server restart: re-read database
  if (db.read) await db.read();

  // Create new server instance after restart
  app = buildApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  // Verify application exists after restart
  const persistedApp = (db.data.applications || []).find((a) => a.id === appId);
  assert.ok(persistedApp, 'Application record must persist across server restart');
  assert.strictEqual(persistedApp.student_id, testStudentId);

  // Verify document metadata exists after restart
  const persistedDoc = (db.data.documents || []).find((d) => d.id === docId);
  assert.ok(persistedDoc, 'Document metadata must persist across server restart');
  assert.ok(persistedDoc.storedKey, 'StoredKey must be preserved across restart');

  server.close();
  console.log('✓ test_submission_restart_persistence passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_submission_restart_persistence failed:', err);
  process.exit(1);
});
