const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ACCOUNT INFORMATION RESPONSE TEST');
  const env = await startTestServer();
  try {
    const student = {
      id: 13141,
      email: 'student.respond@iskolar.test',
      role: 'student',
      accountStatus: 'INFORMATION_REQUIRED',
      informationRequest: 'Please upload updated registration.'
    };

    db.data.users = (db.data.users || []).filter(u => u.id !== 13141);
    db.data.users.push(student);
    await db.write();

    const token = signToken(student);

    const res = await env.request('POST', '/api/verification/respond-info', {
      response: 'I have attached my newly stamped Certificate of Registration from the University Registrar.',
      supportingDocuments: ['uploads/updated_cor_2026.pdf']
    }, token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.accountStatus, 'PENDING_ADMIN_REVIEW');

    // Verify DB update: INFORMATION_REQUIRED -> PENDING_ADMIN_REVIEW
    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'PENDING_ADMIN_REVIEW');
    assert(updated.informationResponse.includes('newly stamped'));

    console.log('✅ [PASS] test_account_information_response passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_information_response:', err);
  process.exit(1);
});
