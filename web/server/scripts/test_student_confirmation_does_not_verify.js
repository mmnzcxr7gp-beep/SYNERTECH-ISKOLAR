const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_student_confirmation_does_not_verify...');
  const env = await startTestServer();

  try {
    const student = { id: 18807, email: 'stud.confirm@iskolar.test', role: 'student', isVerified: true };
    const doc = {
      id: 18808,
      student_id: student.id,
      application_id: 18809,
      filename: 'student_confirm_doc.pdf',
      originalname: 'Student_COR.pdf',
      storageDriver: 'r2',
      storedKey: 'applications/18809/documents/doc/v1/student_confirm_doc.pdf',
      storageStatus: 'STORED',
      ocrStatus: 'COMPLETED',
      automaticCheckStatus: 'PASS',
      studentConfirmationStatus: 'PENDING',
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

    // Student confirms OCR extracted data via OCR confirmation endpoint
    const res = await env.request('POST', '/api/ocr/confirm', {
      documentId: String(doc.id),
      applicationId: String(doc.application_id),
      confirmedFields: {
        school: 'Polytechnic University of the Philippines',
        gwa: '1.25',
      },
    }, token);

    assert(res.status === 200 || res.status === 201, `Expected success status, got ${res.status}`);

    // Verify document in database
    await db.read();
    const storedDoc = db.data.documents.find(d => d.id === doc.id);
    assert(storedDoc, 'Document must exist in database');

    // CRITICAL ASSERTION: Student confirmation must NOT assign VERIFIED_BY_HUMAN
    assert.notStrictEqual(storedDoc.verificationStatus, 'VERIFIED_BY_HUMAN');
    assert.notStrictEqual(storedDoc.status, 'VERIFIED');
    assert.strictEqual(storedDoc.verificationStatus, 'PENDING_HUMAN_REVIEW');
    assert.strictEqual(storedDoc.manualReviewStatus, 'PENDING');

    console.log('✅ [PASS] test_student_confirmation_does_not_verify: Student confirmation preserves PENDING_HUMAN_REVIEW');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_student_confirmation_does_not_verify:', err);
  process.exit(1);
});
