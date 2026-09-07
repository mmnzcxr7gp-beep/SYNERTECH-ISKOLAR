#!/usr/bin/env node
/**
 * ISKOLAR End-to-End Integration Test
 * Tests the live backend API at http://localhost:4000
 * Exercises: registration, MFA login, profile, scholarships,
 * applications, documents, schedules, notifications, privacy, security.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:4000';

/* ================= HTTP HELPERS ================= */
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
    const boundary = '----FormBoundary' + Date.now();
    const url = new URL(urlPath, BASE);
    let bodyParts = [];

    for (const [key, val] of Object.entries(fields)) {
      bodyParts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
      );
    }

    for (const { field, filename, content, mime } of files) {
      bodyParts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
      );
      bodyParts.push(content);
      bodyParts.push('\r\n');
    }

    bodyParts.push(`--${boundary}--\r\n`);

    const bodyBuffer = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));

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
        resolve({ status: res.statusCode, body: parsed });
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
const DELETE = (p, b, h) => request('DELETE', p, b, h);
const PATCH = (p, b, h) => request('PATCH', p, b, h);

/* ================= RESULTS TRACKING ================= */
const results = { passed: 0, failed: 0, errors: [] };

function assert(condition, label, detail) {
  if (condition) {
    results.passed++;
    console.log(`  ✓ ${label}`);
  } else {
    results.failed++;
    const msg = `  ✗ ${label}${detail ? ': ' + detail : ''}`;
    console.log(msg);
    results.errors.push(msg);
  }
}

const { getSyntheticPasswordForEmail } = require('../src/config/syntheticCredentials');

const TS = Date.now();
const TEST_STUDENT_EMAIL = `e2e.student.${TS}@test.iskolar.ph`;
const TEST_STUDENT_NAME = 'E2E Test Student';
const TEST_STUDENT_PASS = 'TestPass123!Secure#2026';

const TEST_PROVIDER_EMAIL = `e2e.provider.${TS}@test.iskolar.ph`;
const TEST_PROVIDER_NAME = 'E2E Test Provider Corp';
const TEST_PROVIDER_PASS = 'ProvPass123!Secure#2026';

const SEEDED_STUDENT_EMAIL = 'juan.delacruz@iskolar.ph';
const SEEDED_STUDENT_PASS = getSyntheticPasswordForEmail(SEEDED_STUDENT_EMAIL) || 'TestPass123!Secure#2026';
const SEEDED_PROVIDER_EMAIL = 'megaworld.foundation@iskolar.ph';
const SEEDED_PROVIDER_PASS = getSyntheticPasswordForEmail(SEEDED_PROVIDER_EMAIL) || 'ProvPass123!Secure#2026';
const SEEDED_ADMIN_EMAIL = 'admin@iskolar.ph';
const SEEDED_ADMIN_PASS = getSyntheticPasswordForEmail(SEEDED_ADMIN_EMAIL) || 'AdminPass123!Secure#2026';

/* ================= MAIN TEST ================= */
(async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ISKOLAR END-TO-END INTEGRATION TEST');
  console.log('  Target: ' + BASE);
  console.log('  Timestamp: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════\n');

  // ─────────────── STEP 1: Health Check ───────────────
  console.log('── STEP 1: Health Check ──');
  const health = await GET('/health');
  assert(health.status === 200, 'Backend responds 200', `got ${health.status}`);
  assert(health.body.status === 'ok', 'Health status ok');

  const apiHealth = await GET('/api/health');
  assert(apiHealth.status === 200, '/api/health responds 200');

  // ─────────────── STEP 2: Auth API Discovery ───────────────
  console.log('\n── STEP 2: Auth API Discovery ──');
  const authInfo = await GET('/api/auth');
  assert(authInfo.status === 200, 'Auth API info accessible');
  assert(authInfo.body.endpoints, 'Auth endpoints listed');

  // ─────────────── STEP 3: Registration ───────────────
  console.log('\n── STEP 3: Student Registration ──');

  // 3a: Missing fields rejected
  const badReg = await POST('/api/auth/register', { name: '', email: 'bad', password: '123' });
  assert(badReg.status === 400, 'Invalid registration rejected (400)', `got ${badReg.status}`);

  // 3b: Successful registration
  const regRes = await POST('/api/auth/register', {
    name: TEST_STUDENT_NAME,
    email: TEST_STUDENT_EMAIL,
    password: TEST_STUDENT_PASS,
    role: 'student',
    school: 'UP Diliman',
    course: 'BS Computer Science',
    gpa: 1.25,
    privacyPolicyAccepted: true,
  }, { 'X-Client-Platform': 'mobile' });
  assert(regRes.status === 200 || regRes.status === 201, 'Student registration succeeds', `got ${regRes.status}: ${JSON.stringify(regRes.body).slice(0, 200)}`);
  const studentToken = regRes.body?.token;
  const studentId = regRes.body?.user?.id;
  assert(!!studentToken, 'Registration returns JWT token');
  assert(!!studentId, 'Registration returns user ID');

  // 3c: Duplicate rejected
  const dupReg = await POST('/api/auth/register', {
    name: TEST_STUDENT_NAME,
    email: TEST_STUDENT_EMAIL,
    password: TEST_STUDENT_PASS,
    role: 'student',
    school: 'UP Diliman',
    course: 'BS Computer Science',
    gpa: 1.25,
    privacyPolicyAccepted: true,
  }, { 'X-Client-Platform': 'mobile' });
  assert(dupReg.status === 409, 'Duplicate registration rejected (409)', `got ${dupReg.status}`);

  // 3d: Admin role rejected
  const adminReg = await POST('/api/auth/register', {
    name: 'Hacker',
    email: `hacker.${TS}@test.ph`,
    password: 'HackPass123!',
    role: 'admin',
    privacyPolicyAccepted: true,
  }, { 'X-Client-Platform': 'web' });
  assert(adminReg.status === 403 || adminReg.status === 400, 'Admin role registration forbidden', `got ${adminReg.status}`);

  // 3e: Privacy policy required
  const noPPReg = await POST('/api/auth/register', {
    name: 'NoPrivacy',
    email: `noprivacy.${TS}@test.ph`,
    password: 'TestPass123!',
    role: 'student',
    school: 'UP Diliman',
    course: 'BS Computer Science',
    gpa: 1.25,
    privacyPolicyAccepted: false,
  }, { 'X-Client-Platform': 'mobile' });
  assert(noPPReg.status === 400, 'Registration without privacy policy rejected', `got ${noPPReg.status}`);

  // ─────────────── STEP 4: Provider Registration ───────────────
  console.log('\n── STEP 4: Provider Registration ──');
  const provReg = await POST('/api/auth/register', {
    name: TEST_PROVIDER_NAME,
    email: TEST_PROVIDER_EMAIL,
    password: TEST_PROVIDER_PASS,
    role: 'provider',
    company: 'E2E Test Corp',
    organization_documents: ['e2e_sec.pdf'],
    privacyPolicyAccepted: true,
  }, { 'X-Client-Platform': 'web' });
  assert(provReg.status === 200 || provReg.status === 201, 'Provider registration succeeds', `got ${provReg.status}`);
  const newProviderToken = provReg.body?.token;
  assert(!!newProviderToken, 'Provider gets JWT token');


  // Verify new provider is unverified
  const provProfile = await GET('/api/auth/me', { Authorization: `Bearer ${newProviderToken}` });
  assert(provProfile.status === 200, 'Provider profile accessible');
  assert(
    provProfile.body?.user?.sponsor_verified === false || provProfile.body?.user?.organization_verified === false,
    'New provider starts unverified'
  );

  // ─────────────── STEP 5: Login with MFA ───────────────
  console.log('\n── STEP 5: Login with MFA Flow ──');

  // 5a: Wrong password rejected
  const wrongPass = await POST('/api/auth/login', { email: SEEDED_STUDENT_EMAIL, password: 'WrongPass999!' });
  assert(wrongPass.status === 401, 'Wrong password rejected (401)', `got ${wrongPass.status}`);

  // 5b: Login with correct password triggers MFA (OTP sent)
  const loginRes = await POST('/api/auth/login', { email: SEEDED_STUDENT_EMAIL, password: SEEDED_STUDENT_PASS });
  assert(loginRes.status === 200, 'Correct credentials accepted');
  
  if (loginRes.body.requiresMfa) {
    assert(true, 'MFA challenge triggered');
    assert(!!loginRes.body.mfaToken, 'MFA token returned');

    // 5c: Wrong OTP fails
    const wrongOtp = await POST('/api/auth/verify-login-otp', {
      mfaToken: loginRes.body.mfaToken,
      otp: '111111',
    });
    assert(wrongOtp.status === 400, 'Wrong OTP rejected', `got ${wrongOtp.status}`);

    // 5d: Note — we cannot verify correct OTP without reading the OTP from server logs
    // This proves the MFA flow is wired correctly
    console.log('  ℹ MFA OTP verification requires email access — flow structure verified');
  } else {
    // Direct login (skipMfa or SMTP not configured)
    assert(!!loginRes.body.token, 'Direct login returns token');
  }

  // 5e: Login with skipMfa for testing
  const directLogin = await POST('/api/auth/login', {
    email: SEEDED_STUDENT_EMAIL,
    password: SEEDED_STUDENT_PASS,
    skipMfa: true,
  });
  assert(directLogin.status === 200, 'Login with skipMfa succeeds');
  const seededStudentToken = directLogin.body?.token;
  assert(!!seededStudentToken, 'Seeded student JWT obtained');

  // ─────────────── STEP 6: Profile Operations ───────────────
  console.log('\n── STEP 6: Profile Operations ──');
  const myProfile = await GET('/api/auth/me', { Authorization: `Bearer ${seededStudentToken}` });
  assert(myProfile.status === 200, 'GET /api/auth/me succeeds');
  assert(myProfile.body?.user?.email === SEEDED_STUDENT_EMAIL, 'Profile email matches');
  assert(myProfile.body?.user?.role === 'student', 'Profile role is student');

  // 6b: Update profile
  const profileUpdate = await PUT('/api/auth/me', {
    name: 'Juan Delacruz Updated',
    phone: '09171234567',
  }, { Authorization: `Bearer ${seededStudentToken}` });
  assert(profileUpdate.status === 200, 'Profile update succeeds', `got ${profileUpdate.status}: ${JSON.stringify(profileUpdate.body).slice(0, 200)}`);

  // 6c: Profile photo upload
  const testImageBuffer = Buffer.alloc(100, 0xFF); // minimal JPEG-like bytes
  // Create a minimal valid JPEG header
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const jpegBody = Buffer.alloc(200, 0x00);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);
  const fakeJpeg = Buffer.concat([jpegHeader, jpegBody, jpegEnd]);

  const photoUpload = await multipartUpload('/api/auth/me/photo', {}, [{
    field: 'photo',
    filename: 'test_profile.jpg',
    content: fakeJpeg,
    mime: 'image/jpeg',
  }], { Authorization: `Bearer ${seededStudentToken}` });
  assert(photoUpload.status === 200 || photoUpload.status === 201, 'Profile photo upload succeeds', `got ${photoUpload.status}: ${JSON.stringify(photoUpload.body).slice(0, 200)}`);

  // 6d: Verify photo persists
  const afterPhotoProfile = await GET('/api/auth/me', { Authorization: `Bearer ${seededStudentToken}` });
  const hasProfilePic = !!afterPhotoProfile.body?.user?.profilePicture || !!afterPhotoProfile.body?.user?.profile_picture;
  assert(hasProfilePic, 'Profile picture persists after upload', `profilePicture: ${afterPhotoProfile.body?.user?.profilePicture}`);

  // 6e: Unauthenticated access denied
  const noAuthProfile = await GET('/api/auth/me');
  assert(noAuthProfile.status === 401 || noAuthProfile.status === 403, 'Profile denied without auth', `got ${noAuthProfile.status}`);

  // ─────────────── STEP 7: Seeded Provider & Admin Login ───────────────
  console.log('\n── STEP 7: Provider & Admin Login ──');
  const provLogin = await POST('/api/auth/login', {
    email: SEEDED_PROVIDER_EMAIL,
    password: SEEDED_PROVIDER_PASS,
    skipMfa: true,
  });
  assert(provLogin.status === 200, 'Provider login succeeds');
  const providerToken = provLogin.body?.token;

  const adminLogin = await POST('/api/auth/login', {
    email: SEEDED_ADMIN_EMAIL,
    password: SEEDED_ADMIN_PASS,
    skipMfa: true,
  });
  assert(adminLogin.status === 200, 'Admin login succeeds');
  const adminToken = adminLogin.body?.token;

  // ─────────────── STEP 8: Scholarships ───────────────
  console.log('\n── STEP 8: Scholarship Management ──');

  // 8a: List scholarships (public)
  const schList = await GET('/api/scholarships');
  assert(schList.status === 200, 'List scholarships succeeds');
  const scholarshipsArr = schList.body?.scholarships || schList.body;
  assert(Array.isArray(scholarshipsArr), 'Scholarships returned as array', typeof scholarshipsArr);
  const numScholarships = scholarshipsArr?.length || 0;
  assert(numScholarships >= 1, `At least 1 scholarship seeded (found ${numScholarships})`);

  // 8b: Create scholarship as provider
  const newSch = await POST('/api/scholarships', {
    title: `E2E Test Scholarship ${TS}`,
    name: `E2E Test Scholarship ${TS}`,
    description: 'Integration test scholarship',
    eligibilityRequirements: 'GPA >= 1.75, BS Computer Science',
    benefits: 'Full tuition + 5000 monthly stipend',
    type: 'Scholarship + Allowance',
    status: 'open',
    slots: 10,
    totalSlots: 10,
    requirements: [],
    applicationDeadline: '2027-12-31T23:59:59.000Z',
    deadline: '2027-12-31',
    allowance: 5000,
    maxAmount: 80000,
  }, { Authorization: `Bearer ${providerToken}` });
  assert(newSch.status === 200 || newSch.status === 201, 'Provider creates scholarship', `got ${newSch.status}: ${JSON.stringify(newSch.body).slice(0, 200)}`);

  let testScholarshipId = newSch.body?.scholarship?.id || newSch.body?.id;

  // 8c: Get scholarship by ID
  if (testScholarshipId) {
    const schById = await GET(`/api/scholarships/${testScholarshipId}`);
    assert(schById.status === 200, 'Get scholarship by ID succeeds');
    const schData = schById.body?.scholarship || schById.body;
    assert(schData?.title?.includes('E2E Test'), 'Scholarship title matches', `title: ${schData?.title}`);
  }

  // 8d: Unauthorized creation fails
  const unauthorizedSch = await POST('/api/scholarships', {
    title: 'Hacker Scholarship',
    description: 'Should fail',
  }, { Authorization: `Bearer ${seededStudentToken}` });
  assert(unauthorizedSch.status === 403, 'Student cannot create scholarship', `got ${unauthorizedSch.status}`);

  // ─────────────── STEP 9: Applications ───────────────
  console.log('\n── STEP 9: Application Submission ──');

  // 9a: List existing applications
  const appList = await GET('/api/applications', { Authorization: `Bearer ${seededStudentToken}`, 'X-Client-Platform': 'mobile' });
  assert(appList.status === 200, 'List applications succeeds');

  // 9b: Submit application  
  const firstScholarship = scholarshipsArr?.[0];
  const targetSchId = testScholarshipId || firstScholarship?.id;

  if (targetSchId) {
    const appSubmit = await multipartUpload(
      '/api/applications/submit',
      {
        scholarship_id: String(targetSchId),
        scholarshipId: String(targetSchId),
        answers: JSON.stringify({ motivation: 'E2E test application', gpa: '1.25' }),
      },
      [{
        field: 'file_0',
        filename: 'student_id.pdf',
        content: Buffer.from('%PDF-1.4 e2e test document'),
        mime: 'application/pdf',
      }],
      { Authorization: `Bearer ${seededStudentToken}`, 'X-Client-Platform': 'mobile' }
    );
    assert(appSubmit.status === 200 || appSubmit.status === 201, 'Application submission succeeds', `got ${appSubmit.status}: ${JSON.stringify(appSubmit.body).slice(0, 200)}`);

    // 9c: Duplicate submission check
    if (appSubmit.status === 200 || appSubmit.status === 201) {
      const dupApp = await multipartUpload(
        '/api/applications/submit',
        {
          scholarship_id: String(targetSchId),
          scholarshipId: String(targetSchId),
        },
        [{
          field: 'file_0',
          filename: 'student_id.pdf',
          content: Buffer.from('%PDF-1.4 e2e test document'),
          mime: 'application/pdf',
        }],
        { Authorization: `Bearer ${seededStudentToken}`, 'X-Client-Platform': 'mobile' }
      );
      assert(dupApp.status === 409 || dupApp.status === 400, 'Duplicate application rejected', `got ${dupApp.status}`);
    }
  }

  // 9d: Provider can view applications for scholarship
  if (testScholarshipId) {
    const schApps = await GET(`/api/scholarships/${testScholarshipId}/applications`, {
      Authorization: `Bearer ${providerToken}`,
      'X-Client-Platform': 'web',
    });
    assert(schApps.status === 200, 'Provider views scholarship applications', `got ${schApps.status}`);
  }

  // ─────────────── STEP 10: Application Status Update ───────────────
  console.log('\n── STEP 10: Application Status Update ──');
  const provApps = await GET('/api/applications', { Authorization: `Bearer ${providerToken}`, 'X-Client-Platform': 'web' });
  if (provApps.body?.length > 0 || (Array.isArray(provApps.body) && provApps.body.length > 0)) {
    const targetApp = provApps.body.find(a => a.status === 'pending') || provApps.body[0];
    if (targetApp) {
      // Provider updates status
      const statusUpdate = await PUT(`/api/applications/${targetApp.id}/status`, {
        status: 'under_review',
        reason: 'Application being reviewed by provider panel',
      }, { Authorization: `Bearer ${providerToken}`, 'X-Client-Platform': 'web' });
      assert(statusUpdate.status === 200, 'Provider updates application status', `got ${statusUpdate.status}: ${JSON.stringify(statusUpdate.body).slice(0, 200)}`);

      // Student cannot update status
      const studentStatusUpdate = await PUT(`/api/applications/${targetApp.id}/status`, {
        status: 'approved',
      }, { Authorization: `Bearer ${seededStudentToken}`, 'X-Client-Platform': 'mobile' });
      assert(studentStatusUpdate.status === 403, 'Student cannot update application status', `got ${studentStatusUpdate.status}`);
    }
  }

  // ─────────────── STEP 11: Schedules ───────────────
  console.log('\n── STEP 11: Exam & Interview Scheduling ──');

  // 11a: Create schedule as provider
  const schedCreate = await POST('/api/schedules', {
    type: 'exam',
    title: `E2E Exam Schedule ${TS}`,
    date: '2027-03-15',
    time: '09:00',
    timezone: 'Asia/Manila',
    location: 'Room 301, Engineering Building',
    description: 'Integration test exam schedule',
    student_ids: [studentId],
    assignedStudents: [studentId],
    applicantId: studentId,
  }, { Authorization: `Bearer ${providerToken}`, 'X-Client-Platform': 'web' });
  assert(schedCreate.status === 200 || schedCreate.status === 201, 'Provider creates exam schedule', `got ${schedCreate.status}: ${JSON.stringify(schedCreate.body).slice(0, 200)}`);

  let testScheduleId = schedCreate.body?.schedule?.id || schedCreate.body?.id;

  // 11b: List schedules
  const schedList = await GET('/api/schedules', { Authorization: `Bearer ${seededStudentToken}`, 'X-Client-Platform': 'mobile' });
  assert(schedList.status === 200, 'Student can list schedules');

  // 11c: Interview schedule
  const interviewCreate = await POST('/api/schedules', {
    type: 'interview',
    title: `E2E Interview Schedule ${TS}`,
    date: '2027-03-20',
    time: '14:00',
    timezone: 'Asia/Manila',
    location: 'Online - Zoom',
    meetingUrl: 'https://zoom.us/j/123456789',
    description: 'Integration test interview schedule',
    student_ids: [studentId],
    assignedStudents: [studentId],
    applicantId: studentId,
  }, { Authorization: `Bearer ${providerToken}`, 'X-Client-Platform': 'web' });
  assert(interviewCreate.status === 200 || interviewCreate.status === 201, 'Provider creates interview schedule', `got ${interviewCreate.status}`);

  // 11d: Student cannot create schedule
  const studentSched = await POST('/api/schedules', {
    type: 'exam',
    title: 'Hacker schedule',
    date: '2027-01-01',
  }, { Authorization: `Bearer ${seededStudentToken}`, 'X-Client-Platform': 'mobile' });
  assert(studentSched.status === 403, 'Student cannot create schedule', `got ${studentSched.status}`);

  // 11e: Update schedule
  if (testScheduleId) {
    const schedUpdate = await PUT(`/api/schedules/${testScheduleId}`, {
      location: 'Room 401, Updated Building',
      time: '10:00',
    }, { Authorization: `Bearer ${providerToken}`, 'X-Client-Platform': 'web' });
    assert(schedUpdate.status === 200, 'Provider updates schedule', `got ${schedUpdate.status}`);
  }


  // ─────────────── STEP 12: Notifications ───────────────
  console.log('\n── STEP 12: Notifications ──');
  const notifList = await GET('/api/notifications', { Authorization: `Bearer ${seededStudentToken}` });
  assert(notifList.status === 200, 'List notifications succeeds');

  // ─────────────── STEP 13: Privacy Policy ───────────────
  console.log('\n── STEP 13: Privacy Policy ──');
  const ppGet = await GET('/api/privacy-policy');
  assert(ppGet.status === 200, 'Privacy policy accessible', `got ${ppGet.status}`);

  // ─────────────── STEP 14: Document Access Security ───────────────
  console.log('\n── STEP 14: Document Access Security ──');

  // 14a: Unauthenticated access to uploads blocked
  const noAuthDoc = await GET('/uploads/test.pdf');
  assert(noAuthDoc.status === 401, 'Unauthenticated document access blocked', `got ${noAuthDoc.status}`);

  // 14b: Path traversal blocked
  const traversal1 = await GET('/api/documents/../../../etc/passwd/download', {
    Authorization: `Bearer ${seededStudentToken}`,
  });
  assert(traversal1.status >= 400, 'Path traversal blocked', `got ${traversal1.status}`);

  // ─────────────── STEP 15: OCR Routes ───────────────
  console.log('\n── STEP 15: OCR Routes ──');
  const ocrNoAuth = await GET('/api/ocr');
  assert(ocrNoAuth.status === 401 || ocrNoAuth.status === 404, 'OCR route requires auth or returns 404', `got ${ocrNoAuth.status}`);

  // ─────────────── STEP 16: Rate Limiting ───────────────
  console.log('\n── STEP 16: Rate Limiting ──');
  // Test that rate limiting headers exist
  const rateLimitCheck = await GET('/api/health');
  const hasRateLimitHeaders = !!rateLimitCheck.headers['ratelimit-limit'] || !!rateLimitCheck.headers['x-ratelimit-limit'];
  assert(hasRateLimitHeaders, 'Rate limit headers present', JSON.stringify(Object.keys(rateLimitCheck.headers).filter(h => h.includes('ratelimit'))));

  // ─────────────── STEP 17: CORS ───────────────
  console.log('\n── STEP 17: CORS Configuration ──');
  const corsCheck = await request('OPTIONS', '/api/health', null, {
    Origin: 'http://localhost:5173',
    'Access-Control-Request-Method': 'GET',
  });
  assert(
    corsCheck.headers['access-control-allow-origin'] === 'http://localhost:5173' || corsCheck.headers['access-control-allow-origin'] === '*',
    'CORS allows localhost:5173',
    `ACAO: ${corsCheck.headers['access-control-allow-origin']}`
  );

  // ─────────────── STEP 18: Error Handling ───────────────
  console.log('\n── STEP 18: Error Handling ──');
  const notFound = await GET('/api/nonexistent-route');
  assert(notFound.status >= 400, 'Unknown route returns 4xx');

  // Verify no stack traces in error responses (production safety)
  const errBody = JSON.stringify(notFound.body);
  assert(!errBody.includes('at ') || !errBody.includes('.js:'), 'Error response does not expose stack traces');

  // ─────────────── STEP 19: Token Expiry / Invalid Token ───────────────
  console.log('\n── STEP 19: Token Security ──');
  const badToken = await GET('/api/auth/me', { Authorization: 'Bearer invalid.token.here' });
  assert(badToken.status === 401 || badToken.status === 403, 'Invalid token rejected', `got ${badToken.status}`);

  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
  const expToken = await GET('/api/auth/me', { Authorization: `Bearer ${expiredToken}` });
  assert(expToken.status === 401 || expToken.status === 403, 'Expired/invalid token rejected');

  // ─────────────── STEP 20: Users Route ───────────────
  console.log('\n── STEP 20: Users Route ──');
  const usersList = await GET('/api/users', { Authorization: `Bearer ${adminToken}` });
  assert(usersList.status === 200, 'Admin can list users', `got ${usersList.status}`);

  // ─────────────── CLEANUP ───────────────
  console.log('\n── Cleanup ──');
  // Delete test schedule
  if (testScheduleId) {
    const schedDel = await DELETE(`/api/schedules/${testScheduleId}`, null, {
      Authorization: `Bearer ${providerToken}`,
    });
    assert(schedDel.status === 200, 'Test schedule cleaned up', `got ${schedDel.status}`);
  }

  // Delete test scholarship
  if (testScholarshipId) {
    const schDel = await DELETE(`/api/scholarships/${testScholarshipId}`, null, {
      Authorization: `Bearer ${providerToken}`,
    });
    assert(schDel.status === 200, 'Test scholarship cleaned up', `got ${schDel.status}`);
  }

  // Delete profile photo
  const photoDel = await DELETE('/api/auth/me/photo', null, {
    Authorization: `Bearer ${seededStudentToken}`,
  });
  console.log(`  ℹ Profile photo cleanup: ${photoDel.status}`);

  // ─────────────── FINAL REPORT ───────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  TOTAL PASSED: ${results.passed}`);
  console.log(`  TOTAL FAILED: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('\n  FAILURES:');
    results.errors.forEach((e) => console.log(e));
  }
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(results.failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(2);
});
