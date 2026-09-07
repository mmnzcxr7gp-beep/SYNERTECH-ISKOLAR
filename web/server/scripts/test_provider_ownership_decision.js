const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_provider_ownership_decision...');
  const env = await startTestServer();

  try {
    const provider = { id: 17701, email: 'owner.decision@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const student = { id: 17702, email: 'stud.decision@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const scholarship = { id: 17703, title: 'Ayala Tech Grant', sponsor_id: provider.id, provider_id: provider.id, status: 'Open' };
    const application = { id: 17704, scholarship_id: scholarship.id, student_id: student.id, status: 'pending' };

    db.data.users = (db.data.users || []).filter(u => ![17701, 17702].includes(u.id));
    db.data.users.push(provider, student);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const token = signToken(provider);

    // Owning provider decides application
    const res = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'Applicant meets all academic criteria and scholarship interview qualifications.',
    }, token);

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);

    // Verify in DB
    await db.read();
    const updatedApp = db.data.applications.find(a => a.id === application.id);
    assert(
      updatedApp.status === 'approved' || updatedApp.status === 'APPROVED',
      `Expected approved status, got ${updatedApp.status}`
    );
    assert.strictEqual(updatedApp.reviewed_by, provider.id);

    console.log('✅ [PASS] test_provider_ownership_decision: Owning provider successfully decides owned scholarship application');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_provider_ownership_decision:', err);
  process.exit(1);
});
