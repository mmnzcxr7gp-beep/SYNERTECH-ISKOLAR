const assert = require('assert');
const jwt = require('jsonwebtoken');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ALL ADMIN ACTIONS AUTHORIZATION MATRIX TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14101, email: 'admin.auth@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14102, email: 'student.auth@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const provider = { id: 14103, email: 'provider.auth@iskolar.test', role: 'provider', accountStatus: 'ACTIVE' };
    const target = { id: 14104, email: 'target.auth@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14101, 14102, 14103, 14104].includes(u.id));
    db.data.users.push(admin, student, provider, target);
    await db.write();

    const adminToken = signToken(admin);
    const studentToken = signToken(student);
    const providerToken = signToken(provider);
    const mfaIntermediateToken = jwt.sign({ id: 14105, email: 'mfa@test.local', purpose: 'mfa' }, process.env.JWT_SECRET || 'test-isolated-jwt-secret-2026', { expiresIn: '1h' });
    const expiredToken = jwt.sign({ id: 14101, email: 'admin.auth@iskolar.test', role: 'admin' }, process.env.JWT_SECRET || 'test-isolated-jwt-secret-2026', { expiresIn: '-1s' });
    const tamperedToken = adminToken.slice(0, -5) + 'xxxxx';

    const routesToTest = [
      { method: 'PATCH', path: `/api/admin/accounts/${target.id}/verify`, body: { reason: 'Test reason' } },
      { method: 'PATCH', path: `/api/admin/accounts/${target.id}/suspend`, body: { reason: 'Test reason' } },
      { method: 'PATCH', path: `/api/admin/accounts/${target.id}/archive`, body: { reason: 'Test reason' } },
      { method: 'POST', path: `/api/admin/accounts/${target.id}/delete-request`, body: { reason: 'Test reason' } },
    ];

    for (const r of routesToTest) {
      // 1. Anonymous -> 401
      const anonRes = await env.request(r.method, r.path, r.body, null);
      assert.strictEqual(anonRes.status, 401, `${r.method} ${r.path} must return 401 for anonymous`);

      // 2. Expired JWT -> 401
      const expRes = await env.request(r.method, r.path, r.body, expiredToken);
      assert.strictEqual(expRes.status, 401, `${r.method} ${r.path} must return 401 for expired token`);

      // 3. Tampered JWT -> 401
      const tampRes = await env.request(r.method, r.path, r.body, tamperedToken);
      assert.strictEqual(tampRes.status, 401, `${r.method} ${r.path} must return 401 for tampered token`);

      // 4. Temporary MFA token -> 401
      const mfaRes = await env.request(r.method, r.path, r.body, mfaIntermediateToken);
      assert.strictEqual(mfaRes.status, 401, `${r.method} ${r.path} must return 401 for intermediate MFA token`);

      // 5. Student role -> 403
      const studRes = await env.request(r.method, r.path, r.body, studentToken);
      assert.strictEqual(studRes.status, 403, `${r.method} ${r.path} must return 403 for student`);

      // 6. Provider role -> 403
      const provRes = await env.request(r.method, r.path, r.body, providerToken);
      assert.strictEqual(provRes.status, 403, `${r.method} ${r.path} must return 403 for provider`);
    }

    console.log('✅ [PASS] test_all_admin_actions_authorization_matrix passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_all_admin_actions_authorization_matrix:', err);
  process.exit(1);
});
