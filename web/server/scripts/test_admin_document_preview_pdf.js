const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING PROTECTED PDF PREVIEW TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12011, email: 'admin.pdf@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12012, email: 'student.pdf@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const document = {
      id: 12013,
      user_id: student.id,
      student_id: student.id,
      filename: 'cor_cert.pdf',
      originalname: 'RegistrationCertificate.pdf',
      mimeType: 'application/pdf',
      status: 'VERIFIED',
      rawOcrText: '%PDF-1.4 CERTIFICATE OF REGISTRATION'
    };

    db.data.users = (db.data.users || []).filter(u => ![12011, 12012].includes(u.id));
    db.data.users.push(admin, student);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== 12013);
    db.data.documents.push(document);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, token);
    assert.strictEqual(res.status, 200);
    assert(res.headers['content-type']?.includes('application/pdf') || res.headers['content-type']?.includes('octet-stream'));

    console.log('✅ [PASS] test_admin_document_preview_pdf passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_document_preview_pdf:', err);
  process.exit(1);
});
