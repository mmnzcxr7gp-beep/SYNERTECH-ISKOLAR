const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING MISSING DOCUMENT / ERROR HANDLING TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12031, email: 'admin.missing@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12032, email: 'student.missing@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![12031, 12032].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // Request non-existent document
    const res = await env.request('GET', `/api/admin/accounts/${student.id}/documents/999999/preview`, null, token);
    assert.strictEqual(res.status, 404, 'Missing document must return 404');
    assert(res.body.message, 'Must return descriptive error message');

    console.log('✅ [PASS] test_admin_document_missing_object passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_document_missing_object:', err);
  process.exit(1);
});
