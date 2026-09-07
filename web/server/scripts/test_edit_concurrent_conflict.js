const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING EDIT CONCURRENT CONFLICT TEST');
  const env = await startTestServer();
  try {
    const admin1 = { id: 14291, email: 'admin1.concedit@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const admin2 = { id: 14292, email: 'admin2.concedit@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14293, email: 'student.concedit@iskolar.test', role: 'student', accountStatus: 'ACTIVE', phone: '09170000000' };

    db.data.users = (db.data.users || []).filter(u => ![14291, 14292, 14293].includes(u.id));
    db.data.users.push(admin1, admin2, student);
    await db.write();

    const token1 = signToken(admin1);
    const token2 = signToken(admin2);

    const [res1, res2] = await Promise.all([
      env.request('PATCH', `/api/admin/accounts/${student.id}`, { phone: '09171111111', reason: 'Admin 1 update' }, token1),
      env.request('PATCH', `/api/admin/accounts/${student.id}`, { phone: '09172222222', reason: 'Admin 2 update' }, token2),
    ]);

    assert([200, 409].includes(res1.status));
    assert([200, 409].includes(res2.status));

    // Verify DB integrity
    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert(['09171111111', '09172222222'].includes(updated.phone));

    console.log('✅ [PASS] test_edit_concurrent_conflict passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_edit_concurrent_conflict:', err);
  process.exit(1);
});
