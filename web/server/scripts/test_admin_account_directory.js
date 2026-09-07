const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9811, email: 'admin.dir@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9812, email: 'student.dir@iskolar.test', role: 'student', name: 'Directory Student', schoolName: 'UP Diliman', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![9811, 9812].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // List all
    const res1 = await env.request('GET', '/api/admin/accounts', null, token);
    assert.strictEqual(res1.status, 200);
    assert(Array.isArray(res1.body.accounts));
    assert(res1.body.pagination);

    // Filter by role
    const res2 = await env.request('GET', '/api/admin/accounts?role=student', null, token);
    assert.strictEqual(res2.status, 200);
    assert(res2.body.accounts.every(a => a.role === 'student'));

    // Search query
    const res3 = await env.request('GET', '/api/admin/accounts?search=Directory', null, token);
    assert.strictEqual(res3.status, 200);
    assert(res3.body.accounts.some(a => a.id === 9812));

    console.log('✅ [PASS] test_admin_account_directory passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_directory:', err);
  process.exit(1);
});
