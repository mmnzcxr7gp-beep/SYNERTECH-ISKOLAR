const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 11051, email: 'admin.docprev@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 11052, email: 'student.docprev@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const document = {
      id: 11053,
      student_id: student.id,
      filename: 'cor_student_11052.pdf',
      originalname: 'CertificateOfRegistration_2026.pdf',
      mimeType: 'application/pdf',
      status: 'VERIFIED',
      rawOcrText: 'CERTIFICATE OF ENROLLMENT 2026 - POLYTECHNIC UNIVERSITY OF THE PHILIPPINES'
    };

    db.data.users = (db.data.users || []).filter(u => ![11051, 11052].includes(u.id));
    db.data.users.push(admin, student);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== 11053);
    db.data.documents.push(document);
    await db.write();

    const token = signToken(admin);

    // 1. Authorized administrator fetches document preview
    const res = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, token);
    assert.strictEqual(res.status, 200);
    assert(res.headers['content-type']?.includes('application/pdf') || res.headers['content-type']?.includes('text') || res.headers['content-type']?.includes('octet-stream'));

    // 2. Audit log entry must be recorded
    await db.read();
    const accessLog = (db.data.audit_logs || []).find(l => l.action === 'ADMIN_DOCUMENT_ACCESS' && String(l.targetId) === String(document.id));
    assert(accessLog, 'Expected ADMIN_DOCUMENT_ACCESS audit log entry');

    // 3. Unauthorized student role is denied
    const studentToken = signToken(student);
    const deniedRes = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, studentToken);
    assert.strictEqual(deniedRes.status, 403, 'Non-admin role must be denied access');

    console.log('✅ [PASS] test_admin_verification_document_preview passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_verification_document_preview:', err);
  process.exit(1);
});
