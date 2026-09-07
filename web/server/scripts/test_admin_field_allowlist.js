const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9851, email: 'admin.allow@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9852, email: 'student.allow@iskolar.test', role: 'student', name: 'Allow Student', phone: '09123456789', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9851, 9852].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}`, {
      phone: '09998887777',
      address: '123 Rizal Ave',
      city: 'Manila',
      reason: 'Phone number updated per student request'
    }, token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.phone, '09998887777');
    assert.strictEqual(res.body.account.address, '123 Rizal Ave');
    assert.strictEqual(res.body.account.city, 'Manila');

    console.log('✅ [PASS] test_admin_field_allowlist passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_field_allowlist:', err);
  process.exit(1);
});
