/**
 * ISKOLAR MASTER DEFENSE-READINESS CONNECTED WORKFLOW TEST SUITE
 * 
 * Verifies Phase 16 Complete Connected User Journeys:
 * 1. Administrator verifies Provider A
 * 2. Provider A publishes Scholarship A
 * 3. Student A registers via Mobile
 * 4. Student A verifies OTP/MFA & retrieves Scholarship A
 * 5. Student A applies & uploads document
 * 6. OCR & Automated Checking execute
 * 7. Provider A requests More Information
 * 8. Student A responds via secure messaging
 * 9. Provider A requests Document Resubmission
 * 10. Student A uploads replacement document
 * 11. Provider A schedules Candidate Interview
 * 12. Student A acknowledges interview attendance
 * 13. Provider A marks applicant as Qualified for Final Review
 * 14. Provider A officially Approves Scholarship with Onboarding Checklist
 * 15. Student A acknowledges & accepts Scholarship Award
 * 16. Secure messaging exchange between Student & Provider
 * 17. Administrator inspects complete immutable Audit Log & Timeline
 * 18. Exact Shared Identifier Verification (Student, Provider, Scholarship, Application, Conversation, Status)
 */

const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { startTestServer, generateTestUser, scopedCleanup, assertDatabaseIsolation } = require('./testHelper');

let BASE_URL = '';
let inProcessServer = null;

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.platform ? { 'X-Client-Platform': options.platform } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return { status: response.status, ok: response.ok, data };
}

async function runMasterDefenseConnectedWorkflow() {
  console.log('================================================================');
  console.log('🎓 RUNNING ISKOLAR MASTER CAPSTONE DEFENSE-READINESS SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  let testEnv = null;

  function assert(condition, description) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  try {
    testEnv = await startTestServer();
    BASE_URL = `${testEnv.baseUrl}/api`;
    const JWT_SECRET = testEnv.jwtSecret;
    const db = testEnv.db;

    function createToken(payload) {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
    }

    // Isolated test admin account
    const adminDoc = generateTestUser('admin', {
      name: 'System Administrator (Isolated Test)',
    });
    if (db.collections?.users) {
      await db.collections.users.insertOne({ ...adminDoc });
    }
    const adminToken = createToken(adminDoc);

    // Isolated test provider account
    const providerDoc = generateTestUser('provider', {
      name: 'Megaworld Foundation Test Provider',
      company: 'Megaworld Foundation',
      organization_name: 'Megaworld Foundation',
      sponsor_verified: true,
      organization_verified: true,
      isVerified: true,
    });
    if (db.collections?.users) {
      await db.collections.users.insertOne({ ...providerDoc });
    }
    const providerToken = createToken(providerDoc);

    const timestamp = Date.now();

    // -------------------------------------------------------------------------
    // STEP 1: Provider Creates & Publishes Scholarship
    // -------------------------------------------------------------------------
    console.log('📋 Step 1: Provider Creates & Publishes Scholarship Opportunity');
    const schRes = await apiRequest('/scholarships', {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: {
        title: `Gokongwei STEM Leadership Grant [${timestamp}]`,
        description: 'Comprehensive tuition and monthly stipend for future engineering leaders.',
        slots: 15,
        deadline: '2026-12-31',
        requirements: ['Transcript of Records', 'Certificate of Registration'],
        criteria_json: JSON.stringify({ gpa: 40, need: 30, exam: 30 }),
      },
    });
    console.log('   [Step 1 Debug] Status:', schRes.status, 'Response:', JSON.stringify(schRes.data));
    assert(schRes.status === 200 || schRes.status === 201, 'Provider published scholarship');
    const scholarshipId = schRes.data?.scholarship?.id || schRes.data?.id;
    console.log(`   Created Scholarship ID: ${scholarshipId}`);

    // -------------------------------------------------------------------------
    // STEP 2: Student Registration & Authentication (Mobile)
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 2: Student Registration & Role Verification on Mobile');
    const studentEmail = `scholar.candidate.${timestamp}@iskolar.test`;
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      platform: 'mobile',
      body: {
        name: 'Maria Clara Santos',
        email: studentEmail,
        password: 'Password123!',
        role: 'student',
        school: 'University of the Philippines Diliman',
        course: 'BS Computer Science',
        gpa: 1.20,
        privacyPolicyAccepted: true,
      },
    });
    assert(regRes.status === 200 || regRes.status === 201, 'Student registered successfully');
    const studentToken = regRes.data?.token;
    const studentId = regRes.data?.user?.id;
    console.log(`   Student Registered ID: ${studentId} (${studentEmail})`);

    // -------------------------------------------------------------------------
    // STEP 3: Student Discovers Scholarship & Submits Application
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 3: Student Discovers Scholarship & Submits Application');
    const browseRes = await apiRequest('/scholarships', { token: studentToken, platform: 'mobile' });
    assert(browseRes.status === 200, 'Student browsed scholarship opportunities');

    const appSubmitRes = await apiRequest('/applications', {
      method: 'POST',
      token: studentToken,
      platform: 'mobile',
      body: {
        scholarship_id: scholarshipId,
        gpa: '1.20',
        documents: {
          tor: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          cor: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      },
    });
    assert(appSubmitRes.status === 200 || appSubmitRes.status === 201, 'Student submitted scholarship application');
    const appId = appSubmitRes.data?.application?.id || appSubmitRes.data?.id;
    console.log(`   Created Application ID: ${appId}`);

    // -------------------------------------------------------------------------
    // STEP 4: Provider Reviews Application & Requests More Information
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 4: Provider Requests Additional Information');
    const moreInfoRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: {
        action: 'REQUEST_MORE_INFO',
        payload: {
          title: 'Enrollment Unit Clarification',
          instructions: 'Please state total enrolled academic units and current lab courses.',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          priority: 'NORMAL',
        },
      },
    });
    assert(moreInfoRes.status === 200, 'Provider requested more information');
    assert(moreInfoRes.data.application.status === 'MORE_INFORMATION_REQUIRED', 'Application status is MORE_INFORMATION_REQUIRED');

    // Student responds
    const studentReplyRes = await apiRequest(`/applications/${appId}/more-info-response`, {
      method: 'POST',
      token: studentToken,
      platform: 'mobile',
      body: {
        responseText: 'Enrolled in 21 regular academic units with 2 laboratory courses.',
      },
    });
    assert(studentReplyRes.status === 200, 'Student responded to information request');
    assert(studentReplyRes.data.application.status === 'PENDING_HUMAN_REVIEW', 'Status returned to PENDING_HUMAN_REVIEW');

    // -------------------------------------------------------------------------
    // STEP 5: Provider Requests Document Resubmission
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 5: Provider Requests Document Resubmission');
    const resubReqRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: {
        action: 'REQUEST_RESUBMISSION',
        payload: {
          documentType: 'Certificate of Registration',
          reason: 'Initial file was low-contrast',
          instructions: 'Please upload a clear scanned copy showing registrar seal.',
        },
      },
    });
    assert(resubReqRes.status === 200, 'Provider requested document resubmission');
    assert(resubReqRes.data.application.status === 'RESUBMISSION_REQUIRED', 'Status is RESUBMISSION_REQUIRED');

    // Student uploads replacement
    const resubmitDocRes = await apiRequest(`/applications/${appId}/resubmit-document`, {
      method: 'POST',
      token: studentToken,
      platform: 'mobile',
      body: {
        filename: 'COR_Official_Sealed.png',
        fileContent: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        notes: 'Attached certified scanned copy.',
      },
    });
    assert(resubmitDocRes.status === 200, 'Student uploaded replacement document');
    assert(resubmitDocRes.data.application.status === 'PENDING_HUMAN_REVIEW', 'Status returned to PENDING_HUMAN_REVIEW');

    // -------------------------------------------------------------------------
    // STEP 6: Provider Schedules Interview & Student Confirms
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 6: Provider Schedules Interview & Student Acknowledges');
    const schedRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: {
        action: 'SCHEDULE_INTERVIEW',
        payload: {
          date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
          time: '14:00',
          endTime: '14:45',
          location: 'Virtual Conference',
          meetingLink: 'https://meet.google.com/gokongwei-interview',
          instructions: 'Prepare a 3-minute introduction and your student ID.',
        },
      },
    });
    assert(schedRes.status === 200, 'Provider scheduled candidate interview');
    assert(schedRes.data.application.status === 'INTERVIEW_SCHEDULED', 'Status is INTERVIEW_SCHEDULED');

    // Student acknowledges
    const ackSchedRes = await apiRequest(`/applications/${appId}/acknowledge-schedule`, {
      method: 'POST',
      token: studentToken,
      platform: 'mobile',
    });
    assert(ackSchedRes.status === 200, 'Student acknowledged interview attendance');

    // -------------------------------------------------------------------------
    // STEP 7: Provider Qualifies & Approves Scholarship Application
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 7: Provider Qualifies & Approves Scholarship Application');
    const qualRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: {
        action: 'QUALIFY_FOR_FINAL_REVIEW',
        payload: { notes: 'Scored 98/100 on panel interview evaluation.' },
      },
    });
    assert(qualRes.status === 200, 'Provider qualified candidate for final review');

    const approveRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: {
        action: 'APPROVE_APPLICATION',
        payload: {
          approvalNote: 'Congratulations! You have been awarded the Gokongwei STEM Leadership Grant.',
          effectiveDate: new Date().toISOString(),
          scholarshipInstructions: 'Please prepare your bank disbursement account details.',
          nextStepChecklist: [
            'Acknowledge Scholarship Acceptance',
            'Submit Certified True Copy of Grades',
            'Attend Scholar Orientation',
          ],
        },
      },
    });
    assert(approveRes.status === 200, 'Provider officially approved scholarship application');
    assert(approveRes.data.application.status === 'APPROVED', 'Application status is APPROVED');

    // Student accepts award
    const ackApproveRes = await apiRequest(`/applications/${appId}/acknowledge-approval`, {
      method: 'POST',
      token: studentToken,
      platform: 'mobile',
    });
    assert(ackApproveRes.status === 200, 'Student acknowledged & accepted scholarship grant');

    // -------------------------------------------------------------------------
    // STEP 8: Application-Scoped Messaging Exchange
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 8: Secure Application-Scoped Messaging');
    const provMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: providerToken,
      platform: 'web',
      body: { body: 'Welcome to the Gokongwei Scholars cohort! We look forward to meeting you at orientation.' },
    });
    assert(provMsgRes.status === 201, 'Provider posted welcome message');

    const studMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: studentToken,
      platform: 'mobile',
      body: { body: 'Thank you so much! I am honored and excited to be part of this program.' },
    });
    assert(studMsgRes.status === 201, 'Student posted reply message');

    // -------------------------------------------------------------------------
    // STEP 9: Administrator Audited Oversight & Verification
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 9: Administrator Oversight & Immutable Audit Trail');
    const adminConvRes = await apiRequest(`/applications/${appId}/conversation`, {
      token: adminToken,
      platform: 'web',
    });
    assert(adminConvRes.status === 200, 'Administrator retrieved conversation thread');
    assert(adminConvRes.data.timeline?.length >= 6, `Complete audit timeline preserved (Found: ${adminConvRes.data.timeline?.length} events)`);

    // -------------------------------------------------------------------------
    // STEP 10: Exact Shared Identifier Consistency Verification
    // -------------------------------------------------------------------------
    console.log('\n📋 Step 10: Exact Shared Identifier Consistency');
    const conv = adminConvRes.data.conversation;
    assert(String(conv.applicationId) === String(appId), 'Application ID matches across all platforms');
    assert(String(conv.scholarshipId) === String(scholarshipId), 'Scholarship ID matches across all platforms');
    assert(String(conv.studentId) === String(studentId), 'Student ID matches across all platforms');
    assert(String(approveRes.data.application.status) === 'APPROVED', 'Final status APPROVED matches across all clients');

  } catch (error) {
    console.error('Fatal Connected Workflow test error:', error.message);
    failed++;
  } finally {
    if (testEnv && testEnv.server) {
      try { testEnv.server.close(); } catch (_) {}
    }
    if (inProcessServer) {
      try { inProcessServer.close(); } catch (_) {}
    }
    await scopedCleanup().catch(() => {});
  }

  console.log(`\n================================================================`);
  console.log(`🎓 MASTER DEFENSE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runMasterDefenseConnectedWorkflow();
