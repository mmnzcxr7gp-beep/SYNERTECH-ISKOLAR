const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING EDIT MASS ASSIGNMENT FORBIDDEN FIELDS DENIAL TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14281, email: 'admin.mass.unique@iskolar.test', role: 'admin', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };
    const student = { id: 14282, email: 'student.mass.unique@iskolar.test', role: 'student', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };

    await db.read();
    db.data.users = (db.data.users || []).filter(u => ![admin.id, student.id].includes(u.id) && u.email !== admin.email && u.email !== student.email && !String(u.email || '').includes('mass'));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    // Attempt to tamper with passwordHash, role, otp, and audit_logs
    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}`, {
      passwordHash: 'injected_hash',
      otp: '123456',
      role: 'admin',
      reason: 'Attempted privilege escalation'
    }, adminToken);

    assert.strictEqual(res.status, 403, 'Must reject forbidden fields with 403');
    assert(res.body.forbiddenFields.includes('passwordHash'));

    console.log('✅ [PASS] test_edit_mass_assignment_denial passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_edit_mass_assignment_denial:', err);
  process.exit(1);
});
