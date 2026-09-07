const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING INFORMATION REQUEST FULL LIFECYCLE TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14221, email: 'admin.infolife@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14222, email: 'student.infolife@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14221, 14222].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);
    const studentToken = signToken(student);

    // 1. Admin issues Information Request
    const reqRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/request-info`, {
      message: 'Please re-upload high-resolution Certificate of Registration.',
      dueAt: new Date(Date.now() + 5 * 86400000).toISOString()
    }, adminToken);
    assert.strictEqual(reqRes.status, 200);
    assert.strictEqual(reqRes.body.account.accountStatus, 'INFORMATION_REQUIRED');

    // 2. Student responds
    const respRes = await env.request('POST', '/api/verification/respond-info', {
      response: 'Re-uploaded HD PDF.',
      supportingDocuments: ['uploads/hd_cor.pdf']
    }, studentToken);
    assert.strictEqual(respRes.status, 200);
    assert.strictEqual(respRes.body.accountStatus, 'PENDING_ADMIN_REVIEW');

    // 3. Verify status in database
    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'PENDING_ADMIN_REVIEW');

    console.log('✅ [PASS] test_information_request_lifecycle passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_information_request_lifecycle:', err);
  process.exit(1);
});
