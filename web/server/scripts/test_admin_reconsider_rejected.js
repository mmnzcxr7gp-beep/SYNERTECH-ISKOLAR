const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_admin_reconsider_rejected...');
  const env = await startTestServer();

  try {
    const admin = { id: 99101, email: 'admin@iskolar.ph', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 99102, email: 'sponsor@iskolar.ph', role: 'sponsor', accountStatus: 'ACTIVE' };
    const student = { id: 99103, email: 'applicant@iskolar.ph', role: 'student', accountStatus: 'ACTIVE' };
    const scholarship = {
      id: 99104,
      title: 'Admin Oversight Grant',
      sponsor_id: provider.id,
      provider_id: provider.id,
      slots: 5,
      approved_count: 0,
      status: 'Open',
    };
    const application = {
      id: 99105,
      scholarship_id: scholarship.id,
      student_id: student.id,
      status: 'REJECTED',
      applied_at: new Date().toISOString(),
    };

    // Prepare in-memory / MongoDB test documents
    db.data.users = (db.data.users || []).filter(u => ![admin.id, provider.id, student.id].includes(u.id));
    db.data.users.push(admin, provider, student);
    db.data.scholarships = (db.data.scholarships || []).filter(s => s.id !== scholarship.id);
    db.data.scholarships.push(scholarship);
    db.data.applications = (db.data.applications || []).filter(a => a.id !== application.id);
    db.data.applications.push(application);

    if (db.collections?.applications) {
      await db.collections.applications.deleteMany({ id: application.id });
      await db.collections.applications.insertOne({ ...application });
    }
    if (db.collections?.scholarships) {
      await db.collections.scholarships.deleteMany({ id: scholarship.id });
      await db.collections.scholarships.insertOne({ ...scholarship });
    }
    await db.write();

    // 1. Verify provider cannot approve a REJECTED application directly without appeal
    const providerToken = signToken(provider);
    const providerAttempt = await env.request('POST', `/api/applications/${application.id}/action`, {
      action: 'APPROVE_APPLICATION',
      payload: {
        approvalNote: 'Provider attempt to bypass',
      },
    }, providerToken);
    assert.strictEqual(providerAttempt.status, 409, `Provider should be blocked by 409, got ${providerAttempt.status}`);

    // 2. Verify Super Administrator CAN approve the application
    const adminToken = signToken(admin);
    const adminApprove = await env.request('POST', `/api/applications/${application.id}/action`, {
      action: 'APPROVE_APPLICATION',
      payload: {
        approvalNote: 'Approved under administrative oversight review.',
        effectiveDate: '2026-09-07',
        acceptanceDeadline: '2026-09-14',
      },
    }, adminToken);

    assert.strictEqual(adminApprove.status, 200, `Admin approval should succeed with 200, got ${adminApprove.status}: ${JSON.stringify(adminApprove.body)}`);
    assert.strictEqual(adminApprove.body.application.status, 'APPROVED');

    // 3. Verify slot allocation
    if (db.collections?.scholarships) {
      const updatedSchol = await db.collections.scholarships.findOne({ id: scholarship.id });
      assert.strictEqual(updatedSchol.approved_count, 1, 'Scholarship approved_count should be incremented');
    }

    console.log('✅ [PASS] test_admin_reconsider_rejected: Admin successfully approved previously rejected application under oversight authority');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_reconsider_rejected:', err);
  process.exit(1);
});
