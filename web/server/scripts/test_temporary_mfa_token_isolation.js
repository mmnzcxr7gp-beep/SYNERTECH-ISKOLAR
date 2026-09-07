const assert = require('assert');
const jwt = require('jsonwebtoken');
const { startTestServer, db, TEST_JWT_SECRET } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_temporary_mfa_token_isolation...');
  const env = await startTestServer();

  try {
    const admin = { id: 19904, email: 'admin.mfa@iskolar.test', role: 'admin' };
    const provider = { id: 19905, email: 'provider.mfa@iskolar.test', role: 'sponsor' };
    const student = { id: 19906, email: 'student.mfa@iskolar.test', role: 'student' };

    db.data.users = (db.data.users || []).filter(u => ![19904, 19905, 19906].includes(u.id));
    db.data.users.push(admin, provider, student);
    await db.write();

    // Create intermediate MFA tokens
    const adminMfaToken = jwt.sign({ id: admin.id, email: admin.email, role: 'admin', purpose: 'mfa' }, TEST_JWT_SECRET, { expiresIn: '10m' });
    const providerMfaToken = jwt.sign({ id: provider.id, email: provider.email, role: 'sponsor', purpose: 'mfa' }, TEST_JWT_SECRET, { expiresIn: '10m' });
    const studentMfaToken = jwt.sign({ id: student.id, email: student.email, role: 'student', purpose: 'mfa' }, TEST_JWT_SECRET, { expiresIn: '10m' });

    // 1. Attempt admin route with intermediate MFA token
    const adminRes = await env.request('GET', '/api/admin/overview', null, adminMfaToken);
    assert.strictEqual(adminRes.status, 401, 'Intermediate MFA token must be denied access to admin routes');
    assert(adminRes.body?.message?.includes('MFA'), 'Expected MFA isolation error message');

    // 2. Attempt provider dashboard with intermediate MFA token
    const providerRes = await env.request('GET', '/api/providers/dashboard', null, providerMfaToken);
    assert.strictEqual(providerRes.status, 401, 'Intermediate MFA token must be denied access to provider routes');

    // 3. Attempt student application list with intermediate MFA token
    const studentRes = await env.request('GET', '/api/applications', null, studentMfaToken);
    assert.strictEqual(studentRes.status, 401, 'Intermediate MFA token must be denied access to student routes');

    console.log('✅ [PASS] test_temporary_mfa_token_isolation: MFA challenge tokens strictly isolated from protected APIs');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_temporary_mfa_token_isolation:', err);
  process.exit(1);
});
