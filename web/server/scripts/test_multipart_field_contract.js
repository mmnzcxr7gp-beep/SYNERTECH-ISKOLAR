/**
 * test_multipart_field_contract.js
 * Validates multipart contract across endpoints (upload.any, upload.single, upload.fields)
 * and verifies field name mappings.
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
  console.log('--- RUNNING test_multipart_field_contract ---');

  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const studentUser = {
    id: 502,
    name: 'Contract Tester',
    email: 'contract.tester@test.ph',
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  if (!db.data.users.find(u => u.id === 502)) db.data.users.push(studentUser);

  if (!db.data.student_profiles) db.data.student_profiles = [];
  let profile = db.data.student_profiles.find(p => p.user_id === 502);
  if (!profile) {
    profile = {
      id: createId('student_profiles'),
      user_id: 502,
      name: 'Contract Tester',
      email: 'contract.tester@test.ph',
      school: 'Pamantasan ng Lungsod ng Maynila',
      gpa: 1.20,
      isVerified: true,
      verificationStatus: 'verified',
    };
    db.data.student_profiles.push(profile);
  }
  await db.write();

  const token = createToken({
    id: 502,
    role: 'student',
    email: 'contract.tester@test.ph',
    name: 'Contract Tester',
  });

  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  // Test Contract A: OCR /extract endpoint (upload.single('document'))
  console.log('Testing upload.single contract on /ocr/extract...');
  const boundaryA = '----WebKitFormBoundarySingleContract';
  const bodyA = Buffer.concat([
    Buffer.from(`--${boundaryA}\r\nContent-Disposition: form-data; name="document"; filename="test_ocr.png"\r\nContent-Type: image/png\r\n\r\n`),
    dummyPng,
    Buffer.from(`\r\n--${boundaryA}--\r\n`),
  ]);

  const resA = await fetch(`${baseUrl}/ocr/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundaryA}`,
      'Content-Length': String(bodyA.length),
    },
    body: bodyA,
  });

  assert.strictEqual(resA.status, 200, `Expected status 200 on /ocr/extract, got ${resA.status}`);
  const dataA = await resA.json();
  assert.ok(dataA.extractedFields !== undefined || dataA.rawText !== undefined || dataA.documentType !== undefined, 'Expected OCR extraction response structure');

  // Test Contract B: Verification /verification/student/submit (upload.fields)
  console.log('Testing upload.fields contract on /verification/student/submit...');
  const boundaryB = '----WebKitFormBoundaryFieldsContract';
  const bodyB = Buffer.concat([
    Buffer.from(`--${boundaryB}\r\nContent-Disposition: form-data; name="lrn"\r\n\r\n123456789012\r\n`),
    Buffer.from(`--${boundaryB}\r\nContent-Disposition: form-data; name="schoolName"\r\n\r\nPLM\r\n`),
    Buffer.from(`--${boundaryB}\r\nContent-Disposition: form-data; name="governmentId"; filename="gov.png"\r\nContent-Type: image/png\r\n\r\n`),
    dummyPng,
    Buffer.from(`\r\n--${boundaryB}\r\nContent-Disposition: form-data; name="selfieWithId"; filename="selfie.png"\r\nContent-Type: image/png\r\n\r\n`),
    dummyPng,
    Buffer.from(`\r\n--${boundaryB}\r\nContent-Disposition: form-data; name="certificateOfRegistration"; filename="cor.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    dummyPdf,
    Buffer.from(`\r\n--${boundaryB}--\r\n`),
  ]);

  const resB = await fetch(`${baseUrl}/verification/student/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundaryB}`,
      'Content-Length': String(bodyB.length),
    },
    body: bodyB,
  });

  assert.ok([200, 201].includes(resB.status), `Expected status 200/201 on /verification/student/submit, got ${resB.status}`);

  server.close();
  console.log('✓ test_multipart_field_contract passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ test_multipart_field_contract failed:', err);
  process.exit(1);
});
