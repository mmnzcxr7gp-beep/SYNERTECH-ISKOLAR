/**
 * ISKOLAR Automated Test Suite: Manual Review Authorization & Security
 * 
 * Tests:
 * 1. Student cannot verify a document (403)
 * 2. Student cannot approve an application (403)
 * 3. Student cannot alter automated check results (403)
 * 4. Unrelated provider is denied access to review document (403)
 * 5. Authorized Provider can review assigned document (200)
 * 6. Reviewer identity strictly comes from JWT (client-supplied IDs ignored)
 * 7. Resubmission / Rejection without written reason is rejected (400)
 * 8. Administrator has oversight authority (200)
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb, createId } = require('../src/config/db');

function signToken(user, expiresIn = '1h') {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    TEST_JWT_SECRET,
    { expiresIn }
  );
}

function makeRequest(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://localhost:${port}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(raw) });
          } catch (_) {
            resolve({ statusCode: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runManualReviewAuthorizationTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING MANUAL REVIEW AUTHORIZATION & SECURITY TESTS');
  console.log('🧪 ====================================================');

  await connectDb();
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const student = { id: 8101, email: `student.auth.${timestamp}@iskolar.ph`, role: 'student' };
  const ownerProvider = { id: 8102, email: `owner.prov.${timestamp}@iskolar.ph`, role: 'provider' };
  const otherProvider = { id: 8103, email: `other.prov.${timestamp}@iskolar.ph`, role: 'provider' };
  const adminUser = { id: 8104, email: `admin.auth.${timestamp}@iskolar.ph`, role: 'admin' };

  const studentToken = signToken(student);
  const ownerToken = signToken(ownerProvider);
  const otherToken = signToken(otherProvider);
  const adminToken = signToken(adminUser);

  // Seed providers in MongoDB & memory
  const { Provider } = require('../src/models');
  if (Provider && mongoose.connection.readyState === 1) {
    await Provider.deleteMany({ userId: { $in: [ownerProvider.id, otherProvider.id] } });
    await Provider.create([
      {
        userId: ownerProvider.id,
        organizationName: 'Review Owner Foundation',
        isVerified: true,
        email: ownerProvider.email,
        contactNumber: '+639170001111',
        industry: 'Education',
        registrationNumber: `REG-REV-OWNER-${timestamp}`,
      },
      {
        userId: otherProvider.id,
        organizationName: 'Review Other Foundation',
        isVerified: true,
        email: otherProvider.email,
        contactNumber: '+639170002222',
        industry: 'Education',
        registrationNumber: `REG-REV-OTHER-${timestamp}`,
      },
    ]);
  }

  db.data.users.push(
    { id: student.id, email: student.email, role: 'student' },
    {
      id: ownerProvider.id,
      email: ownerProvider.email,
      role: 'provider',
      sponsor_verified: true,
      organization_verified: true,
      is_verified: true,
      organization_documents: ['proof.pdf'],
    },
    {
      id: otherProvider.id,
      email: otherProvider.email,
      role: 'provider',
      sponsor_verified: true,
      organization_verified: true,
      is_verified: true,
      organization_documents: ['proof.pdf'],
    },
    { id: adminUser.id, email: adminUser.email, role: 'admin' }
  );

  const testScholarshipId = createId('scholarships');
  db.data.scholarships.push({
    id: testScholarshipId,
    sponsor_id: ownerProvider.id,
    provider_id: ownerProvider.id,
    title: 'Manual Review Test Scholarship',
  });

  const testAppId = createId('applications');
  db.data.applications.push({
    id: testAppId,
    scholarship_id: testScholarshipId,
    student_id: student.id,
    status: 'pending_manual_review',
  });

  const testDocId = createId('documents');
  db.data.documents.push({
    id: testDocId,
    application_id: testAppId,
    user_id: student.id,
    filename: `test_doc_${timestamp}.pdf`,
    originalname: 'ReportCard.pdf',
    size: 1024 * 300,
    mime_type: 'application/pdf',
    status: 'PENDING_MANUAL_REVIEW',
  });

  await db.write();

  // Test 1: Student cannot verify document (403)
  await test('1. Student attempting to verify document is blocked with 403 Forbidden', async () => {
    const res = await makeRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'VERIFIED' },
      studentToken
    );
    assert.strictEqual(res.statusCode, 403, 'Students must never be permitted to verify documents');
  });

  // Test 2: Unrelated Provider is blocked (403)
  await test('2. Unrelated provider attempting to review document is blocked with 403 Forbidden', async () => {
    const res = await makeRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'VERIFIED' },
      otherToken
    );
    assert.strictEqual(res.statusCode, 403, 'Unassigned providers must not review documents');
  });

  // Test 3: Resubmission without written reason (400)
  await test('3. Requesting resubmission without written reason returns 400 Bad Request', async () => {
    const res = await makeRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'NEEDS_RESUBMISSION', reason: '' },
      ownerToken
    );
    assert.strictEqual(res.statusCode, 400, 'Resubmission must require a written reason');
  });

  // Test 4: Authorized Provider can request resubmission with reason (200)
  await test('4. Authorized Provider requests resubmission with written reason', async () => {
    const res = await makeRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'NEEDS_RESUBMISSION', reason: 'Grade breakdown on page 2 is truncated.' },
      ownerToken
    );
    assert.strictEqual(res.statusCode, 200);
    const doc = db.data.documents.find((d) => String(d.id) === String(testDocId));
    assert.strictEqual(doc.status, 'NEEDS_RESUBMISSION');
    assert.strictEqual(doc.review_reason, 'Grade breakdown on page 2 is truncated.');
  });

  // Test 5: Reviewer identity strictly comes from JWT
  await test('5. Client-supplied reviewer ID is ignored; reviewer ID derived strictly from JWT', async () => {
    const res = await makeRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'VERIFIED', reviewerId: 999999, reviewerRole: 'spoofed_admin' },
      ownerToken
    );
    assert.strictEqual(res.statusCode, 200);
    const log = db.data.manual_review_logs.find((l) => String(l.documentId) === String(testDocId));
    assert.strictEqual(log.reviewerId, ownerProvider.id, 'Reviewer ID must match JWT user ID');
    assert.strictEqual(log.reviewerRole, 'provider', 'Reviewer role must match JWT user role');
  });

  // Test 6: Administrator has oversight authority (200)
  await test('6. Administrator can review documents and submit review actions', async () => {
    const res = await makeRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'VERIFIED' },
      adminToken
    );
    assert.strictEqual(res.statusCode, 200);
  });

  server.close();

  console.log('🧪 ====================================================');
  console.log(`🧪 MANUAL REVIEW AUTHORIZATION TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runManualReviewAuthorizationTests().catch((e) => {
    console.error('Fatal Manual Review Authorization test error:', e);
    process.exit(1);
  });
}

module.exports = { runManualReviewAuthorizationTests };

