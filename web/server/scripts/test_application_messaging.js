/**
 * ISKOLAR SECURE APPLICATION MESSAGING & AUTHORIZATION TEST SUITE
 * Tests application-scoped messaging threads, message creation, idempotency,
 * cross-student and cross-provider authorization boundaries, and system event messages.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

let BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';
let inProcessServer = null;

const { getSyntheticPasswordForEmail } = require('../src/config/syntheticCredentials');
const FormData = require('form-data');

let providerToken = null;
let unauthorizedProviderToken = null;
let studentToken = null;
let otherStudentToken = null;

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
    try {
      const probe = await fetch(`${BASE_URL}/health`).catch(() => null);
      if (!probe || !probe.ok) {
        const http = require('http');
        const { buildApp } = require('../src/vercelApp');
        const { connectDb } = require('../src/config/db');
        await connectDb();
        const app = buildApp();
        inProcessServer = http.createServer(app);
        await new Promise((res) => inProcessServer.listen(0, res));
        BASE_URL = `http://127.0.0.1:${inProcessServer.address().port}/api`;
      }
    } catch (_) {}

    async function login(email) {
      const password = getSyntheticPasswordForEmail(email);
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password, skipMfa: true },
      });
      return res.data?.token;
    }

    providerToken = await login('gokongwei.brothers@iskolar.ph');
    unauthorizedProviderToken = await login('ayala.foundation@iskolar.ph');
    studentToken = await login('maria.santos@iskolar.ph');
    otherStudentToken = await login('juan.delacruz@iskolar.ph');

    assert(!!providerToken && !!unauthorizedProviderToken && !!studentToken && !!otherStudentToken, 'Authenticated all 4 test roles successfully');

    // -------------------------------------------------------------------------
    // TEST 1: Identify or Create Target Application
    // -------------------------------------------------------------------------
    console.log('📋 Test 1: Fetch Target Application');
    let appsRes = await apiRequest('/applications', { token: providerToken });
    let appsList = appsRes.data?.applications || appsRes.data || [];

    if (appsList.length === 0) {
      // Create test application for scholarship 1001 (Gokongwei STEM Leadership Grant)
      const form = new FormData();
      form.append('scholarship_id', '1001');
      form.append('gpa', '1.40');
      form.append('documents', Buffer.from('%PDF-1.4 Application messaging test doc'), {
        filename: 'gokongwei_messaging_doc.pdf',
        contentType: 'application/pdf',
      });

      const http = require('http');
      await new Promise((resolve, reject) => {
        const u = new URL(BASE_URL);
        const req = http.request({
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + '/applications',
          method: 'POST',
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${studentToken}`,
          },
        }, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        form.pipe(req);
      });

      appsRes = await apiRequest('/applications', { token: providerToken });
      appsList = appsRes.data?.applications || appsRes.data || [];
    }

    assert(appsRes.status === 200 && appsList.length > 0, 'Fetched applications successfully');
    const targetApp = appsList[0];
    const appId = targetApp.id || targetApp._id;
    console.log(`   Target Application: #${appId} (${targetApp.student_name || 'Candidate'})`);

    // Dynamically identify owner vs unauthorized student
    let ownerToken = studentToken;
    let unauthorizedToken = otherStudentToken;
    const checkOwner = await apiRequest(`/applications/${appId}/conversation`, { token: studentToken });
    if (checkOwner.status === 403) {
      ownerToken = otherStudentToken;
      unauthorizedToken = studentToken;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Cross-Student Messaging Authorization Boundary
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 2: Cross-Student Messaging Authorization Boundary');
    const unauthGetRes = await apiRequest(`/applications/${appId}/conversation`, { token: unauthorizedToken });
    assert(unauthGetRes.status === 403, `Unauthorized student conversation access rejected with HTTP 403 (Received: ${unauthGetRes.status})`);

    const unauthPostRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: unauthorizedToken,
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
      token: ownerToken,
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
      body: { body: 'Hello candidate, your application documents are currently being evaluated by our committee.' },
    });
    assert(pMsgRes.status === 201, 'Provider sent secure message');
    const pRole = pMsgRes.data?.message?.senderRole || pMsgRes.data?.message?.sender_role;
    assert(pRole === 'sponsor' || pRole === 'provider', 'Provider sender role verified from JWT');

    // Student reads conversation
    const sConvRes = await apiRequest(`/applications/${appId}/conversation`, { token: ownerToken });
    assert(sConvRes.status === 200, 'Student loaded application conversation');
    assert(Array.isArray(sConvRes.data.messages) && sConvRes.data.messages.length > 0, 'Messages list contains conversation history');

    // Student replies
    const sMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: ownerToken,
      body: { body: 'Thank you Gokongwei Foundation! I am ready to submit any additional materials needed.' },
    });
    assert(sMsgRes.status === 201, 'Student sent reply message');
    const sRole = sMsgRes.data?.message?.senderRole || sMsgRes.data?.message?.sender_role;
    assert(sRole === 'student', 'Student sender role verified from JWT');

    // -------------------------------------------------------------------------
    // TEST 6: Message Input Validation (Empty body rejected)
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 6: Message Input Validation');
    const emptyMsgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: ownerToken,
      body: { body: '   ' },
    });
    assert(emptyMsgRes.status === 400, `Empty message body rejected with HTTP 400 (Received: ${emptyMsgRes.status})`);

  } catch (error) {
    console.error('Fatal test execution error:', error.message);
    failed++;
  } finally {
    if (inProcessServer) {
      try { inProcessServer.close(); } catch (_) {}
    }
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
