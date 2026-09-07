/**
 * test_capacity_multi_scholarship_isolation.js
 * 
 * Regression Test Suite: Multi-Scholarship Capacity Isolation & Transactional Approval
 * 
 * Verifies:
 * 1. Approving an application for Scholarship B NEVER alters Scholarship A's approved_count.
 * 2. Capacity limit (slots) is strictly enforced at database level with HTTP 409 Conflict.
 * 3. Idempotent re-approvals succeed without double-allocating slots.
 * 4. All operations execute within isolated test environment with scoped cleanup.
 */

const assert = require('assert');
const {
  startTestServer,
  generateTestUser,
  generateTestScholarship,
  scopedCleanup,
  assertDatabaseIsolation,
} = require('./testHelper');

async function runTest() {
  console.log('================================================================');
  console.log('🧪 MULTI-SCHOLARSHIP CAPACITY ISOLATION & APPROVAL REGRESSION TEST');
  console.log('================================================================\n');

  let testEnv = null;
  let passed = 0;
  let failed = 0;

  function recordPass(desc) {
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  }

  function recordFail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc}:`, err?.message || err);
    failed++;
  }

  try {
    testEnv = await startTestServer();
    const db = testEnv.db;
    const request = testEnv.request;

    assertDatabaseIsolation(db.client, require('mongoose').connection);

    // 1. Setup Provider
    const providerUser = generateTestUser('provider', {
      name: 'Capacity Test Foundation Provider',
      organization_name: 'Capacity Test Foundation',
      isVerified: true,
      sponsor_verified: true,
      organization_verified: true,
    });
    await db.collections.users.insertOne(providerUser);
    const providerToken = testEnv.signToken ? testEnv.signToken(providerUser) : require('./testHelper').signToken(providerUser);

    // 2. Setup Scholarship A (2 slots, approved_count: 0)
    const scholA = generateTestScholarship(providerUser.id, {
      title: 'Scholarship Alpha (Isolated Capacity Test)',
      slots: 2,
      totalSlots: 2,
      approved_count: 0,
    });
    await db.collections.scholarships.insertOne(scholA);

    // 3. Setup Scholarship B (1 slot, approved_count: 0)
    const scholB = generateTestScholarship(providerUser.id, {
      title: 'Scholarship Beta (Isolated Capacity Test)',
      slots: 1,
      totalSlots: 1,
      approved_count: 0,
    });
    await db.collections.scholarships.insertOne(scholB);

    // 4. Setup Students
    const student1 = generateTestUser('student', { name: 'Student One (Beta Applicant)' });
    const student2 = generateTestUser('student', { name: 'Student Two (Beta Excess Applicant)' });
    const student3 = generateTestUser('student', { name: 'Student Three (Alpha Applicant)' });

    await db.collections.users.insertMany([student1, student2, student3]);

    // 5. Create Applications
    const app1Id = 9100001 + Math.floor(Math.random() * 10000);
    const app1 = {
      id: app1Id,
      _id: app1Id,
      scholarship_id: scholB.id,
      scholarshipId: scholB.id,
      student_id: student1.id,
      studentId: student1.id,
      status: 'pending',
      applied_at: new Date().toISOString(),
    };

    const app2Id = 9100002 + Math.floor(Math.random() * 10000);
    const app2 = {
      id: app2Id,
      _id: app2Id,
      scholarship_id: scholB.id,
      scholarshipId: scholB.id,
      student_id: student2.id,
      studentId: student2.id,
      status: 'pending',
      applied_at: new Date().toISOString(),
    };

    const app3Id = 9100003 + Math.floor(Math.random() * 10000);
    const app3 = {
      id: app3Id,
      _id: app3Id,
      scholarship_id: scholA.id,
      scholarshipId: scholA.id,
      student_id: student3.id,
      studentId: student3.id,
      status: 'pending',
      applied_at: new Date().toISOString(),
    };

    await db.collections.applications.insertMany([app1, app2, app3]);

    // Verify initial state
    const initScholA = await db.collections.scholarships.findOne({ id: scholA.id });
    const initScholB = await db.collections.scholarships.findOne({ id: scholB.id });
    assert.strictEqual(initScholA.approved_count || 0, 0, 'Scholarship A starts at 0 approved');
    assert.strictEqual(initScholB.approved_count || 0, 0, 'Scholarship B starts at 0 approved');
    recordPass('Initial state verified: Both Scholarship A and B have 0 approved');

    // -------------------------------------------------------------------------
    // TEST 1: Approving Application on Scholarship B updates B, leaves A at 0
    // -------------------------------------------------------------------------
    const approveApp1Res = await request(
      'PUT',
      `/api/applications/${app1Id}/status`,
      { status: 'APPROVED', reason: 'Qualified candidate' },
      providerToken
    );

    assert.strictEqual(approveApp1Res.status, 200, 'App 1 on Scholarship B approved successfully');

    const afterApp1ScholA = await db.collections.scholarships.findOne({ id: scholA.id });
    const afterApp1ScholB = await db.collections.scholarships.findOne({ id: scholB.id });

    assert.strictEqual(afterApp1ScholB.approved_count, 1, 'Scholarship B approved_count incremented to 1');
    assert.strictEqual(afterApp1ScholA.approved_count || 0, 0, 'CRITICAL: Scholarship A approved_count remains strictly 0');
    recordPass('Isolation Confirmed: Approving Scholarship B did NOT alter Scholarship A approved_count');

    // -------------------------------------------------------------------------
    // TEST 2: Capacity Exhaustion on Scholarship B returns 409, leaves A at 0
    // -------------------------------------------------------------------------
    const approveApp2Res = await request(
      'PUT',
      `/api/applications/${app2Id}/status`,
      { status: 'APPROVED', reason: 'Second candidate' },
      providerToken
    );

    assert.strictEqual(approveApp2Res.status, 409, 'Excess approval on Scholarship B rejected with 409 Conflict');

    const afterApp2ScholA = await db.collections.scholarships.findOne({ id: scholA.id });
    const afterApp2ScholB = await db.collections.scholarships.findOne({ id: scholB.id });

    assert.strictEqual(afterApp2ScholB.approved_count, 1, 'Scholarship B approved_count remains capped at 1');
    assert.strictEqual(afterApp2ScholA.approved_count || 0, 0, 'Scholarship A approved_count remains strictly 0');
    recordPass('Capacity Enforcement: 409 Conflict returned when capacity exceeded, Scholarship A untouched');

    // -------------------------------------------------------------------------
    // TEST 3: Workflow Controller action === 'APPROVE' uses unified service
    // -------------------------------------------------------------------------
    const approveApp3Res = await request(
      'POST',
      `/api/applications/${app3Id}/action`,
      {
        action: 'APPROVE',
        payload: {
          approvalNote: 'Approved via workflow action endpoint',
          nextStepChecklist: ['Confirm award', 'Attend orientation'],
        },
      },
      providerToken
    );

    assert.strictEqual(approveApp3Res.status, 200, 'App 3 on Scholarship A approved via workflow action endpoint');

    const afterApp3ScholA = await db.collections.scholarships.findOne({ id: scholA.id });
    const afterApp3ScholB = await db.collections.scholarships.findOne({ id: scholB.id });

    assert.strictEqual(afterApp3ScholA.approved_count, 1, 'Scholarship A approved_count incremented to 1');
    assert.strictEqual(afterApp3ScholB.approved_count, 1, 'Scholarship B approved_count remains at 1');
    recordPass('Workflow Endpoint Integration: Shared approval service increments target scholarship correctly');

    // -------------------------------------------------------------------------
    // TEST 4: Idempotent Re-approval
    // -------------------------------------------------------------------------
    const retryApp1Res = await request(
      'PUT',
      `/api/applications/${app1Id}/status`,
      { status: 'APPROVED' },
      providerToken
    );

    assert.strictEqual(retryApp1Res.status, 200, 'Re-approval returns 200 idempotently');

    const finalScholA = await db.collections.scholarships.findOne({ id: scholA.id });
    const finalScholB = await db.collections.scholarships.findOne({ id: scholB.id });

    assert.strictEqual(finalScholA.approved_count, 1, 'Scholarship A final count is exactly 1');
    assert.strictEqual(finalScholB.approved_count, 1, 'Scholarship B final count is exactly 1');
    recordPass('Idempotency Guard: Re-approval does not alter slot counters');

  } catch (err) {
    recordFail('Multi-scholarship capacity isolation test suite error', err);
  } finally {
    if (testEnv && testEnv.server) {
      try { testEnv.server.close(); } catch (_) {}
    }
    await scopedCleanup().catch(() => {});
  }

  console.log('\n================================================================');
  console.log(`🎓 MULTI-SCHOLARSHIP CAPACITY SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTest();
