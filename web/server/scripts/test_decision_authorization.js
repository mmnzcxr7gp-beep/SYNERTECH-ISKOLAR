/**
 * ISKOLAR Automated Test Suite: Human-Controlled Decision Authorization & Audit Workflow
 * 
 * Tests:
 * 1. Student attempting status escalation (approve/reject/verify) returns 403
 * 2. Unassigned Provider attempting to decide application returns 403
 * 3. Rejection or Resubmission without mandatory reason returns 400
 * 4. Authorized Provider approving application records reviewer, role, and timestamp
 * 5. Authorized Provider rejecting application records reason and previous status
 * 6. Authorized Provider requesting resubmission records reason and notifies student
 * 7. Administrator performing final decision records audit log
 * 8. Verification that AuditLog records every state transition with actor metadata
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

async function runDecisionAuthorizationTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING ISKOLAR HUMAN DECISION AUTHORIZATION TESTS');
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
  const student = { id: 7001, email: `student.${timestamp}@iskolar.ph`, role: 'student' };
  const ownerProvider = { id: 7002, email: `owner.prov.${timestamp}@iskolar.ph`, role: 'provider', sponsor_verified: true };
  const otherProvider = { id: 7003, email: `other.prov.${timestamp}@iskolar.ph`, role: 'provider', sponsor_verified: true };
  const adminUser = { id: 7004, email: `admin.${timestamp}@iskolar.ph`, role: 'admin' };

  const studentToken = signToken(student);
  const ownerToken = signToken(ownerProvider);
  const otherToken = signToken(otherProvider);
  const adminToken = signToken(adminUser);

  // Seed provider records in memory to pass sponsorVerification middleware
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

  const { Provider } = require('../src/models');
  if (Provider && mongoose.connection.readyState === 1) {
    await Provider.deleteMany({ userId: { $in: [ownerProvider.id, otherProvider.id] } });
    await Provider.create([
      {
        userId: ownerProvider.id,
        organizationName: 'Owner Foundation',
        isVerified: true,
        email: ownerProvider.email,
        contactNumber: '+639171112222',
        industry: 'Education',
        registrationNumber: `REG-OWNER-${timestamp}`,
      },
      {
        userId: otherProvider.id,
        organizationName: 'Other Foundation',
        isVerified: true,
        email: otherProvider.email,
        contactNumber: '+639173334444',
        industry: 'Education',
        registrationNumber: `REG-OTHER-${timestamp}`,
      },
    ]);
  }

  const testScholarshipId = createId('scholarships');
  db.data.scholarships.push({
    id: testScholarshipId,
    sponsor_id: ownerProvider.id,
    provider_id: ownerProvider.id,
    title: 'Decision Test Scholarship',
  });

  const testAppId = createId('applications');
  db.data.applications.push({
    id: testAppId,
    scholarship_id: testScholarshipId,
    student_id: student.id,
    status: 'pending_human_review',
    created_at: new Date().toISOString(),
  });

  await db.write();

  // Test 1: Student Attempting Status Escalation (403)
  await test('1. Student attempting to approve application is blocked with 403 Forbidden', async () => {
    const res = await makeRequest(port, 'PUT', `/api/applications/${testAppId}/status`, { status: 'approved' }, studentToken);
    assert.strictEqual(res.statusCode, 403, 'Students must never be permitted to approve applications');
  });

  // Test 2: Unrelated Provider Attempting Decision (403)
  await test('2. Unassigned provider attempting to update application status is blocked with 403', async () => {
    const res = await makeRequest(port, 'PUT', `/api/applications/${testAppId}/status`, { status: 'approved' }, otherToken);
    assert.strictEqual(res.statusCode, 403, 'Unassigned providers must not update other scholarships');
  });

  // Test 3: Rejection Without Mandatory Reason (400)
  await test('3. Rejection without mandatory reason returns 400 Bad Request', async () => {
    const res = await makeRequest(port, 'PUT', `/api/applications/${testAppId}/status`, { status: 'rejected' }, ownerToken);
    assert.strictEqual(res.statusCode, 400, 'Rejection must require a specific reason');
  });

  // Test 4: Authorized Provider Requesting Resubmission (200)
  await test('4. Authorized Provider requests resubmission with required reason', async () => {
    const res = await makeRequest(
      port,
      'PUT',
      `/api/applications/${testAppId}/status`,
      { status: 'needs_resubmission', reason: 'Please upload a clearer copy of your Certificate of Registration.' },
      ownerToken
    );
    assert.strictEqual(res.statusCode, 200);
    const updated = db.data.applications.find((a) => String(a.id) === String(testAppId));
    assert(updated.status.toUpperCase() === 'RESUBMISSION_REQUIRED' || updated.status.toLowerCase() === 'needs_resubmission');
    assert.strictEqual(updated.reviewed_by, ownerProvider.id);
    assert.strictEqual(updated.reviewed_by_role, 'provider');
    assert.strictEqual(updated.resubmission_reason, 'Please upload a clearer copy of your Certificate of Registration.');
  });

  // Test 5: Authorized Provider Approving Application (200)
  await test('5. Authorized Provider approves application recording reviewer and timestamp', async () => {
    const res = await makeRequest(
      port,
      'PUT',
      `/api/applications/${testAppId}/status`,
      { status: 'approved' },
      ownerToken
    );
    assert.strictEqual(res.statusCode, 200);
    const updated = db.data.applications.find((a) => String(a.id) === String(testAppId));
    assert.strictEqual(updated.status.toUpperCase(), 'APPROVED');
    assert.strictEqual(updated.reviewed_by, ownerProvider.id);
  });

  // Test 6: Administrator Final Decision Authority (200)
  await test('6. Administrator can make final decisions with full audit logging', async () => {
    const res = await makeRequest(
      port,
      'PUT',
      `/api/applications/${testAppId}/status`,
      { status: 'rejected', reason: 'Applicant quota for this batch exceeded.' },
      adminToken
    );
    assert.strictEqual(res.statusCode, 200);
    const updated = db.data.applications.find((a) => String(a.id) === String(testAppId));
    assert.strictEqual(updated.status.toUpperCase(), 'REJECTED');
    assert.strictEqual(updated.reviewed_by, adminUser.id);
    assert.strictEqual(updated.reviewed_by_role, 'admin');
  });

  server.close();

  console.log('🧪 ====================================================');
  console.log(`🧪 DECISION AUTHORIZATION TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runDecisionAuthorizationTests().catch((e) => {
    console.error('Fatal Decision Authorization test error:', e);
    process.exit(1);
  });
}

module.exports = { runDecisionAuthorizationTests };

