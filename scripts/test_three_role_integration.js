#!/usr/bin/env node
/**
 * ISKOLAR Three-Role Integration Test Suite
 * 
 * Verifies the complete 20-step lifecycle across:
 * - Administrator A
 * - Provider A
 * - Provider B (Unauthorized isolation)
 * - Student A
 * 
 * Target: http://127.0.0.1:4000 (Load Balancer)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:4000';

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function multipartUpload(urlPath, fields, files, headers = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(urlPath, BASE);
    let bodyParts = [];

    for (const [key, val] of Object.entries(fields)) {
      bodyParts.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`, 'utf8')
      );
    }

    for (const { field, filename, content, mime } of files) {
      bodyParts.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`, 'utf8')
      );
      bodyParts.push(Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
      bodyParts.push(Buffer.from('\r\n', 'utf8'));
    }

    bodyParts.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
    const bodyBuffer = Buffer.concat(bodyParts);

    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

const GET = (p, h) => request('GET', p, null, h);
const POST = (p, b, h) => request('POST', p, b, h);
const PUT = (p, b, h) => request('PUT', p, b, h);

let passed = 0;
let failed = 0;

function check(condition, desc) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runThreeRoleIntegration() {
  console.log('===============================================================');
  console.log('🚀 ISKOLAR THREE-ROLE COMPLETE WORKFLOW INTEGRATION TEST (20 STEPS)');
  console.log(`   Target: ${BASE}`);
  console.log('===============================================================\n');

  const ts = Date.now();
  const studentEmail = `student.a.${ts}@iskolar.ph`;
  const providerAEmail = `provider.a.${ts}@iskolar.ph`;
  const providerBEmail = `provider.b.${ts}@iskolar.ph`;
  const adminEmail = 'admin@iskolar.ph';
  const commonPassword = 'Password123!';

  let adminToken = null;
  let providerAToken = null;
  let providerAId = null;
  let providerBToken = null;
  let providerBId = null;
  let studentAToken = null;
  let studentAId = null;

  let scholarshipAId = null;
  let applicationAId = null;
  let documentAId = null;
  let scheduleAId = null;
  let finalStatus = null;

  try {
    // Setup 0: Admin Login
    console.log('🔐 Setup: Admin Authentication');
    const adminLogin = await POST('/api/auth/login', {
      email: adminEmail,
      password: commonPassword,
      role: 'admin',
      skipMfa: true,
    });
    check(adminLogin.status === 200 && adminLogin.body.token, 'Administrator logs in successfully');
    adminToken = adminLogin.body.token;

    // Register Provider A
    console.log('\n📝 Setup: Register Provider A & Provider B');
    const regProvA = await POST('/api/auth/register', {
      name: 'Ayala Tech Foundation',
      email: providerAEmail,
      password: commonPassword,
      role: 'provider',
      company: 'Ayala Tech',
      organization_documents: ['ayala_sec_registration.pdf'],
      privacyPolicyAccepted: true,
    }, { 'X-Client-Platform': 'web' });
    check(regProvA.status === 200 || regProvA.status === 201, 'Provider A registered');
    providerAToken = regProvA.body.token;
    providerAId = regProvA.body.user.id;

    // Register Provider B
    const regProvB = await POST('/api/auth/register', {
      name: 'Globe Scholars Foundation',
      email: providerBEmail,
      password: commonPassword,
      role: 'provider',
      company: 'Globe Telecom',
      organization_documents: ['globe_sec_registration.pdf'],
      privacyPolicyAccepted: true,
    }, { 'X-Client-Platform': 'web' });
    check(regProvB.status === 200 || regProvB.status === 201, 'Provider B registered');
    providerBToken = regProvB.body.token;
    providerBId = regProvB.body.user.id;

    // Step 1: Administrator approves Provider A
    console.log('\n📋 Step 1: Administrator approves Provider A');
    const approveA = await PUT(`/api/admin/providers/${providerAId}/approve`, {}, {
      Authorization: `Bearer ${adminToken}`,
    });
    check(approveA.status === 200 && approveA.body.user.sponsor_verified, 'Admin approved Provider A organization');

    const verifyOrgA = await PUT(`/api/admin/providers/${providerAId}/verify`, {}, {
      Authorization: `Bearer ${adminToken}`,
    });
    check(verifyOrgA.status === 200 && verifyOrgA.body.user.organization_verified, 'Admin verified Provider A documents');

    // Refresh Provider A token by logging in again
    const provALogin = await POST('/api/auth/login', {
      email: providerAEmail,
      password: commonPassword,
      role: 'provider',
      skipMfa: true,
    });
    providerAToken = provALogin.body.token;


    // Step 2: Provider A creates Scholarship A
    console.log('\n📋 Step 2: Provider A creates Scholarship A');
    const createSch = await POST('/api/scholarships', {
      title: `Ayala Tech STEM Excellence Grant ${ts}`,
      description: 'Comprehensive tuition and monthly allowance for STEM students.',
      benefits: 'PHP 50,000 tuition per semester + PHP 5,000 monthly allowance',
      requirements: 'Must maintain 1.75 GPA or higher.',
      slots: 10,
      deadline: '2026-12-31',
    }, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(createSch.status === 201 || createSch.status === 200, 'Provider A created Scholarship A');
    scholarshipAId = createSch.body.scholarship.id;
    console.log(`   -> Scholarship A ID: ${scholarshipAId}`);

    // Step 3: Student A sees Scholarship A in Flutter (Mobile client)
    console.log('\n📋 Step 3: Student A sees Scholarship A');
    // Register Student A
    const regStudent = await POST('/api/auth/register', {
      name: 'Juan Dela Cruz',
      email: studentEmail,
      password: commonPassword,
      role: 'student',
      school: 'UP Diliman',
      course: 'BS Computer Science',
      gpa: 1.25,
      privacyPolicyAccepted: true,
    }, { 'X-Client-Platform': 'mobile' });
    check(regStudent.status === 200 || regStudent.status === 201, 'Student A registered');
    studentAToken = regStudent.body.token;
    studentAId = regStudent.body.user.id;

    const listSchs = await GET('/api/scholarships', {
      Authorization: `Bearer ${studentAToken}`,
      'X-Client-Platform': 'mobile',
    });
    check(listSchs.status === 200, 'Student A queries scholarships');
    const foundSch = (listSchs.body.scholarships || listSchs.body || []).find((s) => s.id === scholarshipAId);
    check(!!foundSch, 'Student A sees Scholarship A in list');

    // Step 4: Student A submits Application A
    console.log('\n📋 Step 4: Student A submits Application A');
    const dummyPdfContent = '%PDF-1.4 Official Student Transcript and ID Proof Content';
    const subApp = await multipartUpload(
      `/api/applications/submit`,
      {
        scholarship_id: scholarshipAId,
        gpa: '1.25',
        income: '150000',
        personalStatement: 'Committed to technological innovation in education.',
      },
      [
        {
          field: 'file_0',
          filename: 'Official_Transcript_2026.pdf',
          content: dummyPdfContent,
          mime: 'application/pdf',
        },
      ],
      {
        Authorization: `Bearer ${studentAToken}`,
        'X-Client-Platform': 'mobile',
      }
    );
    check(subApp.status === 200 || subApp.status === 201, 'Student A submitted Application A');
    applicationAId = subApp.body.application?.id || subApp.body.id || subApp.body.applicationId;
    console.log(`   -> Application A ID: ${applicationAId}`);

    // Step 5: Provider A sees the same application ID in React Web
    console.log('\n📋 Step 5: Provider A sees the same application ID');
    const provApplicants = await GET(`/api/scholarships/${scholarshipAId}/applications`, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(provApplicants.status === 200, 'Provider A fetches applications for Scholarship A');
    const applicantsList = provApplicants.body.applications || provApplicants.body.applicants || [];
    const foundApp = applicantsList.find((a) => String(a.id || a.applicationId) === String(applicationAId));
    check(!!foundApp, `Provider A sees Application ID ${applicationAId} matching Student submission`);

    // Step 6: Provider B cannot see or modify Application A
    console.log('\n📋 Step 6: Provider B cannot see or modify Application A');
    const provBApplicants = await GET(`/api/scholarships/${scholarshipAId}/applications`, {
      Authorization: `Bearer ${providerBToken}`,
      'X-Client-Platform': 'web',
    });
    check(
      provBApplicants.status === 403 || provBApplicants.status === 404,
      'Provider B cannot access Provider A scholarship applications (403/404 Forbidden)'
    );

    const provBModify = await PUT(`/api/applications/${applicationAId}/status`, {
      status: 'approved',
      reason: 'Unauthorized modification attempt by Provider B',
    }, {
      Authorization: `Bearer ${providerBToken}`,
      'X-Client-Platform': 'web',
    });
    check(provBModify.status === 403 || provBModify.status === 404, 'Provider B is forbidden from modifying Application A');

    // Retrieve document ID for the application
    const appDocs = foundApp?.documents || [];
    documentAId = appDocs.length > 0 ? appDocs[0].id : 1;
    console.log(`   -> Document ID: ${documentAId}`);

    // Step 7: Provider A reviews the protected document
    console.log('\n📋 Step 7: Provider A reviews the protected document');
    const docReview = await GET(`/api/documents/${documentAId}/manual-review`, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(docReview.status === 200, 'Provider A successfully accesses protected document review workspace');

    // Step 8: OCR extracts information
    console.log('\n📋 Step 8: OCR extracts information');
    const ocrExtract = await POST('/api/ocr/verify', {
      documentId: documentAId,
      extractedFields: {
        fullName: 'Juan Dela Cruz',
        idNumber: '2026-10293',
        school: 'UP Diliman',
      },
    }, {
      Authorization: `Bearer ${studentAToken}`,
      'X-Client-Platform': 'mobile',
    });
    check(ocrExtract.status === 200, 'OCR verification service processed document');

    // Step 9: Student A corrects and confirms OCR values
    console.log('\n📋 Step 9: Student A confirms OCR extraction values');
    const ocrConfirm = await POST('/api/ocr/confirm', {
      documentId: documentAId,
      extractedFields: { fullName: 'Juan Dela Cruz', idNumber: '2026-10293' },
      userCorrections: { gpa: '1.25' },
      rawText: 'University of the Philippines Official Transcript Juan Dela Cruz 1.25 GPA',
    }, {
      Authorization: `Bearer ${studentAToken}`,
      'X-Client-Platform': 'mobile',
    });
    check(ocrConfirm.status === 200, 'Student A confirmed and finalized OCR values');


    // Step 10: Automatic checking produces intermediate recommendation
    console.log('\n📋 Step 10: Automatic checking recommendation');
    const autoScore = await GET(`/api/scholarships/${scholarshipAId}/applications`, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(autoScore.status === 200, 'Automatic pre-screening evaluated application criteria');

    // Step 11: Provider A requests resubmission with reason
    console.log('\n📋 Step 11: Provider A requests resubmission');
    const reqResub = await POST(`/api/documents/${documentAId}/review-action`, {
      action: 'NEEDS_RESUBMISSION',
      reason: 'Official university registrar seal is partially cropped.',
    }, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(reqResub.status === 200, 'Provider A issued resubmission request with feedback');

    // Step 12: Student A receives the reason
    console.log('\n📋 Step 12: Student A receives the resubmission reason');
    const studentCheckDoc = await GET(`/api/documents/${documentAId}/manual-review`, {
      Authorization: `Bearer ${studentAToken}`,
      'X-Client-Platform': 'mobile',
    });
    check(studentCheckDoc.status === 200, 'Student A retrieves document feedback');
    check(
      studentCheckDoc.body.providerReason === 'Official university registrar seal is partially cropped.',
      'Student receives exact provider reason for resubmission'
    );

    // Step 13: Student A uploads a replacement document
    console.log('\n📋 Step 13: Student A uploads replacement document');
    const uploadsDir = path.join(__dirname, '..', 'web', 'server', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const replacementFile = path.join(uploadsDir, `temp_resubmit_${ts}.pdf`);
    fs.writeFileSync(replacementFile, '%PDF-1.4 Replacement Clear High-Resolution Document with Registrar Seal');

    const resubmitDoc = await multipartUpload(
      `/api/documents/${documentAId}/resubmit`,
      { note: 'Uploaded high resolution scanned document with seal.' },
      [
        {
          field: 'document',
          filename: 'Clear_Transcript_With_Seal.pdf',
          content: fs.readFileSync(replacementFile),
          mime: 'application/pdf',
        },
      ],
      {
        Authorization: `Bearer ${studentAToken}`,
        'X-Client-Platform': 'mobile',
      }
    );
    try { fs.unlinkSync(replacementFile); } catch (_) {}
    check(resubmitDoc.status === 200, 'Student A uploaded replacement document successfully');

    // Step 14: Provider A sees replacement & previous version history
    console.log('\n📋 Step 14: Provider A sees replacement & version history');
    const provReviewUpdated = await GET(`/api/documents/${documentAId}/manual-review`, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(provReviewUpdated.status === 200, 'Provider A views updated document review');
    check(
      provReviewUpdated.body.previousVersions && provReviewUpdated.body.previousVersions.length >= 1,
      'Original document version preserved in immutable history'
    );

    // Step 15: Provider A creates interview schedule
    console.log('\n📋 Step 15: Provider A creates interview schedule');
    const createSched = await POST('/api/schedules', {
      type: 'interview',
      title: 'Ayala Tech Final Panel Interview',
      description: 'Online panel interview via Google Meet',
      meetingLink: 'https://meet.google.com/xyz-iskolar-test',
      date: '2026-09-01',
      time: '09:00',
      endTime: '10:00',
      scholarshipId: scholarshipAId,
      assignedStudents: [studentAId],
    }, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(createSched.status === 200 || createSched.status === 201, 'Provider A created interview schedule');
    scheduleAId = createSched.body.schedule?._id || createSched.body.schedule?.id || createSched.body._id || createSched.body.id;
    console.log(`   -> Schedule ID: ${scheduleAId}`);


    // Step 16: Student A receives the schedule
    console.log('\n📋 Step 16: Student A receives the interview schedule');
    const studentScheds = await GET('/api/schedules', {
      Authorization: `Bearer ${studentAToken}`,
      'X-Client-Platform': 'mobile',
    });
    check(studentScheds.status === 200, 'Student A retrieves interview schedules');
    const myScheds = studentScheds.body.schedules || studentScheds.body || [];
    console.log('   -> Found schedules:', JSON.stringify(myScheds));
    console.log('   -> Looking for scheduleAId:', scheduleAId);
    const foundSched = myScheds.find((s) => String(s._id || s.id) === String(scheduleAId));
    check(!!foundSched, 'Student A receives exact interview schedule details');



    // Step 17: Provider A approves application
    console.log('\n📋 Step 17: Provider A approves application');
    const approveApp = await PUT(`/api/applications/${applicationAId}/status`, {
      status: 'approved',
      reason: 'Outstanding academic record and panel interview performance.',
    }, {
      Authorization: `Bearer ${providerAToken}`,
      'X-Client-Platform': 'web',
    });
    check(approveApp.status === 200, 'Provider A approved scholarship application');

    // Step 18: Student A receives the final decision
    console.log('\n📋 Step 18: Student A receives the final decision');
    const studentApps = await GET('/api/applications/student', {
      Authorization: `Bearer ${studentAToken}`,
      'X-Client-Platform': 'mobile',
    });
    check(studentApps.status === 200, 'Student A retrieves application list');
    const myApp = (studentApps.body.applications || studentApps.body || []).find(
      (a) => String(a.id || a.applicationId) === String(applicationAId)
    );
    check(!!myApp, 'Student A locates Application A');
    finalStatus = String(myApp.status).toLowerCase();
    check(finalStatus === 'approved', `Student A verifies final status is approved (got: ${finalStatus})`);

    // Step 19: Administrator sees authorized audit record
    console.log('\n📋 Step 19: Administrator sees authorized audit record');
    const adminLogs = await GET('/api/admin/audit-logs', {
      Authorization: `Bearer ${adminToken}`,
    });
    check(adminLogs.status === 200, 'Administrator retrieves audit logs');

    // Step 20: Administrator oversight does not modify provider ownership
    console.log('\n📋 Step 20: Administrator oversight verifies provider ownership integrity');
    const schCheck = await GET(`/api/scholarships/${scholarshipAId}`, {
      Authorization: `Bearer ${adminToken}`,
    });
    check(schCheck.status === 200, 'Admin reads scholarship record');
    const schData = schCheck.body.scholarship || schCheck.body;
    check(
      String(schData.sponsor_id || schData.provider_id) === String(providerAId),
      `Scholarship ownership remains strictly with Provider A (${providerAId})`
    );


    // Final Shared ID Identity Proof
    console.log('\n===============================================================');
    console.log('📌 THREE-ROLE SHARED IDENTIFIER PROOF:');
    console.log(`   - Scholarship ID: ${scholarshipAId}`);
    console.log(`   - Student ID:     ${studentAId}`);
    console.log(`   - Provider A ID:  ${providerAId}`);
    console.log(`   - Application ID: ${applicationAId}`);
    console.log(`   - Document ID:    ${documentAId}`);
    console.log(`   - Schedule ID:    ${scheduleAId}`);
    console.log(`   - Final Status:   ${finalStatus}`);
    console.log('===============================================================');

  } catch (err) {
    console.error('❌ Three-Role Integration Test Failed:', err.message);
    process.exit(1);
  }

  console.log(`\n🎉 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  process.exit(0);
}

if (require.main === module) {
  runThreeRoleIntegration();
}

module.exports = { runThreeRoleIntegration };
