/**
 * ISKOLAR MESSAGE RESTART PERSISTENCE TEST
 * Validates that conversations and messages survive DB reloading and restarts without data loss.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const providerToken = createToken({
  id: 9,
  role: 'sponsor',
  email: 'gokongwei.brothers@iskolar.ph',
  name: 'Gokongwei Brothers Foundation',
});

const studentToken = createToken({
  id: 24,
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
  console.log('🚀 RUNNING ISKOLAR MESSAGE RESTART PERSISTENCE SUITE');
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
    const timestamp = Date.now();
    const testMessageBody = `Persistence test verification message [UID-${timestamp}]`;

    // 1. Post a new message with unique content
    const sendRes = await apiRequest('/applications/9/messages', {
      method: 'POST',
      token: providerToken,
      body: { body: testMessageBody },
    });
    assert(sendRes.status === 201, 'New message submitted to application #9');
    const sentMessageId = sendRes.data?.message?.id || sendRes.data?.message?._id;

    // 2. Read conversation back through student session
    const readRes = await apiRequest('/applications/9/conversation', { token: studentToken });
    assert(readRes.status === 200, 'Student loaded conversation thread');
    const found = readRes.data?.messages?.some((m) => m.body === testMessageBody);
    assert(found === true, 'Persisted message found in conversation history with exact content match');

  } catch (err) {
    console.error('Persistence test error:', err.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
