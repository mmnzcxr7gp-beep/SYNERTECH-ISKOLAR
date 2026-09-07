const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN ACTION SOCKET RECOVERY AND REST NOTIFICATIONS TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14341, email: 'admin.sockrec@iskolar.test', role: 'admin', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };
    const student = { id: 14342, email: 'student.sockrec@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW', isSuspended: false, isDeleted: false };

    await db.read();
    db.data.users = (db.data.users || []).filter(u => ![14341, 14342].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);
    const studentToken = signToken(student);

    // Perform action while student is offline (simulate missed socket event)
    const verRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Offline verify' }, adminToken);
    assert.strictEqual(verRes.status, 200);

    // Student reconnects and fetches missed notifications via REST API
    const notifRes = await env.request('GET', '/api/notifications', null, studentToken);
    assert.strictEqual(notifRes.status, 200);

    const notifs = notifRes.body.notifications || [];
    const hasAccountVerified = notifs.some(n => n.type === 'ACCOUNT_VERIFIED' || n.title?.includes('Verification Approved'));
    assert(hasAccountVerified, 'Missed notification must be recovered from persistent ledger upon REST reconnect');

    console.log('✅ [PASS] test_admin_action_socket_recovery passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_action_socket_recovery:', err);
  process.exit(1);
});
