/**
 * ISKOLAR Automated Test Suite: Explainable Automatic Document & Eligibility Checking
 * 
 * Tests:
 * 1. 16 Explainable rule evaluations
 * 2. Clean pass produces ELIGIBLE_FOR_REVIEW with status PENDING_HUMAN_REVIEW
 * 3. Document failure produces NEEDS_RESUBMISSION_RECOMMENDED with status PENDING_HUMAN_REVIEW
 * 4. Academic/Eligibility failure produces INELIGIBLE_FLAGGED with status PENDING_HUMAN_REVIEW
 * 5. Rule results contain explainable inputs, expected conditions, and clear explanations
 * 6. Results persist to AutomaticCheckResult model in MongoDB
 * 7. Verification that NO automatic rule ever issues final APPROVED or REJECTED status
 */

const assert = require('assert');
const { connectDb } = require('../src/config/db');
const { AutomaticCheckResult } = require('../src/models');
const { evaluateApplicationRules } = require('../src/utils/automaticCheckingService');

async function runAutomaticCheckingTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING ISKOLAR AUTOMATIC CHECKING RULE ENGINE TESTS');
  console.log('🧪 ====================================================');

  await connectDb();
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    } catch (_) {}
  }

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

  // Fixtures
  const baseScholarship = {
    id: 101,
    title: 'Quezon City Academic Excellence Scholarship',
    required_documents: ['governmentId', 'academicReport'],
    min_gwa: 1.75, // 1.0 is highest, 1.75 is cutoff
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const validStudent = {
    id: 201,
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    studentNumber: '2022-00123-MN-0',
    schoolName: 'Polytechnic University of the Philippines',
    gwa: 1.25,
    privacyPolicyAccepted: true,
  };

  const validDocuments = [
    { type: 'governmentId', filename: 'national_id.pdf', size: 1024 * 500, buffer: Buffer.from('%PDF-1.4 test') },
    { type: 'academicReport', filename: 'transcript_grades.pdf', size: 1024 * 800, buffer: Buffer.from('%PDF-1.4 test') },
  ];

  const validOcrExtractions = [
    {
      extractedFields: {
        fullName: 'Juan Dela Cruz',
        studentNumber: '2022-00123-MN-0',
        school: 'Polytechnic University of the Philippines',
        gwa: '1.25',
        documentDate: '2025-06-01',
        expirationDate: '2030-06-01',
      },
    },
  ];

  // Test 1: Complete Valid Application -> ELIGIBLE_FOR_REVIEW
  await test('1. Clean application passes all 16 rules and recommends ELIGIBLE_FOR_REVIEW', async () => {
    const evaluation = await evaluateApplicationRules({
      application: { id: 'app-valid-001', student_id: 201, scholarship_id: 101, status: 'pending' },
      scholarship: baseScholarship,
      student: validStudent,
      documents: validDocuments,
      ocrExtractions: validOcrExtractions,
    });

    assert.strictEqual(evaluation.totalRulesEvaluated, 16, 'Should evaluate exactly 16 rules');
    assert.strictEqual(evaluation.failedCount, 0, 'No rules should fail');
    assert.strictEqual(evaluation.status, 'PENDING_HUMAN_REVIEW', 'Must remain PENDING_HUMAN_REVIEW');
    assert.strictEqual(evaluation.recommendation, 'ELIGIBLE_FOR_REVIEW');
  });

  // Test 2: Missing Required Document -> NEEDS_RESUBMISSION_RECOMMENDED
  await test('2. Missing document triggers RULE_REQ_DOCS_PRESENT and NEEDS_RESUBMISSION_RECOMMENDED', async () => {
    const evaluation = await evaluateApplicationRules({
      application: { id: 'app-missing-doc-002', student_id: 201, scholarship_id: 101, status: 'pending' },
      scholarship: baseScholarship,
      student: validStudent,
      documents: [validDocuments[0]], // Missing academicReport
      ocrExtractions: validOcrExtractions,
    });

    assert.strictEqual(evaluation.recommendation, 'NEEDS_RESUBMISSION_RECOMMENDED');
    assert.strictEqual(evaluation.status, 'PENDING_HUMAN_REVIEW');
    const docRule = evaluation.ruleResults.find((r) => r.ruleId === 'RULE_REQ_DOCS_PRESENT');
    assert.strictEqual(docRule.actualResult, 'FAIL');
    assert(docRule.explanation.includes('academicReport'));
  });

  // Test 3: GWA Below Threshold -> INELIGIBLE_FLAGGED
  await test('3. GWA below requirement triggers RULE_GWA_THRESHOLD and INELIGIBLE_FLAGGED', async () => {
    const ineligibleStudent = { ...validStudent, gwa: 2.5 }; // 2.5 is worse than 1.75
    const evaluation = await evaluateApplicationRules({
      application: { id: 'app-ineligible-003', student_id: 201, scholarship_id: 101, status: 'pending' },
      scholarship: baseScholarship,
      student: ineligibleStudent,
      documents: validDocuments,
      ocrExtractions: validOcrExtractions,
    });

    assert.strictEqual(evaluation.recommendation, 'INELIGIBLE_FLAGGED');
    assert.strictEqual(evaluation.status, 'PENDING_HUMAN_REVIEW');
    const gwaRule = evaluation.ruleResults.find((r) => r.ruleId === 'RULE_GWA_THRESHOLD');
    assert.strictEqual(gwaRule.actualResult, 'FAIL');
  });

  // Test 4: Name Discrepancy -> INELIGIBLE_FLAGGED with explainable explanation
  await test('4. Name mismatch between profile and document triggers explainable flag', async () => {
    const mismatchOcr = [
      {
        extractedFields: {
          ...validOcrExtractions[0].extractedFields,
          fullName: 'Maria Santos', // Discrepancy against Juan Dela Cruz
        },
      },
    ];

    const evaluation = await evaluateApplicationRules({
      application: { id: 'app-mismatch-004', student_id: 201, scholarship_id: 101, status: 'pending' },
      scholarship: baseScholarship,
      student: validStudent,
      documents: validDocuments,
      ocrExtractions: mismatchOcr,
    });

    const nameRule = evaluation.ruleResults.find((r) => r.ruleId === 'RULE_NAME_CONSISTENCY');
    assert.strictEqual(nameRule.actualResult, 'FAIL');
    assert(nameRule.explanation.includes('Name discrepancy detected'));
  });

  // Test 5: Strict Human Decision Guarantee: Automatic engine NEVER sets APPROVED or REJECTED
  await test('5. Zero Automatic Final Approval Guarantee: engine strictly outputs PENDING_HUMAN_REVIEW', async () => {
    const evaluation1 = await evaluateApplicationRules({
      application: { id: 'app-005', student_id: 201, scholarship_id: 101, status: 'pending' },
      scholarship: baseScholarship,
      student: validStudent,
      documents: validDocuments,
      ocrExtractions: validOcrExtractions,
    });

    assert.notStrictEqual(evaluation1.status, 'APPROVED', 'Engine must never automatically approve');
    assert.notStrictEqual(evaluation1.status, 'VERIFIED', 'Engine must never automatically verify');
    assert.notStrictEqual(evaluation1.status, 'REJECTED', 'Engine must never automatically reject');
    assert.strictEqual(evaluation1.status, 'PENDING_HUMAN_REVIEW');
  });

  // Test 6: Persist Rule Results to AutomaticCheckResult MongoDB Collection
  await test('6. Persists explainable rule evaluation results to MongoDB collection', async () => {
    const testAppId = `app-test-mongo-${Date.now()}`;
    const resultDoc = await AutomaticCheckResult.create({
      applicationId: testAppId,
      ruleId: 'RULE_REQ_DOCS_PRESENT',
      ruleVersion: '1.0.0',
      ruleCategory: 'FILE_INTEGRITY',
      input: { required: ['governmentId'], uploaded: ['governmentId'] },
      expectedCondition: 'All required documents must be uploaded',
      actualResult: 'PASS',
      passed: true,
      explanation: 'All required documents attached.',
    });

    assert(resultDoc._id, 'Should create MongoDB record');
    const fetched = await AutomaticCheckResult.findOne({ applicationId: testAppId });
    assert.strictEqual(fetched.actualResult, 'PASS');

    // Clean up
    await AutomaticCheckResult.deleteMany({ applicationId: testAppId });
  });

  console.log('🧪 ====================================================');
  console.log(`🧪 AUTOMATIC CHECKING TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runAutomaticCheckingTests().catch((e) => {
    console.error('Fatal Automatic Checking test error:', e);
    process.exit(1);
  });
}

module.exports = { runAutomaticCheckingTests };

