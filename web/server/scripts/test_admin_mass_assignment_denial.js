const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9861, email: 'admin.mass@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = {
      id: 9862,
      email: 'student.mass@iskolar.test',
      role: 'student',
      name: 'Original Student Name',
      passwordHash: 'ORIGINAL_HASH_123',
      otp: '999999',
      accountStatus: 'ACTIVE',
    };

    db.data.users = (db.data.users || []).filter(u => ![9861, 9862].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // Attempting to send forbidden fields must be denied with 403 Forbidden
    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}`, {
      name: 'Safe Name',
      password: 'HACKED_PASSWORD',
      passwordHash: 'HACKED_HASH',
      otp: '000000',
      documents: ['fake_doc'],
      rawOcrOutput: 'fake_ocr',
      reason: 'Attempting forbidden mass assignment'
    }, token);

    assert.strictEqual(res.status, 403, 'Forbidden fields must result in 403 status');

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.name, 'Original Student Name', 'State must not be mutated on forbidden request');
    assert.strictEqual(updated.passwordHash, 'ORIGINAL_HASH_123');
    assert.strictEqual(updated.otp, '999999');
    assert.strictEqual(updated.role, 'student');

    console.log('✅ [PASS] test_admin_mass_assignment_denial passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_mass_assignment_denial:', err);
  process.exit(1);
});
