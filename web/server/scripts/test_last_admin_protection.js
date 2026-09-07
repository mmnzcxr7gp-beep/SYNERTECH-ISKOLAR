const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const onlyAdmin = { id: 9941, email: 'only.admin@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).map(u => {
      if (u.role === 'admin' && u.id !== 9941) return { ...u, accountStatus: 'SUSPENDED' };
      return u;
    });
    if (!db.data.users.find(u => u.id === 9941)) {
      db.data.users.push(onlyAdmin);
    }
    await db.write();

    const token = signToken(onlyAdmin);

    const suspRes = await env.request('PATCH', `/api/admin/accounts/${onlyAdmin.id}/suspend`, { reason: 'Attempting to suspend last active admin' }, token);
    assert(suspRes.status === 400 || suspRes.status === 403, 'Expected 400 or 403 when trying to suspend last active admin');

    console.log('✅ [PASS] test_last_admin_protection passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_last_admin_protection:', err);
  process.exit(1);
});
