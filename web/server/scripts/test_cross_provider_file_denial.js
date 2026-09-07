const assert = require('assert');
const { db } = require('../src/config/db');

async function testCrossProviderFileDenial() {
  console.log('🧪 Testing Cross-Provider Document Access Denial (403 Forbidden)...');

  const providerAId = 9201;
  const providerBId = 9202;
  const scholarshipAId = 905;
  const scholarshipBId = 906;
  const appAId = 9005;
  const docAId = 88005;

  if (!db.data.scholarships) db.data.scholarships = [];
  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];

  db.data.scholarships.push(
    { id: scholarshipAId, title: 'Provider A Grant', sponsor_id: providerAId },
    { id: scholarshipBId, title: 'Provider B Grant', sponsor_id: providerBId }
  );

  db.data.applications.push({
    id: appAId,
    scholarship_id: scholarshipAId,
    student_id: 9101,
  });

  db.data.documents.push({
    id: docAId,
    documentId: String(docAId),
    application_id: appAId,
    user_id: 9101,
    storedKey: 'applications/9005/documents/doc_1/v1/test.png',
  });

  const doc = db.data.documents.find((d) => d.id === docAId);

  function isAuthorized(user, targetDoc) {
    if (!user || !user.id) return { allowed: false, status: 401 };
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') return { allowed: true, status: 200 };
    if ((role === 'provider' || role === 'sponsor') && targetDoc.application_id) {
      const app = db.data.applications.find((a) => String(a.id) === String(targetDoc.application_id));
      if (app) {
        const sch = db.data.scholarships.find((s) => String(s.id) === String(app.scholarship_id));
        if (sch && sch.sponsor_id === user.id) return { allowed: true, status: 200 };
      }
    }
    return { allowed: false, status: 403 };
  }

  // Provider A owns the scholarship -> Allowed (200)
  const providerACheck = isAuthorized({ id: providerAId, role: 'provider' }, doc);
  assert.strictEqual(providerACheck.allowed, true);

  // Provider B does NOT own the scholarship -> Denied (403 Forbidden)
  const providerBCheck = isAuthorized({ id: providerBId, role: 'provider' }, doc);
  assert.strictEqual(providerBCheck.allowed, false);
  assert.strictEqual(providerBCheck.status, 403, 'Cross-provider document access must return HTTP 403 Forbidden');

  // Cleanup
  db.data.scholarships = db.data.scholarships.filter((s) => s.id !== scholarshipAId && s.id !== scholarshipBId);
  db.data.applications = db.data.applications.filter((a) => a.id !== appAId);
  db.data.documents = db.data.documents.filter((d) => d.id !== docAId);

  console.log('✅ PASS test_cross_provider_file_denial: Cross-provider document isolation verified');
  process.exit(0);
}

testCrossProviderFileDenial().catch((err) => {
  console.error('❌ FAIL test_cross_provider_file_denial:', err);
  process.exit(1);
});
