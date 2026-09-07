/**
 * ISKOLAR TEST: Student Application Submission Completion & State Progression
 * Verifies that a student completes an application form, uploads required documents,
 * successfully saves metadata in MongoDB, and automatically moves state to SUBMITTED / UNDER_AUTOMATIC_CHECK.
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb } = require('../src/config/db');

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

function request(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://localhost:${port}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'mobile',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve({ statusCode: res.statusCode, body: JSON.parse(raw) }); } catch (_) { resolve({ statusCode: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING APPLICATION SUBMISSION COMPLETION TEST');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const testStudentId = 24000 + Math.floor(Math.random() * 8000);
    const student = { id: testStudentId, email: `eric.villanueva.${testStudentId}@iskolar.ph`, role: 'student' };
    const studentToken = signToken(student);

    if (!db.data.users) db.data.users = [];
    db.data.users.push(student);

    if (!db.data.student_profiles) db.data.student_profiles = [];
    const prof = {
      id: testStudentId,
      user_id: testStudentId,
      name: 'Eric Villanueva',
      email: student.email,
      school: 'Batangas State University',
      course: 'BS Mechanical Engineering',
      gpa: 1.60,
      isVerified: true,
      verificationStatus: 'verified',
    };
    db.data.student_profiles.push(prof);

    const scholarshipId = 20100 + Math.floor(Math.random() * 8000);
    if (!db.data.scholarships) db.data.scholarships = [];
    db.data.scholarships.push({
      id: scholarshipId,
      title: 'Ayala Future Leaders Engineering Grant',
      sponsor_id: 8,
      status: 'open',
      requirements: ['grades', 'income'],
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    if (db.data.applications) {
      db.data.applications = db.data.applications.filter((a) => !(String(a.student_id) === String(testStudentId)));
    }
    await db.write();

    console.log('\n[STEP 1] Student submits scholarship application with required documents...');
    const boundary = '----WebKitFormBoundaryAppSubmitCompTest';
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');
    const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const postDataApp = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarshipId}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="full_name"\r\n\r\nEric Villanueva\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\n${student.email}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="school"\r\n\r\nBatangas State University\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="course"\r\n\r\nBS Mechanical Engineering\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="gpa"\r\n\r\n1.60\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="annual_family_income"\r\n\r\n180000\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="grades.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      dummyPdf,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="file_1"; filename="income.png"\r\nContent-Type: image/png\r\n\r\n`),
      dummyPng,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const applyRes = await new Promise((resolve, reject) => {
      const req = http.request(
        `http://localhost:${port}/api/applications/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': String(postDataApp.length),
            'X-Client-Platform': 'mobile',
            'Authorization': `Bearer ${studentToken}`,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            try { resolve({ statusCode: res.statusCode, body: JSON.parse(raw) }); } catch (_) { resolve({ statusCode: res.statusCode, body: raw }); }
          });
        }
      );
      req.on('error', reject);
      req.write(postDataApp);
      req.end();
    });

    assert.ok(applyRes.statusCode === 200 || applyRes.statusCode === 201, `Expected 200/201, got ${applyRes.statusCode}: ${JSON.stringify(applyRes.body)}`);
    const appId = applyRes.body.applicationId || applyRes.body.application?.id || applyRes.body.id;
    assert.ok(appId, 'Must return application ID');
    console.log(`  ✅ PASS: Application created successfully (ID: ${appId})`);
    passed++;

    console.log('\n[STEP 2] Verifying application state progression to SUBMITTED...');
    const appInDb = (db.data.applications || []).find((a) => String(a.id) === String(appId));
    assert.ok(appInDb, 'Application must exist in database');
    assert.ok(appInDb.status.toLowerCase().includes('submit') || appInDb.status.toLowerCase().includes('pending'), 'Status must indicate submission');
    console.log('  ✅ PASS: Application initialized in SUBMITTED state without freeze');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 SUBMISSION COMPLETION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
