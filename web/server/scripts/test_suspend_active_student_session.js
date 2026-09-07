const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING SUSPEND ACTIVE STUDENT SESSION TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14241, email: 'admin.actstud@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14242, email: 'student.actstud@iskolar.test', role: 'student', accountStatus: 'ACTIVE', isSuspended: false };

    db.data.users = (db.data.users || []).filter(u => ![14241, 14242].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);
    const studentToken = signToken(student);

    // 1. Initial request succeeds
    const res1 = await env.request('GET', '/api/auth/me', null, studentToken);
    assert.strictEqual(res1.status, 200);

    // 2. Admin suspends student
    const suspRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, {
      reason: 'Urgent compliance hold'
    }, adminToken);
    assert.strictEqual(suspRes.status, 200);

    // 3. Same active session immediately rejected
    const res2 = await env.request('GET', '/api/auth/me', null, studentToken);
    assert.strictEqual(res2.status, 403);
    assert.strictEqual(res2.body.code, 'ACCOUNT_SUSPENDED');

    console.log('✅ [PASS] test_suspend_active_student_session passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_suspend_active_student_session:', err);
  process.exit(1);
});
