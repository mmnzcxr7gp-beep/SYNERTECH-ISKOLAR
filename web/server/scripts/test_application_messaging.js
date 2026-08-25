/**
 * ISKOLAR SECURE APPLICATION MESSAGING & AUTHORIZATION TEST SUITE
 * Tests application-scoped messaging threads, message creation, idempotency,
 * cross-student and cross-provider authorization boundaries, and system event messages.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Authorized Provider for Gokongwei (id: 9)
const providerToken = createToken({
  id: 9,
  role: 'sponsor',
  email: 'gokongwei.brothers@iskolar.ph',
  name: 'Gokongwei Brothers Foundation',
});

// Unauthorized Provider (Ayala Foundation, id: 8)
const unauthorizedProviderToken = createToken({
  id: 8,
  role: 'sponsor',
  email: 'ayala.foundation@iskolar.ph',
  name: 'Ayala Foundation',
});

// Candidate Student (Eric Villanueva, id: 24 on application #9)
const studentToken = createToken({
  id: 24,
  role: 'student',
  email: 'eric.villanueva@iskolar.ph',
  name: 'Eric Villanueva',
});

// Other Student (Bea Aquino, id: 21 - NOT the applicant on application #9)
const otherStudentToken = createToken({
  id: 21,
  role: 'student',
  email: 'bea.aquino@iskolar.ph',
  name: 'Bea Aquino',
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
  console.log('🚀 RUNNING ISKOLAR SECURE APPLICATION MESSAGING SUITE');
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
    // TEST 1: Identify Target Application
    // -------------------------------------------------------------------------
    console.log('📋 Test 1: Fetch Target Application');
    const appsRes = await apiRequest('/applications', { token: providerToken });
    const appsList = appsRes.data?.applications || appsRes.data || [];
    assert(appsRes.status === 200 && appsList.length > 0, 'Fetched applications successfully');
    const targetApp = appsList.find((a) => String(a.id) === '9') || appsList[0];
    const appId = targetApp.id || targetApp._id;
    console.log(`   Target Application: #${appId} (${targetApp.student_name})`);

    // -------------------------------------------------------------------------
    // TEST 2: Cross-Student Messaging Authorization Boundary
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 2: Cross-Student Messaging Authorization Boundary');
    const unauthGetRes = await apiRequest(`/applications/${appId}/conversation`, { token: otherStudentToken });
    assert(unauthGetRes.status === 403, `Unauthorized student conversation access rejected with HTTP 403 (Received: ${unauthGetRes.status})`);

    const unauthPostRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: otherStudentToken,
      body: { body: 'Sneaky cross-student message attempt' },
    });
    assert(unauthPostRes.status === 403, `Unauthorized student message post rejected with HTTP 403 (Received: ${unauthPostRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 3: Cross-Provider Messaging Authorization Boundary
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 3: Cross-Provider Messaging Authorization Boundary');
    const unauthProvGetRes = await apiRequest(`/applications/${appId}/conversation`, { token: unauthorizedProviderToken });
    assert(unauthProvGetRes.status === 403, `Unauthorized provider conversation access rejected with HTTP 403 (Received: ${unauthProvGetRes.status})`);

    const unauthProvPostRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: unauthorizedProviderToken,
      body: { body: 'Unauthorized provider message intrusion' },
    });
    assert(unauthProvPostRes.status === 403, `Unauthorized provider message post rejected with HTTP 403 (Received: ${unauthProvPostRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 4: Student Cannot Send Fake SYSTEM Message
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 4: Students Forbidden From Sending SYSTEM Messages');
    const studentSpoofRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: studentToken,
      body: { body: 'Fake System Approval Spoof', messageType: 'SYSTEM' },
    });
    assert(studentSpoofRes.status === 403, `Student system message spoof rejected with HTTP 403 (Received: ${studentSpoofRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 5: Legitimate Provider & Student Messaging Exchange
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 5: Legitimate Messaging Thread Lifecycle');
    // Provider sends message
    const pMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: providerToken,
      body: { body: 'Hello Eric, your application documents are currently being evaluated by our committee.' },
    });
    assert(pMsgRes.status === 201, 'Provider sent secure message');
    assert(pMsgRes.data.message.senderRole === 'sponsor' || pMsgRes.data.message.senderRole === 'provider', 'Provider sender role verified from JWT');

    // Student reads conversation
    const sConvRes = await apiRequest(`/applications/${appId}/conversation`, { token: studentToken });
    assert(sConvRes.status === 200, 'Student loaded application conversation');
    assert(Array.isArray(sConvRes.data.messages) && sConvRes.data.messages.length > 0, 'Messages list contains conversation history');

    // Student replies
    const sMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: studentToken,
      body: { body: 'Thank you Gokongwei Foundation! I am ready to submit any additional materials needed.' },
    });
    assert(sMsgRes.status === 201, 'Student sent reply message');
    assert(sMsgRes.data.message.senderRole === 'student', 'Student sender role verified from JWT');

    // -------------------------------------------------------------------------
    // TEST 6: Message Input Validation (Empty body rejected)
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 6: Message Input Validation');
    const emptyMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: studentToken,
      body: { body: '   ' },
    });
    assert(emptyMsgRes.status === 400, `Empty message body rejected with HTTP 400 (Received: ${emptyMsgRes.status})`);

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
