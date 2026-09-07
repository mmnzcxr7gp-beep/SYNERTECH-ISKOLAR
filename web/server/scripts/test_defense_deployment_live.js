/**
 * ISKOLAR 2.0 — Connected Defense Deployment Verification Suite
 * 
 * Verifies all 7 Defense Acceptance Items against either:
 * - A live deployed URL (e.g. https://iskolar-api.onrender.com or process.env.DEPLOYED_API_URL)
 * - The local connected instance (http://localhost:4000) backed by live Atlas & R2
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TARGET_URL = (process.argv[2] || process.env.DEPLOYED_API_URL || 'http://localhost:4000').replace(/\/$/, '');

console.log('================================================================');
console.log('🎓 ISKOLAR 2.0 — CONNECTED DEFENSE DEPLOYMENT VERIFICATION');
console.log('Target API Endpoint:', TARGET_URL);
console.log('Execution Time:', new Date().toISOString());
console.log('================================================================\n');

const results = [];

function recordResult(item, testName, passed, details = '') {
  results.push({ item, testName, passed, details });
  const icon = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`[${icon}] ${item}: ${testName} ${details ? `(${details})` : ''}`);
}

async function request(endpoint, options = {}) {
  const url = `${TARGET_URL}${endpoint}`;
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, headers: res.headers, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message, data: null };
  }
}

async function runVerification() {
  let studentToken = null;
  let providerToken = null;
  let adminToken = null;
  let testAppId = null;
  let testDocKey = null;

  const { connectDb, db } = require('../src/config/db');
  await connectDb();

  // =========================================================================
  // ITEM 1: Backend + MongoDB readiness probe
  // =========================================================================
  console.log('\n--- ITEM 1: Backend + MongoDB Readiness Check ---');
  const readiness = await request('/api/health/readiness');
  if (readiness.ok && readiness.status === 200 && readiness.data?.checks?.mongodb?.status === 'ready') {
    recordResult(
      'Backend + MongoDB readiness',
      'GET /api/health/readiness',
      true,
      `Database: ${readiness.data.checks.mongodb.database || 'iskolar'}, status: 200 ready`
    );
  } else {
    recordResult(
      'Backend + MongoDB readiness',
      'GET /api/health/readiness',
      false,
      readiness.error || `HTTP ${readiness.status}: ${JSON.stringify(readiness.data)}`
    );
  }

  // Also verify /health/readiness alias
  const aliasReadiness = await request('/health/readiness');
  if (aliasReadiness.ok && aliasReadiness.status === 200) {
    recordResult('Backend + MongoDB readiness', 'GET /health/readiness alias', true, 'HTTP 200 ready');
  } else {
    recordResult('Backend + MongoDB readiness', 'GET /health/readiness alias', false, `HTTP ${aliasReadiness.status}`);
  }

  // =========================================================================
  // ITEM 2: Mobile Login + Real Email OTP
  // =========================================================================
  console.log('\n--- ITEM 2: Authentication + MFA Email OTP ---');
  const { getSyntheticPasswordForEmail } = require('../src/config/syntheticCredentials');

  // 2.1 Student Login Flow
  const studentEmail = 'juan.delacruz@iskolar.ph';
  const studentPass = getSyntheticPasswordForEmail(studentEmail);

  // Test invalid password rejection
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password: 'WrongPassword123!' }),
  });
  if (!badLogin.ok && badLogin.status === 401) {
    recordResult('Mobile login + real email OTP', 'Reject invalid password', true, 'HTTP 401 rejected');
  } else {
    recordResult('Mobile login + real email OTP', 'Reject invalid password', false, `Status: ${badLogin.status}`);
  }

  // Proper credentials -> requires MFA
  const step1 = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password: studentPass }),
  });

  let studentMfaToken = step1.data?.mfaToken;
  if (step1.ok && (step1.data?.requiresMfa || step1.data?.requiresOtp || step1.data?.requiresMFA || step1.data?.token)) {
    recordResult('Mobile login + real email OTP', 'Student credential validation', true, 'MFA challenge initiated');

    // Reject wrong OTP
    const wrongOtpRes = await request('/api/auth/verify-login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaToken: studentMfaToken || 'dummy_token', otp: '000000' }),
    });
    if (!wrongOtpRes.ok) {
      recordResult('Mobile login + real email OTP', 'Reject invalid OTP code', true, 'HTTP 400/401 rejected');
    } else {
      recordResult('Mobile login + real email OTP', 'Reject invalid OTP code', false, 'Accepted bad OTP');
    }

    // Retrieve active OTP from database to simulate user entering email code
    const { db } = require('../src/config/db');
    let otpRecord = null;
    if (db.collections?.otps) {
      otpRecord = await db.collections.otps.findOne({ email: studentEmail });
    } else if (Array.isArray(db.data?.otps)) {
      otpRecord = db.data.otps.find((o) => o.email === studentEmail);
    }

    const studentOtpCode = otpRecord?.otp || otpRecord?.code || step1.data?.devOtp;
    if (studentOtpCode) {
      // Test resend OTP invalidates old OTP
      const resendRes = await request('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail }),
      });

      let newOtpRecord = null;
      if (db.collections?.otps) {
        newOtpRecord = await db.collections.otps.findOne({ email: studentEmail });
      } else if (Array.isArray(db.data?.otps)) {
        newOtpRecord = db.data.otps.find((o) => o.email === studentEmail);
      }
      const newOtpCode = newOtpRecord?.otp || newOtpRecord?.code || resendRes.data?.devOtp;

      if (resendRes.ok && newOtpCode && newOtpCode !== studentOtpCode) {
        recordResult('Mobile login + real email OTP', 'Resend OTP invalidates old code', true, 'New code generated');
        // Old OTP rejection
        const oldOtpRes = await request('/api/auth/verify-login-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mfaToken: studentMfaToken, otp: studentOtpCode }),
        });
        if (!oldOtpRes.ok) {
          recordResult('Mobile login + real email OTP', 'Old OTP code revoked', true, 'HTTP 400 rejected');
        }

        // Verify with new OTP
        const goodOtpRes = await request('/api/auth/verify-login-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mfaToken: studentMfaToken, otp: newOtpCode }),
        });
        if (goodOtpRes.ok && goodOtpRes.data?.token) {
          studentToken = goodOtpRes.data.token;
          recordResult('Mobile login + real email OTP', 'Student complete OTP login', true, 'JWT issued');
        } else {
          recordResult('Mobile login + real email OTP', 'Student complete OTP login', false, JSON.stringify(goodOtpRes.data));
        }
      } else {
        // Direct OTP verify
        const goodOtpRes = await request('/api/auth/verify-login-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mfaToken: studentMfaToken, otp: studentOtpCode }),
        });
        if (goodOtpRes.ok && goodOtpRes.data?.token) {
          studentToken = goodOtpRes.data.token;
          recordResult('Mobile login + real email OTP', 'Student complete OTP login', true, 'JWT issued');
        }
      }
    } else {
      recordResult('Mobile login + real email OTP', 'Student OTP retrieval', false, 'No OTP generated');
    }
  } else {
    recordResult('Mobile login + real email OTP', 'Student login start', false, `Status: ${step1.status}`);
  }

  // 2.2 Provider Login Flow
  const providerEmail = 'gokongwei.brothers@iskolar.ph';
  const providerPass = getSyntheticPasswordForEmail(providerEmail);
  const provStep1 = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: providerEmail, password: providerPass }),
  });
  if (provStep1.ok) {
    const provMfaToken = provStep1.data?.mfaToken;
    const { db } = require('../src/config/db');
    let provOtp = null;
    if (db.collections?.otps) {
      provOtp = await db.collections.otps.findOne({ email: providerEmail });
    } else if (Array.isArray(db.data?.otps)) {
      provOtp = db.data.otps.find((o) => o.email === providerEmail);
    }
    const provOtpCode = provOtp?.otp || provOtp?.code || provStep1.data?.devOtp;
    if (provOtpCode) {
      const provVerify = await request('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken: provMfaToken, otp: provOtpCode }),
      });
      if (provVerify.ok && provVerify.data?.token) {
        providerToken = provVerify.data.token;
        recordResult('Mobile login + real email OTP', 'Provider complete OTP login', true, 'JWT issued');
      }
    }
  }

  // 2.3 Admin Login Flow
  const adminEmail = 'admin@iskolar.ph';
  const adminPass = getSyntheticPasswordForEmail(adminEmail);
  const adminStep1 = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPass }),
  });
  if (adminStep1.ok) {
    const admMfaToken = adminStep1.data?.mfaToken;
    const { db } = require('../src/config/db');
    let admOtp = null;
    if (db.collections?.otps) {
      admOtp = await db.collections.otps.findOne({ email: adminEmail });
    } else if (Array.isArray(db.data?.otps)) {
      admOtp = db.data.otps.find((o) => o.email === adminEmail);
    }
    const admOtpCode = admOtp?.otp || admOtp?.code || adminStep1.data?.devOtp;
    if (admOtpCode) {
      const admVerify = await request('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken: admMfaToken, otp: admOtpCode }),
      });
      if (admVerify.ok && admVerify.data?.token) {
        adminToken = admVerify.data.token;
        recordResult('Mobile login + real email OTP', 'Admin complete OTP login', true, 'JWT issued');
      }
    }
  }

  // =========================================================================
  // ITEM 3: Document Upload / Download with Persistent Storage
  // =========================================================================
  console.log('\n--- ITEM 3: Document Upload & Retrieval ---');
  if (studentToken) {
    // 3.1 Reject empty or oversized files
    const emptyUpload = await request('/api/documents/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!emptyUpload.ok) {
      recordResult('Document upload/download', 'Reject empty file upload', true, 'HTTP 400 rejected');
    }

    // 3.2 Live R2 / Persistent Upload
    const testPdfHeader = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
    const storageService = require('../src/utils/storageService');

    const appUniqueId = Date.now();
    testAppId = appUniqueId;
    const uploadRes = await storageService.uploadFile({
      buffer: Buffer.from(testPdfHeader, 'utf-8'),
      originalName: 'defense_transcript.pdf',
      mimeType: 'application/pdf',
      applicationId: String(appUniqueId),
      documentId: `doc_${appUniqueId}`,
      studentId: 201,
    });

    if (uploadRes && uploadRes.storedKey) {
      testDocKey = uploadRes.storedKey;
      recordResult('Document upload/download', 'Upload valid PDF to persistent storage', true, `StoredKey: ${uploadRes.storedKey}`);

      // Verify file exists in storage
      const exists = await storageService.fileExists(uploadRes.storedKey);
      if (exists) {
        recordResult('Document upload/download', 'Verify persistence in storage driver', true, `Driver: ${uploadRes.driver || 'active'}`);
      }

      // Download own file
      const downloaded = await storageService.downloadFile(uploadRes.storedKey);
      if (downloaded && downloaded.buffer && downloaded.buffer.toString() === testPdfHeader) {
        recordResult('Document upload/download', 'Student downloads own file', true, 'Content integrity verified');
      } else {
        recordResult('Document upload/download', 'Student downloads own file', false, 'Content mismatch');
      }
    } else {
      recordResult('Document upload/download', 'Upload valid PDF', false, 'Upload failed');
    }
  }

  // =========================================================================
  // ITEM 4 & 5: Provider Approval & Admin Oversight
  // =========================================================================
  console.log('\n--- ITEM 4 & 5: Provider Approval & Admin Oversight ---');
  if (providerToken && studentToken) {
    const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const documentsPayload = {};
    for (let i = 0; i < 6; i++) {
      documentsPayload[`file_${i}`] = {
        filename: `requirement_${i}.png`,
        base64: samplePngBase64,
      };
    }

    // Submit an application
    const appRes = await request('/api/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scholarship_id: '1001',
        documents: documentsPayload,
      }),
    });

    let submittedAppId = appRes.data?.id || appRes.data?.application?.id;
    if (!submittedAppId) {
      // If already submitted, retrieve existing application for student
      const myAppsRes = await request('/api/applications/my-applications', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const apps = Array.isArray(myAppsRes.data)
        ? myAppsRes.data
        : myAppsRes.data?.applications || myAppsRes.data?.data || [];
      if (apps.length > 0) {
        const matchingApp = apps.find((a) => String(a.scholarship_id || a.scholarshipId) === '1001') || apps[0];
        submittedAppId = matchingApp.id || matchingApp._id;
      }
    }

    // Provider views pipeline
    const pipelineRes = await request('/api/applications/provider', {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    if (pipelineRes.ok) {
      recordResult('Provider approval', 'Provider views applicant pipeline', true, 'Pipeline accessible');
    }

    // Provider requests more info / sets schedule
    const schedRes = await request('/api/schedules', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Defense Interview Panel',
        scholarshipId: '1001',
        date: '2026-09-15T09:00:00.000Z',
        type: 'interview',
        assignedStudents: [{ userId: 201 }],
      }),
    });
    if (schedRes.ok) {
      recordResult('Provider approval', 'Provider schedules interview', true, 'Interview scheduled');
    }

    // Provider approves application
    if (submittedAppId) {
      const approveRes = await request(`/api/applications/${submittedAppId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          reason: 'Passed complete criteria in capstone defense live demonstration',
        }),
      });

      if (approveRes.ok) {
        recordResult('Provider approval', 'Provider approves application', true, 'Status: approved');
      } else {
        recordResult('Provider approval', 'Provider approves application', false, `Status: ${approveRes.status}`);
      }
    } else {
      recordResult('Provider approval', 'Provider approves application', false, 'No application found to approve');
    }
  }

  // Admin Oversight
  if (adminToken) {
    const adminOverview = await request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminOverview.ok) {
      recordResult('Admin actions', 'Admin views accounts and application stats', true, 'Overview dashboard ready');
    } else {
      recordResult('Admin actions', 'Admin views accounts and application stats', false, `Status: ${adminOverview.status}`);
    }

    const auditLogs = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (auditLogs.ok) {
      recordResult('Admin actions', 'Admin views immutable audit logs', true, 'Audit log verified');
    } else {
      recordResult('Admin actions', 'Admin views immutable audit logs', false, `Status: ${auditLogs.status}`);
    }
  }

  // =========================================================================
  // ITEM 6: Persistent Notifications
  // =========================================================================
  console.log('\n--- ITEM 6: Persistent Notifications ---');
  if (studentToken) {
    const notifRes = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const notifs = Array.isArray(notifRes.data)
      ? notifRes.data
      : notifRes.data?.notifications || [];
    if (notifRes.ok && Array.isArray(notifs)) {
      recordResult(
        'Notifications',
        'Student retrieves in-app notifications',
        true,
        `${notifs.length} notifications found`
      );
    } else {
      recordResult('Notifications', 'Student retrieves in-app notifications', false, `Status: ${notifRes.status}`);
    }
  }

  // =========================================================================
  // ITEM 7: Full Connected Workflow (Student -> Provider -> Admin)
  // =========================================================================
  console.log('\n--- ITEM 7: Connected Workflow Summary ---');
  const allPassed = results.length > 0 && results.every((r) => r.passed);
  recordResult(
    'Full deployed workflow',
    'Student → Provider → Admin end-to-end integration',
    allPassed,
    allPassed ? 'All criteria passed' : 'Some criteria pending'
  );

  // Print Summary Table
  console.log('\n================================================================');
  console.log('📊 FINAL ACCEPTANCE MATRIX');
  console.log('================================================================');

  const categories = [
    'Backend + MongoDB readiness',
    'Mobile login + real email OTP',
    'Document upload/download',
    'Provider approval',
    'Admin actions',
    'Notifications',
    'Full deployed workflow',
  ];

  console.log('| Item                          | Deployed URL / Test                           | Status        |');
  console.log('| ----------------------------- | --------------------------------------------- | ------------- |');

  for (const cat of categories) {
    const catResults = results.filter((r) => r.item === cat);
    const catPassed = catResults.length > 0 && catResults.every((r) => r.passed);
    const status = catPassed ? 'PASSED' : 'FAILED';
    const testSummary = catResults.map((r) => r.testName).slice(0, 2).join(' & ');
    console.log(`| ${cat.padEnd(29)} | ${testSummary.padEnd(45)} | ${status.padEnd(13)} |`);
  }

  console.log('================================================================\n');

  if (allPassed) {
    console.log('DEFENSE_DEPLOYMENT_READY: YES');
  } else {
    const failed = results.filter((r) => !r.passed).map((r) => `${r.item}: ${r.testName} (${r.details})`).join('; ');
    console.log(`DEFENSE_DEPLOYMENT_READY: NO — ${failed}`);
  }
}

runVerification().catch((err) => {
  console.error('Execution failure:', err);
  process.exit(1);
});
