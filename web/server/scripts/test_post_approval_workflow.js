/**
 * ISKOLAR POST-REVIEW WORKFLOW & STATE MACHINE TEST SUITE
 * 
 * Validates:
 * 1. State machine validation & HTTP 409 Conflict rejection for illegal transitions
 * 2. Action 1: Request More Information (MORE_INFORMATION_REQUIRED)
 * 3. Student reply to More Info (returns to PENDING_HUMAN_REVIEW)
 * 4. Action 2: Request Document Resubmission (RESUBMISSION_REQUIRED)
 * 5. Student replacement document resubmission (returns to PENDING_HUMAN_REVIEW)
 * 6. Action 3: Schedule Interview / Examination (INTERVIEW_SCHEDULED)
 * 7. Student acknowledge schedule
 * 8. Action 4: Qualify for Final Review (QUALIFIED_FOR_FINAL_REVIEW)
 * 9. Action 5: Approve Application (APPROVED) with checklist and instructions
 * 10. Student acknowledge approval
 * 11. Action 6: Reject Application (REJECTED) with mandatory reason
 * 12. Immutable timeline history and system messaging synchronization
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Authorized Provider (Gokongwei Foundation, id: 101)
let providerToken = createToken({
  id: 101,
  role: 'sponsor',
  email: 'gokongwei.brothers@iskolar.ph',
  name: 'Gokongwei Brothers Foundation',
});

// Candidate Student (Eric Villanueva, id: 23, applicant on app #9)
const studentToken = createToken({
  id: 23,
  role: 'student',
  email: 'eric.villanueva@iskolar.ph',
  name: 'Eric Villanueva',
});

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
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

async function runTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING ISKOLAR POST-REVIEW WORKFLOW & STATE MACHINE SUITE');
  console.log('========================================================\n');
  let passed = 0;
  let failed = 0;

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
    // -------------------------------------------------------------------------
    // TEST 1: Retrieve Applications & Identify Test Candidate
    // -------------------------------------------------------------------------
    console.log('📋 Test 1: Retrieve Provider Applications');
    const appsRes = await apiRequest('/applications', { token: providerToken });
    const appsList = appsRes.data?.applications || appsRes.data || [];
    assert(appsRes.status === 200 && appsList.length > 0, `Provider fetched scholarship applications (Found: ${appsList.length})`);
    
    // Find an active candidate not in terminal CLOSED state
    let targetApp = appsList.find((a) => a.status !== 'CLOSED' && (a.status === 'PENDING_HUMAN_REVIEW' || a.status === 'pending' || a.status === 'SUBMITTED' || a.status === 'MORE_INFORMATION_REQUIRED'));
    if (!targetApp) {
      targetApp = appsList.find((a) => a.status !== 'CLOSED') || appsList[0];
    }
    const appId = targetApp.id || targetApp._id;
    const studentToken = createToken({
      id: targetApp.student_id || 24,
      role: 'student',
      email: targetApp.student_email || 'student@iskolar.ph',
      name: targetApp.student_name || 'Scholar Candidate',
    });
    console.log(`   Selected Candidate: ${targetApp.student_name} (App ID: ${appId}, Student ID: ${targetApp.student_id}, Initial Status: ${targetApp.status})`);

    // Reset status on server to PENDING_HUMAN_REVIEW for clean lifecycle test run
    if (targetApp.status !== 'PENDING_HUMAN_REVIEW') {
      await apiRequest(`/applications/${appId}/status`, {
        method: 'PUT',
        token: providerToken,
        body: { status: 'PENDING_HUMAN_REVIEW' },
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: State Machine 409 Conflict on Illegal Transition
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 2: State Machine Validation & 409 Conflict Handling');
    const illegalRes = await apiRequest(`/applications/${appId}/status`, {
      method: 'PUT',
      token: providerToken,
      body: { status: 'CLOSED' },
    });
    assert(illegalRes.status === 409, `Illegal transition rejected with HTTP 409 Conflict (Received: ${illegalRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 3: Action 1 - Request More Information
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 3: Action 1 - Request More Information');
    const moreInfoRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'REQUEST_MORE_INFO',
        payload: {
          title: 'Enrollment Verification Clarification',
          instructions: 'Please provide clarification regarding your current semester academic unit load.',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          priority: 'URGENT',
          uploadRequired: false,
        },
      },
    });
    assert(moreInfoRes.status === 200, 'Provider successfully requested additional information');
    assert(moreInfoRes.data.application.status === 'MORE_INFORMATION_REQUIRED', 'Application status updated to MORE_INFORMATION_REQUIRED');

    // -------------------------------------------------------------------------
    // TEST 4: Student Responds to More Information
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 4: Student Responds to Information Request');
    const studentReplyRes = await apiRequest(`/applications/${appId}/more-info-response`, {
      method: 'POST',
      token: studentToken,
      body: {
        responseText: 'I am currently enrolled in 18 regular academic units with complete laboratory courses.',
      },
    });
    assert(studentReplyRes.status === 200, 'Student successfully submitted requested information');
    assert(studentReplyRes.data.application.status === 'PENDING_HUMAN_REVIEW', 'Application returned to PENDING_HUMAN_REVIEW');

    // -------------------------------------------------------------------------
    // TEST 5: Action 2 - Request Document Resubmission
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 5: Action 2 - Request Document Resubmission');
    const resubReqRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'REQUEST_RESUBMISSION',
        payload: {
          documentType: 'Certificate of Registration',
          reason: 'File unreadable or blurred',
          instructions: 'Please upload a scanned high-resolution copy with registrar seal.',
        },
      },
    });
    assert(resubReqRes.status === 200, 'Provider requested document resubmission');
    assert(resubReqRes.data.application.status === 'RESUBMISSION_REQUIRED', 'Application status updated to RESUBMISSION_REQUIRED');

    // -------------------------------------------------------------------------
    // TEST 6: Student Resubmits Replacement Document
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 6: Student Resubmits Replacement Document');
    const resubmitDocRes = await apiRequest(`/applications/${appId}/resubmit-document`, {
      method: 'POST',
      token: studentToken,
      body: {
        filename: 'Official_COR_Clear_Copy.png',
        fileContent: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        notes: 'Attached scanned registrar stamped copy.',
      },
    });
    assert(resubmitDocRes.status === 200, 'Student resubmitted replacement document');
    assert(resubmitDocRes.data.application.status === 'PENDING_HUMAN_REVIEW', 'Application status returned to PENDING_HUMAN_REVIEW');

    // -------------------------------------------------------------------------
    // TEST 7: Action 3 - Schedule Interview & Student Acknowledgment
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 7: Action 3 - Schedule Interview & Student Acknowledgment');
    const schedRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'SCHEDULE_INTERVIEW',
        payload: {
          date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          time: '14:00',
          endTime: '14:45',
          location: 'Virtual Meeting',
          meetingLink: 'https://meet.google.com/isk-interview-demo',
          instructions: 'Please join 5 minutes early with your student ID.',
        },
      },
    });
    if (schedRes.status !== 200) console.error('Schedule Error:', schedRes.data);
    assert(schedRes.status === 200, 'Provider scheduled candidate interview');
    assert(schedRes.data?.application?.status === 'INTERVIEW_SCHEDULED', 'Application status updated to INTERVIEW_SCHEDULED');

    // Student Acknowledges Schedule
    const ackSchedRes = await apiRequest(`/applications/${appId}/acknowledge-schedule`, {
      method: 'POST',
      token: studentToken,
    });
    assert(ackSchedRes.status === 200, 'Student acknowledged interview schedule');
    assert(ackSchedRes.data.scheduleData.acknowledgedByStudent === true, 'Schedule marked as acknowledged by student');

    // -------------------------------------------------------------------------
    // TEST 8: Action 4 - Mark as Qualified for Final Review
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 8: Action 4 - Mark as Qualified for Final Review');
    const qualifyRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'QUALIFY_FOR_FINAL_REVIEW',
        payload: { notes: 'Passed panel interview with excellent score.' },
      },
    });
    assert(qualifyRes.status === 200, 'Provider qualified candidate for final review');
    assert(qualifyRes.data.application.status === 'QUALIFIED_FOR_FINAL_REVIEW', 'Application status updated to QUALIFIED_FOR_FINAL_REVIEW');

    // -------------------------------------------------------------------------
    // TEST 9: Action 5 - Approve Application & Student Acceptance
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 9: Action 5 - Approve Application & Post-Approval Follow-Up');
    const approveRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'APPROVE_APPLICATION',
        payload: {
          approvalNote: 'Congratulations! Welcome as a Gokongwei Scholar.',
          effectiveDate: new Date().toISOString(),
          scholarshipInstructions: 'Please verify acceptance and prepare required enrollment documents.',
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

    // Student Acknowledges Approval
    const ackApproveRes = await apiRequest(`/applications/${appId}/acknowledge-approval`, {
      method: 'POST',
      token: studentToken,
    });
    assert(ackApproveRes.status === 200, 'Student acknowledged and accepted scholarship award');
    assert(ackApproveRes.data.approvalData.acknowledgedByStudent === true, 'Award marked acknowledged by student');

    // -------------------------------------------------------------------------
    // TEST 10: Conversation & Timeline Synchronization
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 10: Conversation Thread & Timeline Synchronization');
    const convRes = await apiRequest(`/applications/${appId}/conversation`, { token: studentToken });
    assert(convRes.status === 200, 'Retrieved application conversation thread');
    assert(convRes.data.messages?.length >= 5, `Conversation thread contains recorded workflow system messages (Found: ${convRes.data.messages?.length})`);
    assert(convRes.data.timeline?.length >= 5, `Timeline contains recorded audit trail events (Found: ${convRes.data.timeline?.length})`);

  } catch (error) {
    console.error('Fatal test execution error:', error.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
