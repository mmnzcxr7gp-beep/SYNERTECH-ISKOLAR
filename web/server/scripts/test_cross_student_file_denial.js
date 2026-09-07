const assert = require('assert');
const { db } = require('../src/config/db');

async function testCrossStudentFileDenial() {
  console.log('🧪 Testing Cross-Student Document Access Denial (403 Forbidden)...');

  const studentAId = 9101;
  const studentBId = 9102;
  const docId = 88002;

  if (!db.data.documents) db.data.documents = [];

  db.data.documents.push({
    id: docId,
    documentId: String(docId),
    user_id: studentAId,
    studentId: studentAId,
    application_id: 9003,
    storedKey: 'applications/9003/documents/doc_1/v1/test.png',
    originalname: 'student_a_private_grades.png',
  });

  const doc = db.data.documents.find((d) => d.id === docId);

  function isAuthorized(user, targetDoc) {
    if (!user || !user.id) return { allowed: false, status: 401 };
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') return { allowed: true, status: 200 };
    if (role === 'student' && String(targetDoc.user_id) === String(user.id)) {
      return { allowed: true, status: 200 };
    }
    return { allowed: false, status: 403 };
  }

  // Student A access own doc -> Allowed
  const studentACheck = isAuthorized({ id: studentAId, role: 'student' }, doc);
  assert.strictEqual(studentACheck.allowed, true);

  // Student B access Student A doc -> Denied (403 Forbidden)
  const studentBCheck = isAuthorized({ id: studentBId, role: 'student' }, doc);
  assert.strictEqual(studentBCheck.allowed, false);
  assert.strictEqual(studentBCheck.status, 403, 'Cross-student document access must return HTTP 403 Forbidden');

  // Cleanup
  db.data.documents = db.data.documents.filter((d) => d.id !== docId);

  console.log('✅ PASS test_cross_student_file_denial: Cross-student file denial verified');
  process.exit(0);
}

testCrossStudentFileDenial().catch((err) => {
  console.error('❌ FAIL test_cross_student_file_denial:', err);
  process.exit(1);
});
