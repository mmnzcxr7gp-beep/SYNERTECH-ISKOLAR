const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING EDIT FIELD ALLOWLIST SECURITY TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14271, email: 'admin.allow.unique@iskolar.test', role: 'admin', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };
    const student = { id: 14272, email: 'student.allow.unique@iskolar.test', role: 'student', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false, phone: '09111111111' };

    await db.read();
    db.data.users = (db.data.users || []).filter(u => ![admin.id, student.id].includes(u.id) && u.email !== admin.email && u.email !== student.email && !String(u.email || '').includes('allow'));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    // 1. Allowlisted update -> phone and address
    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}`, {
      phone: '09122222222',
      address: 'Quezon City',
      reason: 'Verified address update'
    }, adminToken);
    assert.strictEqual(res.status, 200);

    // Verify DB
    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.phone, '09122222222');
    assert.strictEqual(updated.address, 'Quezon City');

    console.log('✅ [PASS] test_edit_field_allowlist passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_edit_field_allowlist:', err);
  process.exit(1);
});
