const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING DOCUMENT PREVIEW AUTHORIZATION DENIAL TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12041, email: 'admin.auth@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12042, email: 'student.auth@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const provider = { id: 12043, email: 'provider.auth@iskolar.test', role: 'provider', accountStatus: 'ACTIVE' };
    const document = {
      id: 12044,
      user_id: student.id,
      student_id: student.id,
      filename: 'confidential_file.pdf',
      originalname: 'ConfidentialIncomeStatement.pdf',
      mimeType: 'application/pdf',
      status: 'VERIFIED',
      rawOcrText: 'INCOME STATEMENT'
    };

    db.data.users = (db.data.users || []).filter(u => ![12041, 12042, 12043].includes(u.id));
    db.data.users.push(admin, student, provider);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== 12044);
    db.data.documents.push(document);
    await db.write();

    // 1. Unauthenticated request -> 401
    const unauthRes = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, null);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

    // 2. Student request -> 403
    const studentToken = signToken(student);
    const studentRes = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, studentToken);
    assert.strictEqual(studentRes.status, 403, 'Non-admin student role must return 403');

    // 3. Provider request -> 403
    const providerToken = signToken(provider);
    const providerRes = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, providerToken);
    assert.strictEqual(providerRes.status, 403, 'Non-admin provider role must return 403');

    console.log('✅ [PASS] test_admin_document_authorization passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_document_authorization:', err);
  process.exit(1);
});
