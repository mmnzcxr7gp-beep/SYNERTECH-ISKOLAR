const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');
const { checkOcrFallbackNeeded } = require('../src/utils/manualReviewFallbackService');

async function run() {
  console.log('🧪 Running test_missing_details_manual_review...');
  const env = await startTestServer();

  try {
    // 1. Test fallback logic for missing fields and empty text
    const emptyResult = checkOcrFallbackNeeded({
      rawText: '',
      confidence: 0,
      extractedFields: {},
      documentType: 'unknown',
    });

    assert.strictEqual(emptyResult.needsFallback, true, 'Empty text must require fallback');
    assert.strictEqual(emptyResult.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert(emptyResult.issues.includes('EMPTY_TEXT'));

    const missingFieldsResult = checkOcrFallbackNeeded({
      rawText: 'Some unformatted text without structured markers',
      confidence: 85,
      extractedFields: {}, // Missing required fields
      documentType: 'CertificateOfRegistration',
    });

    assert.strictEqual(missingFieldsResult.needsFallback, true, 'Missing fields must trigger fallback');
    assert(missingFieldsResult.issues.includes('MISSING_REQUIRED_FIELDS'));
    assert.strictEqual(missingFieldsResult.reviewStatus, 'PENDING_MANUAL_REVIEW');

    // 2. Test persistent record creation
    const student = { id: 18810, email: 'missing.fields@iskolar.test', role: 'student', isVerified: true };
    const doc = {
      id: 18811,
      student_id: student.id,
      application_id: 18812,
      filename: 'blurry_cor.png',
      originalname: 'Registration_Card.png',
      storageDriver: 'r2',
      storedKey: 'applications/18812/documents/doc/v1/blurry_cor.png',
      storageStatus: 'STORED',
      ocrStatus: 'LOW_CONFIDENCE',
      automaticCheckStatus: 'MISSING_INFORMATION',
      studentConfirmationStatus: 'NOT_REQUIRED',
      manualReviewStatus: 'PENDING',
      verificationStatus: 'PENDING_HUMAN_REVIEW',
      status: 'PENDING_HUMAN_REVIEW',
    };

    db.data.users = (db.data.users || []).filter(u => u.id !== student.id);
    db.data.users.push(student);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== doc.id);
    db.data.documents.push(doc);
    await db.write();

    const token = signToken(student);
    const res = await env.request('GET', `/api/documents/${doc.id}/manual-review`, null, token);
    assert.strictEqual(res.status, 200);
    assert(
      res.body?.reviewStatus === 'PENDING_MANUAL_REVIEW' || res.body?.reviewStatus === 'PENDING_HUMAN_REVIEW',
      `Expected pending review status, got ${res.body?.reviewStatus}`
    );
    assert(res.body?.studentNotice?.headline?.includes('Manual Review'));

    console.log('✅ [PASS] test_missing_details_manual_review: Missing details route strictly to manual review without auto-rejection');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_missing_details_manual_review:', err);
  process.exit(1);
});
