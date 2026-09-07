const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 10041, email: 'admin.persist@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 10042, email: 'student.persist@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![10041, 10042].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    await env.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, { reason: 'Suspended prior to cold restart' }, token);

    // Simulate cold restart by reading persistent storage from disk
    await db.read();

    const reloadedStudent = db.data.users.find(u => u.id === student.id);
    assert(reloadedStudent, 'Student must exist after restart');
    assert.strictEqual(reloadedStudent.accountStatus, 'SUSPENDED');
    assert.strictEqual(reloadedStudent.isSuspended, true);

    console.log('✅ [PASS] test_account_restart_persistence passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_account_restart_persistence:', err);
  process.exit(1);
});
