const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 11031, email: 'admin.viewstud@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = {
      id: 11032,
      email: 'student.viewstud@iskolar.test',
      role: 'student',
      name: 'Jose Rizal',
      schoolName: 'UST',
      course: 'BS Biology',
      gpa: 1.25,
      accountStatus: 'ACTIVE',
      isVerified: true,
      created_at: new Date().toISOString()
    };
    const application = {
      id: 11033,
      student_id: student.id,
      scholarship_id: 101,
      status: 'approved',
      score: 95
    };
    const document = {
      id: 11034,
      student_id: student.id,
      filename: 'transcript_jose.pdf',
      originalname: 'Official_Transcript.pdf',
      status: 'VERIFIED',
      rawOcrText: 'General Weighted Average: 1.25'
    };

    db.data.users = (db.data.users || []).filter(u => ![11031, 11032].includes(u.id));
    db.data.users.push(admin, student);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== 11033);
    db.data.applications.push(application);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== 11034);
    db.data.documents.push(document);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('GET', `/api/admin/accounts/${student.id}`, null, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.id, student.id);
    assert.strictEqual(res.body.account.name, 'Jose Rizal');
    assert.strictEqual(res.body.account.role, 'student');
    assert.strictEqual(res.body.account.gpa, 1.25);
    assert.strictEqual(res.body.account.course, 'BS Biology');

    // Applications & Documents Verification
    assert(Array.isArray(res.body.applications), 'Must return applications array');
    assert(res.body.applications.some(a => a.id === 11033));
    assert(Array.isArray(res.body.documents), 'Must return documents array');
    assert(res.body.documents.some(d => d.id === 11034));

    // Privacy & Security Check: Passwords & secrets must never be exposed
    assert.strictEqual(res.body.account.password, undefined);
    assert.strictEqual(res.body.account.passwordHash, undefined);
    assert.strictEqual(res.body.account.otp, undefined);

    console.log('✅ [PASS] test_view_student_account passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_view_student_account:', err);
  process.exit(1);
});
