const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_invalid_status_transition...');
  const env = await startTestServer();

  try {
    const provider = { id: 17712, email: 'prov.state@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const scholarship = { id: 17713, sponsor_id: provider.id, provider_id: provider.id, status: 'Open' };
    const application = { id: 17714, scholarship_id: scholarship.id, student_id: 17715, status: 'REJECTED' };

    db.data.users = (db.data.users || []).filter(u => u.id !== provider.id);
    db.data.users.push(provider);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const token = signToken(provider);

    // Attempt invalid transition: from REJECTED to APPROVED without appeal/resubmission
    const res = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'Attempt invalid state transition',
    }, token);

    // Must be 409 Conflict or 400 Bad Request
    assert(res.status === 409 || res.status === 400, `Expected 409/400 for invalid transition, got ${res.status}`);

    // Verify application state remained REJECTED
    await db.read();
    const storedApp = db.data.applications.find(a => a.id === application.id);
    assert.strictEqual(storedApp.status, 'REJECTED');

    console.log('✅ [PASS] test_invalid_status_transition: Invalid status state transitions rejected safely');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_invalid_status_transition:', err);
  process.exit(1);
});
