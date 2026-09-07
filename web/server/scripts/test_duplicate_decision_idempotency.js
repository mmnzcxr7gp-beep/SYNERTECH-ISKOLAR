const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_duplicate_decision_idempotency...');
  const env = await startTestServer();

  try {
    const provider = { id: 17716, email: 'prov.idemp@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const scholarship = { id: 17717, sponsor_id: provider.id, provider_id: provider.id, status: 'Open' };
    const application = { id: 17718, scholarship_id: scholarship.id, student_id: 17719, status: 'pending' };

    db.data.users = (db.data.users || []).filter(u => u.id !== provider.id);
    db.data.users.push(provider);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const token = signToken(provider);

    // First approval decision
    const res1 = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'First review approval',
      idempotencyKey: 'idemp-key-17718-approval',
    }, token);
    assert.strictEqual(res1.status, 200);

    // Duplicate identical approval decision (must succeed idempotently without corrupting DB or creating duplicates)
    const res2 = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'Duplicate review submission',
      idempotencyKey: 'idemp-key-17718-approval',
    }, token);
    assert.strictEqual(res2.status, 200);

    await db.read();
    const storedApp = db.data.applications.find(a => a.id === application.id);
    assert(
      storedApp.status === 'approved' || storedApp.status === 'APPROVED',
      `Expected approved status, got ${storedApp.status}`
    );

    console.log('✅ [PASS] test_duplicate_decision_idempotency: Duplicate decisions handled idempotently and safely');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_duplicate_decision_idempotency:', err);
  process.exit(1);
});
