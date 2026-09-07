/**
 * ISKOLAR REAL-TIME SOCKET.IO MESSAGING DELIVERY TEST SUITE
 * Validates real-time socket events for new messages and status transitions
 * delivering to targeted user rooms and conversation rooms without crosstalk.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const io = require('../../client/node_modules/socket.io-client');
const { getSyntheticPasswordForEmail } = require('../src/config/syntheticCredentials');
const FormData = require('form-data');
const http = require('http');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:4000/api';
const SOCKET_URL = process.env.TEST_SOCKET_URL || 'http://127.0.0.1:4000';

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

async function login(email) {
  const password = getSyntheticPasswordForEmail(email);
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password, skipMfa: true },
  });
  return res.data?.token;
}

async function runTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING ISKOLAR SOCKET.IO MESSAGE DELIVERY SUITE');
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

  // 1. Authenticate with real synthetic credentials
  const providerToken = await login('gokongwei.brothers@iskolar.ph');
  const studentToken = await login('maria.santos@iskolar.ph');
  const studentBToken = await login('juan.delacruz@iskolar.ph');

  assert(!!providerToken && !!studentToken && !!studentBToken, 'Authenticated Provider and Students via JWT');

  // 2. Ensure an application exists for Gokongwei
  let appsRes = await apiRequest('/applications', { token: providerToken });
  let appsList = appsRes.data?.applications || appsRes.data || [];

  if (appsList.length === 0) {
    const form = new FormData();
    form.append('scholarship_id', '1001');
    form.append('gpa', '1.40');
    form.append('documents', Buffer.from('%PDF-1.4 Socket message delivery test doc'), {
      filename: 'gokongwei_socket_doc.pdf',
      contentType: 'application/pdf',
    });

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

  assert(appsList.length > 0, 'Target application available for messaging');
  const targetApp = appsList[0];
  const appId = targetApp.id || targetApp._id;

  // 3. Connect sockets with real JWT tokens
  const studentSocket = io(SOCKET_URL, {
    auth: { token: studentToken },
    transports: ['websocket', 'polling'],
  });

  const studentBSocket = io(SOCKET_URL, {
    auth: { token: studentBToken },
    transports: ['websocket', 'polling'],
  });

  let studentReceivedNotification = false;
  let studentBReceivedNotification = false;

  const onEvent = (socketName) => (data) => {
    if (socketName === 'student') studentReceivedNotification = true;
    if (socketName === 'studentB') studentBReceivedNotification = true;
  };

  studentSocket.on('notification', onEvent('student'));
  studentSocket.on('new-notification', onEvent('student'));
  studentSocket.on('new-message', onEvent('student'));

  studentBSocket.on('notification', onEvent('studentB'));
  studentBSocket.on('new-notification', onEvent('studentB'));
  studentBSocket.on('new-message', onEvent('studentB'));

  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    // 4. Provider sends message to Candidate application
    const msgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: providerToken,
      body: { body: 'Socket targeted delivery verification test' },
    });
    assert(msgRes.status === 201, 'Message posted through API');

    // Wait for event propagation
    await new Promise((resolve) => setTimeout(resolve, 1200));

    assert(studentReceivedNotification === true, 'Candidate Student (Maria) received targeted notification via Socket.IO');
    assert(studentBReceivedNotification === false, 'Other Student (Juan) did NOT receive notification (Room isolation verified)');

  } catch (err) {
    console.error('Socket test error:', err.message);
    failed++;
  } finally {
    studentSocket.disconnect();
    studentBSocket.disconnect();
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
