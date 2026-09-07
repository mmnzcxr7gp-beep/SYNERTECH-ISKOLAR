const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_ocr_success_does_not_verify...');
  const env = await startTestServer();

  try {
    const student = { id: 18804, email: 'stud.ocr@iskolar.test', role: 'student', isVerified: true };
    const doc = {
      id: 18805,
      student_id: student.id,
      application_id: 18806,
      filename: 'perfect_ocr_doc.pdf',
      originalname: 'Official_TOR.pdf',
      storageDriver: 'r2',
      storedKey: 'applications/18806/documents/doc/v1/perfect_ocr_doc.pdf',
      storageStatus: 'STORED',
      ocrStatus: 'COMPLETED',
      automaticCheckStatus: 'PASS',
      studentConfirmationStatus: 'CONFIRMED',
      manualReviewStatus: 'PENDING',
      verificationStatus: 'PENDING_HUMAN_REVIEW',
      status: 'PENDING_HUMAN_REVIEW',
      ocrData: {
        confidenceScore: 99.8,
        status: 'COMPLETED',
        rawText: 'POLYTECHNIC UNIVERSITY OF THE PHILIPPINES - OFFICIAL TRANSCRIPT OF RECORDS GWA 1.20',
        fields: {
          gwa: '1.20',
          institution: 'Polytechnic University of the Philippines',
          studentName: 'Student Test',
        }
      }
    };

    db.data.users = (db.data.users || []).filter(u => u.id !== student.id);
    db.data.users.push(student);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== doc.id);
    db.data.documents.push(doc);
    await db.write();

    const token = signToken(student);

    // Fetch document details via manual review / document endpoint
    const res = await env.request('GET', `/api/documents/${doc.id}/manual-review`, null, token);
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);

    // Verify status is not auto-verified
    assert.notStrictEqual(res.body?.verificationStatus, 'VERIFIED_BY_HUMAN');
    assert.notStrictEqual(res.body?.reviewStatus, 'VERIFIED');
    assert(
      res.body?.reviewStatus === 'PENDING_HUMAN_REVIEW' || res.body?.reviewStatus === 'PENDING_MANUAL_REVIEW',
      `Expected pending review status, got: ${res.body?.reviewStatus}`
    );

    // Confirm in database
    await db.read();
    const storedDoc = db.data.documents.find(d => d.id === doc.id);
    assert.strictEqual(storedDoc.verificationStatus, 'PENDING_HUMAN_REVIEW');
    assert.strictEqual(storedDoc.manualReviewStatus, 'PENDING');

    console.log('✅ [PASS] test_ocr_success_does_not_verify: 100% confidence OCR provides advisory data only; remains PENDING_HUMAN_REVIEW');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_ocr_success_does_not_verify:', err);
  process.exit(1);
});
