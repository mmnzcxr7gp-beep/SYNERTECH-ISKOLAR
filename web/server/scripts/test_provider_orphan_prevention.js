const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9971, email: 'admin.orphan@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 9972, email: 'provider.orphan@iskolar.test', role: 'provider', accountStatus: 'ACTIVE' };
    const scholarship = {
      id: 9973,
      title: 'Ayala Future Leaders Grant',
      provider_id: provider.id,
      status: 'published',
    };

    db.data.users = (db.data.users || []).filter(u => ![9971, 9972].includes(u.id));
    db.data.users.push(admin, provider);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== 9973);
    db.data.scholarships.push(scholarship);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${provider.id}/archive`, { reason: 'Provider contract ended; archiving organization' }, token);
    assert.strictEqual(res.status, 200);

    await db.read();
    const sch = db.data.scholarships.find(s => s.id === 9973);
    assert(sch, 'Scholarship must still exist after provider archival');
    assert.strictEqual(sch.provider_id, provider.id, 'Provider association must be preserved for historical compliance');

    console.log('✅ [PASS] test_provider_orphan_prevention passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_provider_orphan_prevention:', err);
  process.exit(1);
});
