const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin1 = { id: 9951, email: 'admin1.self@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const admin2 = { id: 9952, email: 'admin2.self@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9951, 9952].includes(u.id));
    db.data.users.push(admin1, admin2);
    await db.write();

    const token1 = signToken(admin1);

    // Admin 1 attempts to suspend their own account
    const suspRes = await env.request('PATCH', `/api/admin/accounts/${admin1.id}/suspend`, { reason: 'Admin trying to suspend themselves' }, token1);
    assert(suspRes.status === 400 || suspRes.status === 403);

    // Admin 1 attempts to delete their own account
    const delRes = await env.request('POST', `/api/admin/accounts/${admin1.id}/soft-delete`, { reason: 'Admin trying to delete themselves' }, token1);
    assert(delRes.status === 400 || delRes.status === 403);

    console.log('✅ [PASS] test_admin_self_deletion_protection passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_self_deletion_protection:', err);
  process.exit(1);
});
