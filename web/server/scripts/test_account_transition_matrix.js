const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING COMPLETE ACCOUNT STATUS TRANSITION MATRIX TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14001, email: 'admin.matrix@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const adminToken = signToken(admin);

    db.data.users = (db.data.users || []).filter(u => u.id !== 14001);
    db.data.users.push(admin);
    await db.write();

    // 1. Valid Transition: PENDING_ADMIN_REVIEW -> ACTIVE (Verify)
    {
      const user = { id: 14002, email: 'u2@test.local', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/verify`, { reason: 'Valid verify' }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    }

    // 2. Valid Transition: PENDING_ADMIN_REVIEW -> INFORMATION_REQUIRED
    {
      const user = { id: 14003, email: 'u3@test.local', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/request-info`, { message: 'Need document' }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.account.accountStatus, 'INFORMATION_REQUIRED');
    }

    // 3. Valid Transition: INFORMATION_REQUIRED -> PENDING_ADMIN_REVIEW (User Response)
    {
      const user = { id: 14004, email: 'u4@test.local', role: 'student', accountStatus: 'INFORMATION_REQUIRED' };
      db.data.users.push(user);
      await db.write();
      const userToken = signToken(user);
      const res = await env.request('POST', '/api/verification/respond-info', { response: 'Here is document' }, userToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.accountStatus, 'PENDING_ADMIN_REVIEW');
    }

    // 4. Valid Transition: ACTIVE -> SUSPENDED
    {
      const user = { id: 14005, email: 'u5@test.local', role: 'provider', accountStatus: 'ACTIVE' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/suspend`, { reason: 'Valid suspend' }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.account.accountStatus, 'SUSPENDED');
    }

    // 5. Valid Transition: SUSPENDED -> ACTIVE (Reactivate)
    {
      const user = { id: 14006, email: 'u6@test.local', role: 'student', accountStatus: 'SUSPENDED' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/reactivate`, { reason: 'Valid reactivate' }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    }

    // 6. Valid Transition: ACTIVE -> ARCHIVED
    {
      const user = { id: 14007, email: 'u7@test.local', role: 'provider', accountStatus: 'ACTIVE' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/archive`, { reason: 'Valid archive' }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.account.accountStatus, 'ARCHIVED');
    }

    // 7. Valid Transition: ARCHIVED -> ACTIVE (Restore)
    {
      const user = { id: 14008, email: 'u8@test.local', role: 'provider', accountStatus: 'ARCHIVED' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('POST', `/api/admin/accounts/${user.id}/restore`, { reason: 'Valid restore' }, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    }

    // 8. Invalid Transition: REJECTED -> Suspend (must return 409)
    {
      const user = { id: 14009, email: 'u9@test.local', role: 'student', accountStatus: 'REJECTED' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/suspend`, { reason: 'Invalid suspend' }, adminToken);
      assert.strictEqual(res.status, 409, 'REJECTED -> Suspend must be rejected with 409');
    }

    // 9. Invalid Transition: DELETED -> Reactivate (must return 409)
    {
      const user = { id: 14010, email: 'u10@test.local', role: 'student', accountStatus: 'DELETED' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/reactivate`, { reason: 'Invalid reactivate' }, adminToken);
      assert.strictEqual(res.status, 409, 'DELETED -> Reactivate must be rejected with 409');
    }

    // 10. Invalid Transition: PENDING_ADMIN_REVIEW -> Restore (must return 409)
    {
      const user = { id: 14011, email: 'u11@test.local', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('POST', `/api/admin/accounts/${user.id}/restore`, { reason: 'Invalid restore' }, adminToken);
      assert.strictEqual(res.status, 409, 'PENDING_ADMIN_REVIEW -> Restore must be rejected with 409');
    }

    // 11. Invalid Transition: ARCHIVED -> Verify (must return 409)
    {
      const user = { id: 14012, email: 'u12@test.local', role: 'provider', accountStatus: 'ARCHIVED' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}/verify`, { reason: 'Invalid verify' }, adminToken);
      assert.strictEqual(res.status, 409, 'ARCHIVED -> Verify must be rejected with 409');
    }

    // 12. Invalid Transition: DELETION_PENDING -> Edit (must return 409)
    {
      const user = { id: 14013, email: 'u13@test.local', role: 'student', accountStatus: 'DELETION_PENDING' };
      db.data.users.push(user);
      await db.write();
      const res = await env.request('PATCH', `/api/admin/accounts/${user.id}`, { phone: '09123456789', reason: 'Invalid edit' }, adminToken);
      assert.strictEqual(res.status, 409, 'DELETION_PENDING -> Edit must be rejected with 409');
    }

    console.log('✅ [PASS] test_account_transition_matrix passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_transition_matrix:', err);
  process.exit(1);
});
