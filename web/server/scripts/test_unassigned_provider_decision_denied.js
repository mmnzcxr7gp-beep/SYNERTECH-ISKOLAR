const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_unassigned_provider_decision_denied...');
  const env = await startTestServer();

  try {
    const ownerProvider = { id: 17705, email: 'owner.sch@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const attackerProvider = { id: 17706, email: 'unassigned.prov@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const student = { id: 17707, email: 'stud.target@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const scholarship = { id: 17708, title: 'SM Foundation Grant', sponsor_id: ownerProvider.id, provider_id: ownerProvider.id, status: 'Open' };
    const application = { id: 17709, scholarship_id: scholarship.id, student_id: student.id, status: 'pending' };

    db.data.users = (db.data.users || []).filter(u => ![17705, 17706, 17707].includes(u.id));
    db.data.users.push(ownerProvider, attackerProvider, student);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const attackerToken = signToken(attackerProvider);

    // Unassigned provider attempts to approve/reject application
    const res = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'Unauthorized decision attempt',
    }, attackerToken);

    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for unassigned provider, got ${res.status}`);

    // Verify application status remained unchanged
    await db.read();
    const storedApp = db.data.applications.find(a => a.id === application.id);
    assert.strictEqual(storedApp.status, 'pending', 'Application status must remain unchanged after denied decision');

    console.log('✅ [PASS] test_unassigned_provider_decision_denied: Cross-provider application decisions strictly denied (403)');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_unassigned_provider_decision_denied:', err);
  process.exit(1);
});
