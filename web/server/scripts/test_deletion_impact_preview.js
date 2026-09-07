const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING DELETION IMPACT PREVIEW TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14311, email: 'admin.impact@iskolar.test', role: 'admin', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };
    const student = { id: 14312, email: 'student.impact@iskolar.test', role: 'student', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };

    await db.read();
    db.data.users = (db.data.users || []).filter(u => ![14311, 14312].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    // Request impact preview only (simulate query parameter impactPreview=true)
    const res = await env.request('DELETE', `/api/admin/accounts/${student.id}?impactPreview=true`, null, adminToken);
    assert.strictEqual(res.status, 200);
    assert(res.body.impactPreview, 'Must return impactPreview metadata');
    assert.strictEqual(res.body.impactPreview.accountId, student.id);
    assert(res.body.impactPreview.retentionPolicy);

    console.log('✅ [PASS] test_deletion_impact_preview passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_deletion_impact_preview:', err);
  process.exit(1);
});
