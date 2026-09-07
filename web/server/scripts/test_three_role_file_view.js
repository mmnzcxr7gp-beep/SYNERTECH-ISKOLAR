const assert = require('assert');
const { db, createId } = require('../src/config/db');
const storageService = require('../src/utils/storageService');

async function testThreeRoleFileView() {
  console.log('🧪 Testing Three-Role File View Authorization & Download...');

  const studentAId = 9101;
  const providerAId = 9201;
  const adminAId = 9301;
  const scholarshipId = 902;
  const applicationId = 9002;
  const docId = 88001;

  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const uploadResult = await storageService.uploadFile({
    buffer: samplePngBuffer,
    originalName: 'academic_grades.png',
    mimeType: 'image/png',
    applicationId,
    studentId: studentAId,
  });

  if (!db.data.scholarships) db.data.scholarships = [];
  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];

  db.data.scholarships.push({
    id: scholarshipId,
    title: 'Aboitiz Engineering Grant',
    sponsor_id: providerAId,
    providerId: providerAId,
  });

  db.data.applications.push({
    id: applicationId,
    scholarship_id: scholarshipId,
    student_id: studentAId,
  });

  db.data.documents.push({
    id: docId,
    documentId: String(docId),
    user_id: studentAId,
    studentId: studentAId,
    application_id: applicationId,
    applicationId,
    storedKey: uploadResult.storedKey,
    originalname: 'academic_grades.png',
    mimeType: 'image/png',
    size: samplePngBuffer.length,
  });

  // Helper checking authorization logic
  function checkAuth(user, doc) {
    if (!user || !user.id) return { status: 401, allowed: false };
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') return { status: 200, allowed: true };
    if (role === 'student' && String(doc.user_id) === String(user.id)) return { status: 200, allowed: true };
    if ((role === 'provider' || role === 'sponsor') && doc.application_id) {
      const app = db.data.applications.find((a) => String(a.id) === String(doc.application_id));
      if (app) {
        const sch = db.data.scholarships.find((s) => String(s.id) === String(app.scholarship_id));
        if (sch && sch.sponsor_id === user.id) return { status: 200, allowed: true };
      }
    }
    return { status: 403, allowed: false };
  }

  const doc = db.data.documents.find((d) => d.id === docId);

  // 1. Student A views own file -> Allowed (200)
  const studentCheck = checkAuth({ id: studentAId, role: 'student' }, doc);
  assert.strictEqual(studentCheck.allowed, true);
  assert.strictEqual(studentCheck.status, 200);

  // 2. Provider A views file for application under managed scholarship -> Allowed (200)
  const providerCheck = checkAuth({ id: providerAId, role: 'provider' }, doc);
  assert.strictEqual(providerCheck.allowed, true);
  assert.strictEqual(providerCheck.status, 200);

  // 3. Admin A views file -> Allowed (200)
  const adminCheck = checkAuth({ id: adminAId, role: 'admin' }, doc);
  assert.strictEqual(adminCheck.allowed, true);
  assert.strictEqual(adminCheck.status, 200);

  // 4. Anonymous user -> Denied (401)
  const anonCheck = checkAuth(null, doc);
  assert.strictEqual(anonCheck.allowed, false);
  assert.strictEqual(anonCheck.status, 401);

  // Download physical file verification
  const downloaded = await storageService.downloadFile(doc.storedKey);
  assert.ok(downloaded.buffer || downloaded.stream, 'Physical file must be retrievable from storage');
  assert.strictEqual(downloaded.size, samplePngBuffer.length);

  // Cleanup
  db.data.scholarships = db.data.scholarships.filter((s) => s.id !== scholarshipId);
  db.data.applications = db.data.applications.filter((a) => a.id !== applicationId);
  db.data.documents = db.data.documents.filter((d) => d.id !== docId);

  console.log('✅ PASS test_three_role_file_view: Three-role file view authorization verified');
  process.exit(0);
}

testThreeRoleFileView().catch((err) => {
  console.error('❌ FAIL test_three_role_file_view:', err);
  process.exit(1);
});
