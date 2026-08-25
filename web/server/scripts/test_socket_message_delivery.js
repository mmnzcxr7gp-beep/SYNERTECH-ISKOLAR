/**
 * ISKOLAR REAL-TIME SOCKET.IO MESSAGING DELIVERY TEST SUITE
 * Validates real-time socket events for new messages and status transitions
 * delivering to targeted user rooms and conversation rooms without crosstalk.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const io = require('../../client/node_modules/socket.io-client');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = process.env.TEST_SOCKET_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Provider (Gokongwei Foundation, id: 9)
const providerToken = createToken({
  id: 9,
  role: 'sponsor',
  email: 'gokongwei.brothers@iskolar.ph',
  name: 'Gokongwei Brothers Foundation',
});

// Candidate Student (Eric Villanueva, id: 24 on application #9)
const studentToken = createToken({
  id: 24,
  role: 'student',
  email: 'eric.villanueva@iskolar.ph',
  name: 'Eric Villanueva',
});

// Other Student (Diana Torres, id: 22)
const studentBToken = createToken({
  id: 22,
  role: 'student',
  email: 'diana.torres@iskolar.ph',
  name: 'Diana Torres',
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

  // Connect sockets with real JWT tokens
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

  studentSocket.on('notification', (data) => {
    studentReceivedNotification = true;
  });

  studentBSocket.on('notification', (data) => {
    studentBReceivedNotification = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    const appsRes = await apiRequest('/applications', { token: providerToken });
    const appsList = appsRes.data?.applications || appsRes.data || [];
    const targetApp = appsList.find((a) => String(a.id) === '9') || appsList[0];
    const appId = targetApp.id || targetApp._id;

    // Provider sends message to Candidate application #9
    const msgRes = await apiRequest(`/applications/${appId}/messages`, {
      method: 'POST',
      token: providerToken,
      body: { body: 'Socket targeted delivery verification test' },
    });
    assert(msgRes.status === 201, 'Message posted through API');

    // Wait for event propagation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    assert(studentReceivedNotification === true, 'Candidate Student (Eric) received targeted notification via Socket.IO');
    assert(studentBReceivedNotification === false, 'Other Student (Diana) did NOT receive notification (Room isolation verified)');

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
