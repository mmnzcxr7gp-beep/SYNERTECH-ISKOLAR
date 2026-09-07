const assert = require('assert');
const bcrypt = require('bcrypt');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING REJECTION ACCESS DENIAL AND NOTIFICATION TEST');
  const env = await startTestServer();
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = { id: 14231, email: 'admin.rejdenial@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14232, email: 'student.rejdenial@iskolar.test', password: passwordHash, role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14231, 14232].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    // 1. Admin rejects
    const rejRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/reject`, {
      reason: 'Academic requirements not met; GPA below minimum scholarship threshold.'
    }, adminToken);
    assert.strictEqual(rejRes.status, 200);

    // 2. Protected route rejection
    const studentToken = signToken(student);
    const meRes = await env.request('GET', '/api/auth/me', null, studentToken);
    assert.strictEqual(meRes.status, 403);
    assert.strictEqual(meRes.body.code, 'ACCOUNT_REJECTED');

    // 3. Login rejection
    const loginRes = await env.request('POST', '/api/auth/login', {
      email: 'student.rejdenial@iskolar.test',
      password: 'Password123!',
      skipMfa: true
    });
    assert.strictEqual(loginRes.status, 403);

    console.log('✅ [PASS] test_rejection_access_denial passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_rejection_access_denial:', err);
  process.exit(1);
});
