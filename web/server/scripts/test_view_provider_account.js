const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 11041, email: 'admin.viewprov@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = {
      id: 11042,
      email: 'provider.viewprov@iskolar.test',
      role: 'provider',
      name: 'BPI Foundation Inc',
      company: 'BPI Foundation',
      organization_website: 'https://www.bpifoundation.org',
      accountStatus: 'ACTIVE',
      sponsor_verified: true,
      organization_verified: true,
      created_at: new Date().toISOString()
    };
    const scholarship = {
      id: 11043,
      sponsor_id: provider.id,
      title: 'BPI Pagpupugay Scholarship',
      status: 'published',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    db.data.users = (db.data.users || []).filter(u => ![11041, 11042].includes(u.id));
    db.data.users.push(admin, provider);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== 11043);
    db.data.scholarships.push(scholarship);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('GET', `/api/admin/accounts/${provider.id}`, null, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.id, provider.id);
    assert.strictEqual(res.body.account.name, 'BPI Foundation Inc');
    assert.strictEqual(res.body.account.company, 'BPI Foundation');
    assert.strictEqual(res.body.account.role, 'provider');

    // Managed Scholarships Verification
    assert(Array.isArray(res.body.managedScholarships), 'Must return managedScholarships array');
    assert(res.body.managedScholarships.some(s => s.id === 11043));

    // Security Check: No secrets exposed
    assert.strictEqual(res.body.account.password, undefined);
    assert.strictEqual(res.body.account.passwordHash, undefined);

    console.log('✅ [PASS] test_view_provider_account passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_view_provider_account:', err);
  process.exit(1);
});
