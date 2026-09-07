const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 10001, email: 'admin.notif@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 10002, email: 'student.notif@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![10001, 10002].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Credentials verified' }, adminToken);
    assert.strictEqual(res.status, 200);

    await db.read();
    const notif = (db.data.notifications || []).find(n => String(n.userId || n.user_id || n.recipient_id) === String(student.id) && (n.type === 'ACCOUNT_VERIFIED' || (n.title && n.title.includes('Verified'))));
    assert(notif, 'Expected notification created for verified student account');

    console.log('✅ [PASS] test_account_owner_notification passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_account_owner_notification:', err);
  process.exit(1);
});
