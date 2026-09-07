const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_student_decision_denied...');
  const env = await startTestServer();

  try {
    const student = { id: 17710, email: 'stud.actor@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const application = { id: 17711, scholarship_id: 1001, student_id: student.id, status: 'pending' };

    db.data.users = (db.data.users || []).filter(u => u.id !== student.id);
    db.data.users.push(student);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);
    await db.write();

    const studentToken = signToken(student);

    // Student attempts to approve own application
    const res = await env.request('PUT', `/api/applications/${application.id}/status`, {
      status: 'approved',
      reason: 'Self approval attempt',
    }, studentToken);

    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for student decision attempt, got ${res.status}`);

    // Confirm status remained pending
    await db.read();
    const storedApp = db.data.applications.find(a => a.id === application.id);
    assert.strictEqual(storedApp.status, 'pending');

    console.log('✅ [PASS] test_student_decision_denied: Student role strictly blocked from deciding applications');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_student_decision_denied:', err);
  process.exit(1);
});
