const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_document_client_sync...');
  const env = await startTestServer();

  try {
    const admin = { id: 16608, email: 'admin.sync@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 16609, email: 'prov.sync@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const student = { id: 16610, email: 'student.sync@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const scholarship = { id: 16611, title: 'Sync Validation Grant', sponsor_id: provider.id, provider_id: provider.id, status: 'Open' };
    const application = { id: 16612, scholarship_id: scholarship.id, student_id: student.id, status: 'pending' };
    const doc = {
      id: 16613,
      user_id: student.id,
      student_id: student.id,
      application_id: application.id,
      filename: 'sync_doc.pdf',
      originalname: 'OfficialTranscript.pdf',
      storageDriver: 'r2',
      storedKey: 'applications/16612/documents/doc/v1/sync_doc.pdf',
      storageStatus: 'STORED',
      ocrStatus: 'COMPLETED',
      manualReviewStatus: 'PENDING',
      verificationStatus: 'PENDING_HUMAN_REVIEW',
      status: 'PENDING_HUMAN_REVIEW',
    };

    db.data.users = (db.data.users || []).filter(u => ![16608, 16609, 16610].includes(u.id));
    db.data.users.push(admin, provider, student);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== doc.id);
    db.data.documents.push(doc);
    await db.write();

    const studentToken = signToken(student);
    const providerToken = signToken(provider);
    const adminToken = signToken(admin);

    // 1. Student queries applications
    const studentRes = await env.request('GET', '/api/applications', null, studentToken);
    assert.strictEqual(studentRes.status, 200);

    // 2. Provider queries candidates
    const provRes = await env.request('GET', `/api/scholarships/${scholarship.id}/applications`, null, providerToken);
    assert.strictEqual(provRes.status, 200);
    const provDoc = provRes.body?.applications?.[0]?.documents?.[0];
    assert.strictEqual(provDoc?.status, 'PENDING_HUMAN_REVIEW');

    // 3. Admin queries document review
    const adminRes = await env.request('GET', `/api/documents/${doc.id}/manual-review`, null, adminToken);
    assert.strictEqual(adminRes.status, 200);
    assert(
      adminRes.body?.reviewStatus === 'PENDING_HUMAN_REVIEW' || adminRes.body?.reviewStatus === 'PENDING_MANUAL_REVIEW',
      `Expected pending review status, got: ${adminRes.body?.reviewStatus}`
    );

    console.log('✅ [PASS] test_document_client_sync: Multi-device client state synchronized with authoritative backend');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_document_client_sync:', err);
  process.exit(1);
});
