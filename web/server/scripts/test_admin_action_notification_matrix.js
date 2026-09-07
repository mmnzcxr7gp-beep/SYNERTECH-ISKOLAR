const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN ACTION NOTIFICATION MATRIX TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14331, email: 'admin.notifmat@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14332, email: 'student.notifmat@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14331, 14332].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    // 1. Verify notification
    await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Verify check' }, adminToken);
    // 2. Suspend notification
    await env.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, { reason: 'Suspend check' }, adminToken);

    await db.read();
    const userNotifs = (db.data.notifications || []).filter(n => String(n.user_id || n.userId) === String(student.id));
    assert(userNotifs.length >= 2, 'Expected at least 2 persistent notifications created for target user');

    const hasVerifyNotif = userNotifs.some(n => n.type === 'ACCOUNT_VERIFIED');
    const hasSuspendNotif = userNotifs.some(n => n.type === 'ACCOUNT_SUSPENDED');
    assert(hasVerifyNotif && hasSuspendNotif, 'Must contain both verification and suspension notifications');

    console.log('✅ [PASS] test_admin_action_notification_matrix passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_action_notification_matrix:', err);
  process.exit(1);
});
