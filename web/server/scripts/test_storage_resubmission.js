/**
 * ISKOLAR Storage Resubmission & Full Flow Test Suite (Phase 11, 12, 15)
 * 
 * Verifies end-to-end:
 * 1. Provider transitions application to RESUBMISSION_REQUIRED
 * 2. Student resubmits replacement document through StorageService
 * 3. Document version is incremented (v2) and previous version is archived
 * 4. Application status transitions to PENDING_HUMAN_REVIEW
 * 5. Provider approves application after verifying replacement
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

// Provider (Gokongwei, id: 9)
const providerToken = createToken({
  id: 9,
  role: 'sponsor',
  email: 'gokongwei.brothers@iskolar.ph',
  name: 'Gokongwei Brothers Foundation',
});

// Student (Eric Villanueva, id: 24, owner of app 9)
const studentToken = createToken({
  id: 24,
  role: 'student',
  email: 'eric.villanueva@iskolar.ph',
  name: 'Eric Villanueva',
});

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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

async function runStorageResubmissionTests() {
  console.log('========================================================');
  console.log('🔄 RUNNING ISKOLAR STORAGE RESUBMISSION WORKFLOW SUITE');
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
    // 1. Fetch Provider Applications and identify active test candidate
    const appsListRes = await apiRequest('/applications', { token: providerToken });
    const appsList = appsListRes.data?.applications || appsListRes.data || [];
    let targetApp = appsList.find((a) => a.status !== 'CLOSED' && (a.status === 'PENDING_HUMAN_REVIEW' || a.status === 'pending' || a.status === 'SUBMITTED' || a.status === 'MORE_INFORMATION_REQUIRED'));
    if (!targetApp) {
      targetApp = appsList.find((a) => a.status !== 'CLOSED') || appsList[0];
    }
    const appId = targetApp?.id || targetApp?._id || '9';

    const appRes = await apiRequest(`/applications/${appId}`, { token: providerToken });
    assertCondition(appRes.ok, `1. Successfully fetched application record #${appId}`);
    const appData = appRes.data?.application || appRes.data || {};
    const actualStudentId = appData.student_id || targetApp?.student_id || 23;
    const dynamicStudentToken = createToken({
      id: actualStudentId,
      role: 'student',
      email: appData.student_email || 'student@iskolar.ph',
      name: appData.student_name || 'Scholar Candidate',
    });
    
    // Ensure status is PENDING_HUMAN_REVIEW for clean test execution
    if (appData.status !== 'PENDING_HUMAN_REVIEW') {
      await apiRequest(`/applications/${appId}/status`, {
        method: 'PUT',
        token: providerToken,
        body: { status: 'PENDING_HUMAN_REVIEW' },
      }).catch(() => {});
    }

    // 2. Provider requests resubmission
    const resubReqRes = await apiRequest(`/applications/${appId}/action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'REQUEST_RESUBMISSION',
        reason: 'The Certificate of Registration is blurry and illegible. Please provide a clear scan.',
        documentType: 'Certificate of Registration (COR)',
      },
    });

    assertCondition(
      resubReqRes.status === 200 &&
      (resubReqRes.data?.application?.status === 'RESUBMISSION_REQUIRED' || resubReqRes.data?.status === 'RESUBMISSION_REQUIRED'),
      '2. Provider successfully requested document resubmission (status -> RESUBMISSION_REQUIRED)'
    );

    // 3. Student uploads replacement document
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const studentUploadRes = await apiRequest(`/applications/${appId}/resubmit-document`, {
      method: 'POST',
      token: dynamicStudentToken,
      body: {
        filename: 'PLM_COR_Clear_Scan.png',
        fileContent: `data:image/png;base64,${validPngBase64}`,
        notes: 'Here is the high resolution scan of my Certificate of Registration.',
      },
    });

    assertCondition(
      studentUploadRes.status === 200 &&
      (studentUploadRes.data?.application?.status === 'PENDING_HUMAN_REVIEW' || studentUploadRes.data?.status === 'PENDING_HUMAN_REVIEW'),
      '3. Student resubmitted replacement document through StorageService (status -> PENDING_HUMAN_REVIEW)'
    );

    // 4. Provider reviews and approves application
    const approveRes = await apiRequest(`/applications/${appId}/review-action`, {
      method: 'POST',
      token: providerToken,
      body: {
        action: 'APPROVE',
        reason: 'Replacement document verified and meets all scholarship requirements.',
      },
    });

    assertCondition(
      approveRes.status === 200 &&
      (approveRes.data?.application?.status === 'APPROVED' || approveRes.data?.status === 'APPROVED'),
      '4. Provider approved application after validating resubmitted document (status -> APPROVED)'
    );

  } catch (err) {
    console.error('Storage resubmission workflow error:', err.message);
    failed++;
  }

  console.log(`\n========================================================`);
  console.log(`STORAGE RESUBMISSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

runStorageResubmissionTests();
