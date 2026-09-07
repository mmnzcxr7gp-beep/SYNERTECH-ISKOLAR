const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9981, email: 'admin.ret@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9982, email: 'student.ret@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const application = {
      id: 9983,
      student_id: student.id,
      studentId: student.id,
      scholarship_id: 101,
      status: 'approved',
      appliedAt: new Date().toISOString()
    };

    db.data.users = (db.data.users || []).filter(u => ![9981, 9982].includes(u.id));
    db.data.users.push(admin, student);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== 9983);
    db.data.applications.push(application);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('POST', `/api/admin/accounts/${student.id}/soft-delete`, { reason: 'Student account soft deletion test' }, token);
    assert.strictEqual(res.status, 200);

    await db.read();
    const appEntry = db.data.applications.find(a => a.id === 9983);
    assert(appEntry, 'Student application must be preserved for audit & provider records');
    assert.strictEqual(appEntry.status, 'approved');

    console.log('✅ [PASS] test_student_history_retention passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_student_history_retention:', err);
  process.exit(1);
});
