const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_decision_reason_required...');
  const env = await startTestServer();

  try {
    const provider = { id: 17724, email: 'prov.reason@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const scholarship = { id: 17725, sponsor_id: provider.id, provider_id: provider.id, status: 'Open' };
    const application = { id: 17726, scholarship_id: scholarship.id, student_id: 17727, status: 'pending' };

    db.data.users = (db.data.users || []).filter(u => u.id !== provider.id);
    db.data.users.push(provider);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const token = signToken(provider);

    // 1. Attempt REJECT without reason -> Must fail with 400
    const rejectNoReason = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'rejected',
      reason: '', // Empty reason
    }, token);
    assert.strictEqual(rejectNoReason.status, 400, 'Rejection without reason must return 400 Bad Request');
    assert(rejectNoReason.body?.message?.includes('reason'), 'Error message must mention reason requirement');

    // 2. Attempt RESUBMISSION_REQUIRED without reason -> Must fail with 400
    const resubNoReason = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'needs_resubmission',
      reason: '', // Empty reason
    }, token);
    assert.strictEqual(resubNoReason.status, 400, 'Resubmission request without reason must return 400 Bad Request');

    // 3. Attempt REJECT with valid reason -> Must succeed (200)
    const rejectWithReason = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'rejected',
      reason: 'GWA does not meet the minimum requirement of 1.75 for this program.',
    }, token);
    assert.strictEqual(rejectWithReason.status, 200, `Expected 200 OK with valid reason, got ${rejectWithReason.status}`);

    console.log('✅ [PASS] test_decision_reason_required: Mandatory decision reason strictly enforced');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_decision_reason_required:', err);
  process.exit(1);
});
