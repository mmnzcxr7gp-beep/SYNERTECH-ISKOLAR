const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_upload_does_not_verify...');
  const env = await startTestServer();

  try {
    const randSuffix = Math.floor(Math.random() * 8999) + 1000;
    const student = { id: 18000 + randSuffix, email: `stud.upload.${randSuffix}@iskolar.test`, role: 'student', isVerified: true, accountStatus: 'ACTIVE' };
    const provider = { id: 28000 + randSuffix, email: `prov.upload.${randSuffix}@iskolar.test`, role: 'sponsor', isVerified: true, accountStatus: 'ACTIVE' };
    const scholarship = { id: 38000 + randSuffix, title: 'Upload Workflow Test Grant', sponsor_id: provider.id, provider_id: provider.id, status: 'Open', requirements: ['Transcript of Records'] };

    db.data.users = (db.data.users || []).filter(u => ![student.id, provider.id].includes(u.id));
    db.data.users.push(student, provider);
    db.data.student_profiles = (db.data.student_profiles || []).filter(p => p.user_id !== student.id);
    db.data.student_profiles.push({ user_id: student.id, isVerified: true, verificationStatus: 'VERIFIED' });
    db.data.applications = (db.data.applications || []).filter(a => a.student_id !== student.id && a.studentId !== student.id);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    await db.write();

    const token = signToken(student);

    // Student submits application with file
    const res = await env.request('POST', '/api/applications', {
      scholarship_id: String(scholarship.id),
      gpa: '1.50',
      financial_need: 'High',
      documents: {
        file_0: {
          filename: 'TOR_Test.png',
          content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      }
    }, token);

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const createdApp = res.body?.application;
    const createdDoc = res.body?.documents?.[0];

    assert(createdDoc, 'Expected document object in response');

    // CRITICAL SECURITY ASSERTION: Upload must NEVER mark document as verified
    assert.notStrictEqual(createdDoc.verificationStatus, 'VERIFIED', 'Upload must not set verificationStatus to VERIFIED');
    assert.notStrictEqual(createdDoc.verificationStatus, 'VERIFIED_BY_HUMAN', 'Upload must not set verificationStatus to VERIFIED_BY_HUMAN');
    assert.notStrictEqual(createdDoc.status, 'VERIFIED', 'Upload must not set status to VERIFIED');

    // Must be PENDING_HUMAN_REVIEW
    assert.strictEqual(createdDoc.verificationStatus, 'PENDING_HUMAN_REVIEW');
    assert.strictEqual(createdDoc.manualReviewStatus, 'PENDING');
    assert.strictEqual(createdDoc.storageStatus, 'STORED');

    // Verify in database
    await db.read();
    const docInDb = (db.data.documents || []).find(d => d.id === createdDoc.id);
    assert.strictEqual(docInDb.verificationStatus, 'PENDING_HUMAN_REVIEW');

    console.log('✅ [PASS] test_upload_does_not_verify: Document upload strictly defaults to PENDING_HUMAN_REVIEW');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_upload_does_not_verify:', err);
  process.exit(1);
});
