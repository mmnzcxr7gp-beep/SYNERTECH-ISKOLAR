const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING DOCUMENT METADATA LOADING TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12001, email: 'admin.metadata@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12002, email: 'student.metadata@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const document = {
      id: 12003,
      user_id: student.id,
      student_id: student.id,
      filename: 'grade_report_2026.pdf',
      originalname: 'OfficialGradeReport2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 1048576,
      status: 'VERIFIED',
      rawOcrText: 'ACADEMIC TRANSCRIPT 2026 - GPA 1.25',
      uploaded_at: new Date().toISOString()
    };

    db.data.users = (db.data.users || []).filter(u => ![12001, 12002].includes(u.id));
    db.data.users.push(admin, student);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== 12003);
    db.data.documents.push(document);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('GET', `/api/admin/accounts/${student.id}`, null, token);
    assert.strictEqual(res.status, 200);
    assert(res.body.documents, 'Account details must contain documents array');
    const docMeta = res.body.documents.find(d => d.id === 12003 || String(d.id) === '12003');
    assert(docMeta, 'Target document metadata must be loaded');
    assert.strictEqual(docMeta.originalname, 'OfficialGradeReport2026.pdf');
    assert(docMeta.rawOcrText.includes('ACADEMIC TRANSCRIPT'));

    console.log('✅ [PASS] test_document_metadata_loading passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_document_metadata_loading:', err);
  process.exit(1);
});
