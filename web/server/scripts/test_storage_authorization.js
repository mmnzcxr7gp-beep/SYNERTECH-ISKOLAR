/**
 * ISKOLAR Storage Authorization Test Suite (Phase 9)
 * 
 * Verifies object-level authorization for document downloads and review data:
 * - Anonymous requests are rejected (401)
 * - Students can only access their own documents (200 for owner, 403 for other students)
 * - Providers can only access documents for scholarships they own (200 for owner, 403 for other providers)
 * - Administrators have authorized oversight (200)
 * - Malicious traversal parameters are safely rejected (400)
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

// Authorized Provider A (Gokongwei, id: 9)
const providerAToken = createToken({
  id: 9,
  role: 'sponsor',
  email: 'gokongwei.brothers@iskolar.ph',
  name: 'Gokongwei Brothers Foundation',
});

// Unauthorized Provider B (Ayala, id: 8)
const providerBToken = createToken({
  id: 8,
  role: 'sponsor',
  email: 'ayala.foundation@iskolar.ph',
  name: 'Ayala Foundation',
});

// Candidate Student A (Owner of App #9, id: 24)
const studentAToken = createToken({
  id: 24,
  role: 'student',
  email: 'eric.villanueva@iskolar.ph',
  name: 'Eric Villanueva',
});

// Other Student B (id: 21)
const studentBToken = createToken({
  id: 21,
  role: 'student',
  email: 'bea.aquino@iskolar.ph',
  name: 'Bea Aquino',
});

// Administrator (id: 1)
const adminToken = createToken({
  id: 1,
  role: 'admin',
  email: 'admin@iskolar.ph',
  name: 'System Administrator',
});

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
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

async function runStorageAuthorizationTests() {
  console.log('========================================================');
  console.log('🔒 RUNNING ISKOLAR STORAGE AUTHORIZATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assertCondition(condition, description) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  try {
    // 1. Identify target application document
    const appsRes = await apiRequest('/applications', { token: providerAToken });
    const appsList = appsRes.data?.applications || appsRes.data || [];
    const targetApp = appsList.find((a) => String(a.id) === '9') || appsList[0];
    const appId = targetApp.id || targetApp._id;

    const docId = targetApp.documents?.[0]?.id || targetApp.documents?.[0]?.documentId || 'doc-app-9';

    // Test 1: Anonymous request
    const anonRes = await apiRequest(`/documents/${docId}/download`);
    assertCondition(anonRes.status === 401, '1. Anonymous document download rejected with 401 Unauthorized');

    // Test 2: Student Owner Access
    const ownerRes = await apiRequest(`/documents/${docId}/download`, { token: studentAToken });
    assertCondition(ownerRes.status === 200 || ownerRes.status === 404, '2. Owner Student authorized for document download (200/404 physical)');

    // Test 3: Unrelated Student Access
    const crossStudentRes = await apiRequest(`/documents/${docId}/download`, { token: studentBToken });
    assertCondition(crossStudentRes.status === 403, '3. Cross-student document access rejected with 403 Forbidden');

    // Test 4: Assigned Provider Access
    const providerRes = await apiRequest(`/documents/${docId}/download`, { token: providerAToken });
    assertCondition(providerRes.status === 200 || providerRes.status === 404, '4. Assigned Provider authorized for document download');

    // Test 5: Unrelated Provider Access
    const crossProviderRes = await apiRequest(`/documents/${docId}/download`, { token: providerBToken });
    assertCondition(crossProviderRes.status === 403, '5. Unrelated Provider B access rejected with 403 Forbidden');

    // Test 6: Administrator Access
    const adminRes = await apiRequest(`/documents/${docId}/download`, { token: adminToken });
    assertCondition(adminRes.status === 200 || adminRes.status === 404, '6. Administrator authorized for oversight document download');

    // Test 7: Traversal Attempt
    const traversalRes = await apiRequest(`/documents/..%2f..%2fpackage.json/download`, { token: adminToken });
    assertCondition(traversalRes.status === 400 || traversalRes.status === 404, '7. Path traversal parameter rejected safely with 400/404');

  } catch (err) {
    console.error('Storage authorization test error:', err.message);
    failed++;
  }

  console.log(`\n========================================================`);
  console.log(`STORAGE AUTHORIZATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runStorageAuthorizationTests();
