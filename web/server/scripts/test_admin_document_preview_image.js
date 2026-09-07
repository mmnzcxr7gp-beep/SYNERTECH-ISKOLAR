const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING PROTECTED IMAGE (JPEG/PNG/WEBP) PREVIEW TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12021, email: 'admin.img@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12022, email: 'student.img@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const document = {
      id: 12023,
      user_id: student.id,
      student_id: student.id,
      filename: 'school_id.png',
      originalname: 'StudentSchoolID.png',
      mimeType: 'image/png',
      status: 'VERIFIED',
      rawOcrText: 'POLYTECHNIC UNIVERSITY ID #2026-0012'
    };

    db.data.users = (db.data.users || []).filter(u => ![12021, 12022].includes(u.id));
    db.data.users.push(admin, student);
    db.data.documents = (db.data.documents || []).filter(d => d.id !== 12023);
    db.data.documents.push(document);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('GET', `/api/admin/accounts/${student.id}/documents/${document.id}/preview`, null, token);
    assert.strictEqual(res.status, 200);
    assert(res.headers['content-type']?.includes('image') || res.headers['content-type']?.includes('octet-stream') || res.headers['content-type']?.includes('png'));

    console.log('✅ [PASS] test_admin_document_preview_image passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_document_preview_image:', err);
  process.exit(1);
});
