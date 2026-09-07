const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_decision_audit_and_notification...');
  const env = await startTestServer();

  try {
    const provider = { id: 17728, email: 'prov.audit@iskolar.test', role: 'sponsor', accountStatus: 'ACTIVE' };
    const student = { id: 17729, email: 'stud.audit@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const scholarship = { id: 17730, title: 'GBF STEM Award', sponsor_id: provider.id, provider_id: provider.id, status: 'Open' };
    const application = { id: 17731, scholarship_id: scholarship.id, student_id: student.id, status: 'pending' };

    db.data.users = (db.data.users || []).filter(u => ![17728, 17729].includes(u.id));
    db.data.users.push(provider, student);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const token = signToken(provider);

    // Provider approves application
    const res = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'Outstanding academic standing and verified credentials.',
    }, token);

    assert.strictEqual(res.status, 200);

    // Verify timeline and decision in DB
    await db.read();
    const storedApp = db.data.applications.find(a => a.id === application.id);
    assert(storedApp.timeline && storedApp.timeline.length > 0, 'Expected decision event in application timeline');
    assert(
      storedApp.status === 'approved' || storedApp.status === 'APPROVED',
      `Expected approved status, got ${storedApp.status}`
    );

    // Verify persistent notification generated for student
    const notifs = db.data.notifications || [];
    const studentNotif = notifs.find(n => String(n.userId) === String(student.id));
    assert(studentNotif, 'Expected persistent notification created for student');
    assert(studentNotif.title?.includes('Approved'), 'Expected approval notification headline');

    console.log('✅ [PASS] test_decision_audit_and_notification: Decision audit trail and persistent notification verified');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_decision_audit_and_notification:', err);
  process.exit(1);
});
