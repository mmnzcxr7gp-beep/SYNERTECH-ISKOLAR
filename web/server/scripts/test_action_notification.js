const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ACCOUNT OWNER NOTIFICATION TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12061, email: 'admin.notif@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12062, email: 'student.notif@iskolar.test', role: 'student', isVerified: false, accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![12061, 12062].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, {
      reason: 'National ID verified'
    }, token);

    assert.strictEqual(res.status, 200);

    // Verify notification was dispatched
    await db.read();
    const notif = (db.data.notifications || []).find(n => String(n.user_id || n.userId) === String(student.id));
    assert(notif, 'Expected notification record dispatched to verified account owner');

    console.log('✅ [PASS] test_action_notification passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_action_notification:', err);
  process.exit(1);
});
