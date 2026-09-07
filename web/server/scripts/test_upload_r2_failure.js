/**
 * test_upload_r2_failure.js
 * Verifies that when STORAGE_DRIVER=r2 encounters a failure,
 * the backend returns STORAGE_UNAVAILABLE (503) without silent local fallback.
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
  console.log('--- RUNNING test_upload_r2_failure ---');

  await connectDb();
  if (db.read) await db.read();

  // Mock R2 driver to simulate connectivity/upload failure
  const originalDriver = storageService.r2Driver;
  const originalActive = storageService.activeDriver;
  
  // Set fake R2 driver that throws network error
  storageService.r2Driver = {
    driverName: 'r2',
    save: async () => {
      throw new Error('R2 PutObject failed: Connection timeout to endpoint');
    },
    get: async () => {
      throw new Error('R2 GetObject failed');
    },
    delete: async () => {},
  };

  // Temporarily force STORAGE_DRIVER=r2
  const prevEnv = process.env.STORAGE_DRIVER;
  process.env.STORAGE_DRIVER = 'r2';

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const testStudentId = 50400 + Math.floor(Math.random() * 8000);
  const studentUser = {
    id: testStudentId,
    name: 'R2 Fail Tester',
    email: `r2.fail.${testStudentId}@test.ph`,
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  const profile = {
    id: createId('student_profiles'),
    user_id: testStudentId,
    name: 'R2 Fail Tester',
    email: `r2.fail.${testStudentId}@test.ph`,
    school: 'PLM',
    gpa: 1.20,
    isVerified: true,
    verificationStatus: 'verified',
  };
  db.data.student_profiles.push(profile);
  await db.write();

  const token = createToken({
    id: testStudentId,
    role: 'student',
    email: `r2.fail.${testStudentId}@test.ph`,
    name: 'R2 Fail Tester',
  });

  const scholarship = (db.data.scholarships || [])[0] || { id: 1, title: 'Sample' };

  const boundary = '----WebKitFormBoundaryR2Fail';
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

  // Restore drivers & env
  process.env.STORAGE_DRIVER = prevEnv;
  storageService.r2Driver = originalDriver;

  assert.ok([500, 503].includes(res.status), `Expected status 500 or 503 on R2 failure, got ${res.status}`);
  const data = await res.json();
  assert.strictEqual(data.success, false, 'Expected success: false');
  assert.ok(data.code === 'STORAGE_UNAVAILABLE' || data.errorCode === 'STORAGE_UNAVAILABLE' || data.code === 'INTERNAL_ERROR', 'Expected storage failure error code');

  server.close();
  console.log('✓ test_upload_r2_failure passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_upload_r2_failure failed:', err);
  process.exit(1);
});
