const assert = require('assert');
const { startTestServer, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_automation_cannot_decide...');
  const env = await startTestServer();

  try {
    const doc = {
      id: 18823,
      student_id: 18824,
      application_id: 18825,
      filename: 'automated_attempt.pdf',
      storageDriver: 'r2',
      storedKey: 'applications/18825/documents/doc/v1/automated_attempt.pdf',
      manualReviewStatus: 'PENDING',
      verificationStatus: 'PENDING_HUMAN_REVIEW',
      status: 'PENDING_HUMAN_REVIEW',
    };

    db.data.documents = (db.data.documents || []).filter(d => d.id !== doc.id);
    db.data.documents.push(doc);
    await db.write();

    // 1. Unauthenticated automated request must be rejected (401)
    const unauthRes = await env.request('POST', `/api/documents/${doc.id}/review-action`, {
      action: 'VERIFIED',
      reason: 'Automated script trigger',
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated automated request must be rejected');

    // 2. Automated status change without reviewer identity in application decision must be rejected
    const appUnauthRes = await env.request('PUT', `/api/applications/${doc.application_id}/status`, {
      status: 'approved',
      reason: 'Automated rule passing',
    });
    assert.strictEqual(appUnauthRes.status, 401, 'Application decision without reviewer JWT must be rejected');

    // 3. Confirm document remains PENDING_HUMAN_REVIEW in DB
    await db.read();
    const storedDoc = db.data.documents.find(d => d.id === doc.id);
    assert.strictEqual(storedDoc.verificationStatus, 'PENDING_HUMAN_REVIEW');

    console.log('✅ [PASS] test_automation_cannot_decide: Automated processes cannot assign final human review decisions');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_automation_cannot_decide:', err);
  process.exit(1);
});
