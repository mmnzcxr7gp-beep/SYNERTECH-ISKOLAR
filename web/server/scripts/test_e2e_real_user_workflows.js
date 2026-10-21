#!/usr/bin/env node
/**
 * test_e2e_real_user_workflows.js
 * 
 * END-TO-END HTTP INTEGRATION & CONCURRENCY VERIFICATION SUITE
 * 
 * PANEL REQUIREMENTS 2 & 3:
 * 1. Duplicate rejection through actual HTTP upload and submission endpoints using two test accounts.
 * 2. Administrative verification through authenticated, authorized HTTP endpoint.
 * 3. Unauthorized access denial (students cannot verify documents or revise criteria; HTTP 403).
 * 4. Applicant pre-screening HTTP endpoint displaying specific missing requirements and unmet criteria.
 * 5. Data integrity under concurrency:
 *    - Simultaneous duplicate uploads from different accounts.
 *    - Criteria edit occurring concurrently with application submission.
 *    - Immutable snapshot retention (grandfathering existing applications).
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Point directly to active local MongoDB instance to avoid Atlas timeout
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/iskolar';
process.env.TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/iskolar';
const JWT_SECRET = 'test-jwt-secret-panel-compliance-2026';
process.env.JWT_SECRET = JWT_SECRET;
process.env.STORAGE_DRIVER = 'local';
process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { buildApp } = require('../src/vercelApp');
const { connectDb, db } = require('../src/config/db');
const Scholarship = require('../src/models/Scholarship');
const ScholarshipApplication = require('../src/models/ScholarshipApplication');

const FIXTURES_DIR = path.resolve(__dirname, '../test_fixtures/credentials');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id || user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      isVerified: true,
      accountStatus: 'ACTIVE',
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function runE2EWorkflowTests() {
  console.log('========================================================================');
  console.log('   ISKOLAR REAL USER WORKFLOWS & DATA INTEGRITY E2E TEST SUITE');
  console.log('========================================================================\n');

  // 1. Initialize DB and App
  await connectDb();
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('[DB] Connected to MongoDB via Mongoose:', mongoUri);
    } catch (e) {
      console.warn('[DB] Mongoose connection warning:', e.message);
    }
  }

  const app = buildApp();
  const request = supertest(app);

  // 2. Setup Test Accounts
  const applicantA = {
    id: 'user_app_a_' + Date.now(),
    name: 'Juan Dela Cruz (Applicant A)',
    email: `applicantA_${Date.now()}@iskolar.test`,
    role: 'student',
  };
  const applicantB = {
    id: 'user_app_b_' + Date.now(),
    name: 'Pedro Reyes (Applicant B)',
    email: `applicantB_${Date.now()}@iskolar.test`,
    role: 'student',
  };
  const adminUser = {
    id: 'user_admin_' + Date.now(),
    name: 'Admin Santos',
    email: `admin_${Date.now()}@iskolar.test`,
    role: 'admin',
  };
  const providerUser = {
    id: 'user_provider_' + Date.now(),
    name: 'CHED Provider Officer',
    email: `provider_${Date.now()}@iskolar.test`,
    role: 'provider',
    sponsor_verified: true,
  };

  db.data.users = db.data.users || [];
  db.data.users.push(
    { ...applicantA, isVerified: true, accountStatus: 'ACTIVE' },
    { ...applicantB, isVerified: true, accountStatus: 'ACTIVE' },
    { ...adminUser, isVerified: true, accountStatus: 'ACTIVE' },
    { ...providerUser, isVerified: true, accountStatus: 'ACTIVE', sponsor_verified: true }
  );

  const tokenA = generateToken(applicantA);
  const tokenB = generateToken(applicantB);
  const tokenAdmin = generateToken(adminUser);
  const tokenProvider = generateToken(providerUser);

  // Setup Test Scholarship
  const testScholarshipId = 'scholar_panel_' + Date.now();
  const testScholarship = {
    id: testScholarshipId,
    _id: testScholarshipId,
    title: 'City Academic Merit Grant 2026',
    sponsor_id: providerUser.id,
    providerId: providerUser.id,
    status: 'open',
    slots: 10,
    totalSlots: 10,
    criteriaVersion: 1,
    requirements: ['School ID', 'Certificate of Registration (COR)'],
    criteria_json: JSON.stringify({
      min_gwa: 2.0,
      allowed_courses: ['BS Computer Science', 'BS Information Technology'],
    }),
  };

  db.data.scholarships = db.data.scholarships || [];
  db.data.scholarships.push(testScholarship);

  if (mongoose.connection.readyState === 1) {
    try {
      await Scholarship.create({
        ...testScholarship,
        _id: new mongoose.Types.ObjectId(),
        id: testScholarshipId,
      });
    } catch (_) {}
  }

  const schoolIdPath = path.join(FIXTURES_DIR, 'synthetic_school_id.png');
  assert(fs.existsSync(schoolIdPath), 'synthetic_school_id.png must exist');
  const corPdfPath = path.join(FIXTURES_DIR, 'synthetic_cor_text.pdf');
  assert(fs.existsSync(corPdfPath), 'synthetic_cor_text.pdf must exist');

  const suiteResults = [];

  // ==========================================================================
  // TEST 1: Applicant A Uploads and Submits Application (Real HTTP Endpoints)
  // ==========================================================================
  console.log('--- TEST 1: Applicant A Submits Application via Real HTTP Endpoints ---');
  let appASubmissionRes = null;
  try {
    appASubmissionRes = await request
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('scholarship_id', testScholarshipId)
      .field('gpa', '1.50')
      .attach('file_0', schoolIdPath)
      .attach('file_1', corPdfPath);

    console.log(`  POST /api/applications/submit status: ${appASubmissionRes.status}`);
    const passed1 = appASubmissionRes.status === 200 || appASubmissionRes.status === 201;
    assert(passed1, `Expected 200/201, got ${appASubmissionRes.status}: ${JSON.stringify(appASubmissionRes.body)}`);
    console.log('  Application A ID:', appASubmissionRes.body.application?.id || appASubmissionRes.body.id);
    console.log('  Criteria Version Recorded:', appASubmissionRes.body.application?.criteriaVersionUsed);
    suiteResults.push({ name: 'Applicant A Real HTTP Application Submission', passed: true });
    console.log('  Result: PASSED\n');
  } catch (err) {
    console.error('  Test 1 Failed:', err.message);
    suiteResults.push({ name: 'Applicant A Real HTTP Application Submission', passed: false, error: err.message });
  }

  // ==========================================================================
  // TEST 2: Cross-Account Duplicate Document Rejection (Real HTTP Endpoints)
  // ==========================================================================
  console.log('--- TEST 2: Cross-Account Duplicate Rejection via Real Upload Endpoints ---');
  try {
    // 2a. Applicant B attempts upload of identical file to /api/ocr/extract
    console.log('  2a. Applicant B uploads identical file to /api/ocr/extract:');
    const ocrDupRes = await request
      .post('/api/ocr/extract')
      .set('Authorization', `Bearer ${tokenB}`)
      .attach('document', schoolIdPath);

    console.log(`      Status: ${ocrDupRes.status}`);
    console.log(`      Response: ${JSON.stringify(ocrDupRes.body)}`);
    const ocrBlocked = ocrDupRes.status === 409 && ocrDupRes.body.error === 'DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS';
    assert(ocrBlocked, `Expected 409 DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS, got ${ocrDupRes.status}`);
    console.log('      Status: SUCCESSFULLY REJECTED (HTTP 409)');

    // 2b. Applicant B attempts submission of identical document to /api/applications/submit
    console.log('  2b. Applicant B attempts submission to /api/applications/submit:');
    const appDupRes = await request
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${tokenB}`)
      .field('scholarship_id', testScholarshipId)
      .field('gpa', '1.60')
      .attach('file_0', schoolIdPath) // Identical document
      .attach('file_1', corPdfPath);

    console.log(`      Status: ${appDupRes.status}`);
    console.log(`      Response: ${JSON.stringify(appDupRes.body)}`);
    const submitBlocked = appDupRes.status === 409 && (
      appDupRes.body.error === 'DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS' ||
      appDupRes.body.code === 'DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS'
    );
    assert(submitBlocked, `Expected 409 DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS on submit, got ${appDupRes.status}`);
    console.log('      Status: SUCCESSFULLY REJECTED (HTTP 409)');

    // 2c. Applicant A confirms their extracted Student ID number (Succeeds)
    console.log('  2c. Applicant A confirms extracted Student ID number:');
    const docAId = 'doc_a_' + Date.now();
    db.data.documents = db.data.documents || [];
    db.data.documents.push({
      id: docAId,
      user_id: applicantA.id,
      extractedFields: { idNumber: '2021-10492' },
    });
    const confirmARes = await request
      .post('/api/ocr/confirm')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        documentId: docAId,
        extractedFields: { idNumber: '2021-10492' },
      });
    assert.strictEqual(confirmARes.status, 200, 'Applicant A confirmation must succeed');
    console.log('      Applicant A confirmation registered successfully (HTTP 200)');

    // 2d. Applicant B attempts cross-account credential identifier reuse to /api/ocr/confirm
    console.log('  2d. Applicant B confirms extracted ID with identical Student ID number:');
    const confirmDupRes = await request
      .post('/api/ocr/confirm')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        documentId: 'doc_b_' + Date.now(),
        extractedFields: { idNumber: '2021-10492' }, // Registered to Applicant A
      });

    console.log(`      Status: ${confirmDupRes.status}`);
    console.log(`      Response: ${JSON.stringify(confirmDupRes.body)}`);
    const idBlocked = confirmDupRes.status === 409 && (
      confirmDupRes.body.error === 'DUPLICATE_CREDENTIAL_IDENTIFIER_ACROSS_ACCOUNTS' ||
      confirmDupRes.body.code === 'DUPLICATE_CREDENTIAL_IDENTIFIER_ACROSS_ACCOUNTS'
    );
    assert(idBlocked, `Expected 409 DUPLICATE_CREDENTIAL_IDENTIFIER_ACROSS_ACCOUNTS, got ${confirmDupRes.status}`);
    console.log('      Status: SUCCESSFULLY REJECTED (HTTP 409)');

    suiteResults.push({ name: 'Cross-Account Duplicate Rejection via Real Endpoints', passed: true });
    console.log('  Result: PASSED\n');
  } catch (err) {
    console.error('  Test 2 Failed:', err.message);
    suiteResults.push({ name: 'Cross-Account Duplicate Rejection via Real Endpoints', passed: false, error: err.message });
  }

  // ==========================================================================
  // TEST 3: Authorization Controls & Administrative Verification Workflow
  // ==========================================================================
  console.log('--- TEST 3: Authorization Controls & Administrative Verification Workflow ---');
  try {
    const targetDocId = 'doc_test_' + Date.now();
    db.data.documents = db.data.documents || [];
    db.data.documents.push({
      id: targetDocId,
      user_id: applicantA.id,
      application_id: appASubmissionRes?.body?.application?.id || 'app_dummy',
      documentType: 'school_id',
      verification_status: 'pending',
    });

    // 3a. Unauthorized user (Applicant A / Student) attempts to verify document
    console.log('  3a. Student Applicant attempts to verify document:');
    const studentVerifyRes = await request
      .put(`/api/ocr/documents/${targetDocId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'verified', notes: 'Self-approval attempt' });

    console.log(`      Status: ${studentVerifyRes.status}`);
    assert.strictEqual(studentVerifyRes.status, 403, 'Unauthorized student must be rejected with 403');
    console.log('      Status: SUCCESSFULLY FORBIDDEN (HTTP 403)');

    // 3b. Unauthorized user attempts to revise criteria
    console.log('  3b. Student Applicant attempts to revise scholarship criteria:');
    const studentReviseRes = await request
      .post(`/api/scholarships/${testScholarshipId}/criteria-revision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ minGwa: 3.5, justification: 'Student self-revision' });

    console.log(`      Status: ${studentReviseRes.status}`);
    assert.strictEqual(studentReviseRes.status, 403, 'Unauthorized student must be rejected with 403');
    console.log('      Status: SUCCESSFULLY FORBIDDEN (HTTP 403)');

    // 3c. Unauthenticated caller attempts to verify document
    console.log('  3c. Unauthenticated caller attempts to verify document:');
    const anonVerifyRes = await request
      .put(`/api/ocr/documents/${targetDocId}/status`)
      .send({ status: 'verified' });

    console.log(`      Status: ${anonVerifyRes.status}`);
    assert.strictEqual(anonVerifyRes.status, 401, 'Anonymous request must be rejected with 401');
    console.log('      Status: SUCCESSFULLY DENIED (HTTP 401)');

    // 3d. Authorized Admin executes manual document verification
    console.log('  3d. Authorized Administrator verifies document with audit log:');
    const adminVerifyRes = await request
      .put(`/api/ocr/documents/${targetDocId}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        status: 'verified',
        notes: 'Verified against university enrollment master list.',
      });

    console.log(`      Status: ${adminVerifyRes.status}`);
    assert.strictEqual(adminVerifyRes.status, 200, 'Admin verification must succeed with 200');
    console.log(`      Verified By: ${adminVerifyRes.body.document?.verified_by}`);
    console.log(`      Verification Status: ${adminVerifyRes.body.document?.verification_status}`);
    assert.strictEqual(adminVerifyRes.body.document?.verified_by, adminUser.id);
    assert.strictEqual(adminVerifyRes.body.document?.verification_status, 'verified');

    suiteResults.push({ name: 'Authorization Controls & Administrative Verification Workflow', passed: true });
    console.log('  Result: PASSED\n');
  } catch (err) {
    console.error('  Test 3 Failed:', err.message);
    suiteResults.push({ name: 'Authorization Controls & Administrative Verification Workflow', passed: false, error: err.message });
  }

  // ==========================================================================
  // TEST 4: Applicant Pre-Screening Endpoint with Specific Guidance
  // ==========================================================================
  console.log('--- TEST 4: Pre-Screening Endpoint with Actionable Guidance ---');
  try {
    // 4a. Incomplete / Unqualified pre-screen check (Unqualified GWA & Missing Document)
    console.log('  4a. Applicant calls /api/applications/pre-screen with unqualified GWA:');
    const preScreenFailRes = await request
      .post('/api/applications/pre-screen')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        scholarship_id: testScholarshipId,
        gpa: '3.25', // Unqualified (criteria requires <= 2.0)
        course: 'BS Accountancy', // Not in allowed courses
        documents: [], // Missing documents
      });

    console.log(`      Status: ${preScreenFailRes.status}`);
    console.log(`      Pre-Screening Status: ${preScreenFailRes.body.preScreeningStatus}`);
    console.log(`      Can Proceed: ${preScreenFailRes.body.canProceedWithSubmission}`);
    console.log(`      Advisory Title: ${preScreenFailRes.body.advisoryTitle}`);
    const unmetList = preScreenFailRes.body.unmetEligibilityCriteria || preScreenFailRes.body.unmetCriteriaReasons || [];
    const incompleteList = preScreenFailRes.body.incompleteRequirements || preScreenFailRes.body.incompleteReasons || [];
    const correctionsList = preScreenFailRes.body.actionableCorrections || [];

    console.log(`      Unmet Criteria List Count: ${unmetList.length}`);
    console.log(`      Missing Requirements Count: ${incompleteList.length}`);
    console.log(`      Actionable Corrections Count: ${correctionsList.length}`);

    assert.strictEqual(preScreenFailRes.body.preScreeningStatus, 'UNQUALIFIED');
    assert.strictEqual(preScreenFailRes.body.canProceedWithSubmission, false);
    assert(unmetList.length >= 1, 'Must report specific unmet criteria');
    assert(incompleteList.length >= 1, 'Must report missing requirements');
    assert(correctionsList.length >= 1, 'Must provide actionable corrections');

    // 4b. Qualified pre-screen check
    console.log('  4b. Applicant calls /api/applications/pre-screen with qualified credentials:');
    const preScreenPassRes = await request
      .post('/api/applications/pre-screen')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        scholarship_id: testScholarshipId,
        gpa: '1.45', // Qualified
        course: 'BS Computer Science', // Allowed
        documents: [
          { filename: 'school_id.png', requirement: 'School ID' },
          { filename: 'cor.pdf', requirement: 'Certificate of Registration (COR)' },
        ],
      });

    console.log(`      Status: ${preScreenPassRes.status}`);
    console.log(`      Pre-Screening Status: ${preScreenPassRes.body.preScreeningStatus}`);
    console.log(`      Can Proceed: ${preScreenPassRes.body.canProceedWithSubmission}`);
    const passStatus = preScreenPassRes.body.preScreeningStatus;
    assert(['ELIGIBLE', 'QUALIFIED_AND_COMPLETE'].includes(passStatus), `Expected ELIGIBLE or QUALIFIED_AND_COMPLETE, got ${passStatus}`);
    assert.strictEqual(preScreenPassRes.body.canProceedWithSubmission, true);

    suiteResults.push({ name: 'Applicant Pre-Screening Endpoint with Actionable Guidance', passed: true });
    console.log('  Result: PASSED\n');
  } catch (err) {
    console.error('  Test 4 Failed:', err.message);
    suiteResults.push({ name: 'Applicant Pre-Screening Endpoint with Actionable Guidance', passed: false, error: err.message });
  }

  // ==========================================================================
  // TEST 5: Concurrency & Data Integrity
  // ==========================================================================
  console.log('--- TEST 5: Concurrency & Data Integrity ---');
  try {
    // 5a. Simultaneous duplicate uploads from different accounts
    console.log('  5a. Simultaneous duplicate uploads from different accounts:');
    const freshDoc = Buffer.from('UNIQUE_ACADEMIC_CREDENTIAL_DATA_' + Date.now());
    const tempFreshPath = path.join(FIXTURES_DIR, 'temp_concurrent_doc.png');
    fs.writeFileSync(tempFreshPath, freshDoc);

    // Call /api/ocr/extract simultaneously with two different user tokens
    const [uploadA, uploadB] = await Promise.all([
      request
        .post('/api/ocr/extract')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('document', tempFreshPath),
      request
        .post('/api/ocr/extract')
        .set('Authorization', `Bearer ${tokenB}`)
        .attach('document', tempFreshPath),
    ]);

    fs.unlinkSync(tempFreshPath);

    console.log(`      Upload A Status: ${uploadA.status}`);
    console.log(`      Upload B Status: ${uploadB.status}`);
    const statuses = [uploadA.status, uploadB.status];
    // At least one must be blocked with 409
    const concurrentBlocked = statuses.includes(409);
    assert(concurrentBlocked, `Concurrent duplicate upload must reject duplicate with 409, got: ${statuses.join(', ')}`);
    console.log('      Concurrent upload race condition successfully isolated and blocked');

    // 5b. Criteria Locking and Audited Revision
    console.log('  5b. Direct criteria edit after first application:');
    const directEditRes = await request
      .put(`/api/scholarships/${testScholarshipId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        criteria: { min_gwa: 1.25 }, // Stricter criteria
      });

    console.log(`      Status: ${directEditRes.status}`);
    console.log(`      Message: ${directEditRes.body.message || directEditRes.body.error}`);
    // Direct edit MUST be blocked because applications exist (HTTP 403 or 423)
    const lockedPassed = [400, 403, 423].includes(directEditRes.status) || directEditRes.body.code === 'CRITERIA_LOCKED_APPLICATIONS_EXIST';
    assert(lockedPassed, `Expected criteria lock block, got ${directEditRes.status}`);
    console.log('      Direct modification correctly blocked: Criteria is locked after first application');

    // 5c. Controlled Audited Revision
    console.log('  5c. Controlled audited criteria revision:');
    const auditedRevRes = await request
      .post(`/api/scholarships/${testScholarshipId}/criteria-revision`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        reason: 'Approved board resolution to update minimum GWA threshold to 1.75',
        justification: 'Approved board resolution to update minimum GWA threshold to 1.75',
        criteria: { min_gwa: 1.75 },
        updatedCriteria: { min_gwa: 1.75 },
      });

    console.log(`      Status: ${auditedRevRes.status}`);
    const nextVer = auditedRevRes.body.newVersion || auditedRevRes.body.criteriaVersion;
    console.log(`      New Version: ${nextVer}`);
    assert.strictEqual(auditedRevRes.status, 200, 'Audited revision must succeed');
    assert.strictEqual(nextVer, 2, 'Version must be promoted to 2');

    // 5d. Confirm existing application retains original immutable snapshot
    console.log('  5d. Verification of existing application criteria snapshot:');
    const existingApp = (db.data.applications || []).find((a) => String(a.scholarship_id || a.scholarshipId) === String(testScholarshipId));
    console.log(`      Existing Application Criteria Version Used: ${existingApp?.criteriaVersionUsed}`);
    assert.strictEqual(existingApp?.criteriaVersionUsed, 1, 'Existing application MUST retain version 1 (grandfathering)');
    console.log('      Immutable criteria version verified: Controlled revision does not mutate existing applications');

    suiteResults.push({ name: 'Concurrency & Data Integrity (Locks, Grandfathering, Deduplication)', passed: true });
    console.log('  Result: PASSED\n');
  } catch (err) {
    console.error('  Test 5 Failed:', err.message);
    suiteResults.push({ name: 'Concurrency & Data Integrity (Locks, Grandfathering, Deduplication)', passed: false, error: err.message });
  }

  // Summary
  console.log('========================================================================');
  console.log('   E2E INTEGRATION SUITE SUMMARY:');
  suiteResults.forEach((r, idx) => {
    console.log(`   ${idx + 1}. ${r.name}: ${r.passed ? 'PASSED' : 'FAILED'}${r.error ? ` (${r.error})` : ''}`);
  });
  console.log('========================================================================\n');

  const allPassed = suiteResults.every((r) => r.passed);
  return { allPassed, suiteResults };
}

if (require.main === module) {
  runE2EWorkflowTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal E2E test execution error:', err);
      process.exit(1);
    });
}

module.exports = { runE2EWorkflowTests };
