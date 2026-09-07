/**
 * test_upload_metadata_rollback.js
 * Verifies that when metadata/database persistence fails after storage upload,
 * uploaded objects are rolled back and deleted from storage.
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const storageService = require('../src/utils/storageService');
const { buildApp } = require('../src/vercelApp');
const { connectDb, db, createId } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'iskolar-dev-secret-key';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

async function run() {
  console.log('--- RUNNING test_upload_metadata_rollback ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50500 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'Rollback Tester',
    email: `rollback.tester.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'Rollback Tester',
    email: `rollback.tester.${testStudentId}@test.ph`,
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
    email: `rollback.tester.${testStudentId}@test.ph`,
    name: 'Rollback Tester',
  });

  const scholarship = (db.data.scholarships || [])[0] || { id: 1, title: 'Sample' };

  // Track deleted files during rollback
  const origDriverEnv = process.env.STORAGE_DRIVER;
  process.env.STORAGE_DRIVER = 'local';
  const deletedFiles = [];
  const origDelete = storageService.deleteFile.bind(storageService);
  storageService.deleteFile = async (key) => {
    deletedFiles.push(key);
    return origDelete(key);
  };

  // Temporarily force db.syncApplication to fail
  const origSync = db.syncApplication;
  db.syncApplication = async () => {
    throw new Error('Simulated Database Crash during syncApplication');
  };

  const boundary = '----WebKitFormBoundaryRollbackTest';
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');

  const postBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="rollback_test.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
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

  // Restore functions
  db.syncApplication = origSync;
  storageService.deleteFile = origDelete;
  if (origDriverEnv !== undefined) {
    process.env.STORAGE_DRIVER = origDriverEnv;
  } else {
    delete process.env.STORAGE_DRIVER;
  }

  assert.ok(res.status >= 400, `Expected error status code, got ${res.status}`);
  assert.ok(deletedFiles.length > 0, 'Expected storageService.deleteFile to be invoked on rollback');

  // Verify application was not added to db.data.applications
  const savedApp = (db.data.applications || []).find(a => (a.student_id === testStudentId || a.studentId === testStudentId) && a.scholarship_id === scholarship.id);
  assert.strictEqual(savedApp, undefined, 'Application should not be persisted on metadata failure');

  server.close();
  console.log('✓ test_upload_metadata_rollback passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_upload_metadata_rollback failed:', err);
  process.exit(1);
});
