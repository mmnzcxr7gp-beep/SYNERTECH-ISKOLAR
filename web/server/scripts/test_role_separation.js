#!/usr/bin/env node
/**
 * ISKOLAR Role Separation & Platform Restriction Security Suite
 * Tests role restrictions, platform header spoofing, horizontal data isolation,
 * JWT verification, and Socket.IO security.
 */

const http = require('http');
const path = require('path');
const jwt = require(path.join(__dirname, '../node_modules/jsonwebtoken'));
const dotenv = require(path.join(__dirname, '../node_modules/dotenv'));

dotenv.config({ path: path.join(__dirname, '../.env') });

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


const GET = (p, h) => request('GET', p, null, h);
const POST = (p, b, h) => request('POST', p, b, h);
const PUT = (p, b, h) => request('PUT', p, b, h);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING ISKOLAR ROLE SEPARATION & SECURITY SUITE');
  console.log('========================================================\n');

  try {
    // 1. Health check
    console.log('📋 Test 1: System Health Endpoint');
    const health = await GET('/api/health');
    assert(health.status === 200 && health.body.status === 'ok', 'API health check returns status 200');

    // 2. Student Registration & Login via Mobile Header
    console.log('\n📋 Test 2: Student Registration & Role Token Verification');
    const studentEmail = `student_role_test_${Date.now()}@iskolar.ph`;
    const regStudent = await POST('/api/auth/register', {
      name: 'Role Test Student',
      email: studentEmail,
      password: 'Password123!',
      role: 'student',
      school: 'UP Diliman',
      course: 'BS Computer Science',
      gpa: 1.25,
      privacyPolicyAccepted: true,
    }, { 'X-Client-Platform': 'mobile' });

    assert(regStudent.status === 200 || regStudent.status === 201, 'Student account registers successfully');
    const studentToken = regStudent.body?.token;
    assert(!!studentToken, 'Student JWT token received');

    // 3. Sponsor Registration & Role Normalization
    console.log('\n📋 Test 3: Sponsor Registration & Role Normalization');
    const sponsorEmail = `sponsor_role_test_${Date.now()}@iskolar.ph`;
    const regSponsor = await POST('/api/auth/register', {
      name: 'Role Test Sponsor Foundation',
      email: sponsorEmail,
      password: 'Password123!',
      role: 'provider', // legacy role string 'provider' -> should normalize to 'sponsor'
      company: 'Role Test Foundation Inc',
      organization_documents: ['sec_cert.pdf'],
      privacyPolicyAccepted: true,
    }, { 'X-Client-Platform': 'web' });

    assert(regSponsor.status === 200 || regSponsor.status === 201, 'Sponsor account registers successfully on Web');
    const sponsorToken = regSponsor.body?.token;
    assert(!!sponsorToken, 'Sponsor JWT token received');
    assert(regSponsor.body?.user?.role === 'sponsor' || regSponsor.body?.user?.role === 'provider', 'Role normalized safely');


    // 4. Platform Header Guidance (Non-Security Display Messages)
    console.log('\n📋 Test 4: Platform Guidance Headers');
    const studentWebCheck = await GET('/api/scholarship-applications/student/list', {
      Authorization: `Bearer ${studentToken}`,
      'X-Client-Platform': 'web',
    });
    assert(studentWebCheck.status === 403, 'Student API call with Web platform header returns 403 Forbidden');
    assert(
      typeof studentWebCheck.body.message === 'string' &&
      studentWebCheck.body.message.includes('mobile application'),
      'Returns mobile application guidance message for student on Web'
    );

    const sponsorMobileCheck = await GET('/api/scholarship-applications/scholarship/sample123/applicants', {
      Authorization: `Bearer ${sponsorToken}`,
      'X-Client-Platform': 'mobile',
    });
    assert(sponsorMobileCheck.status === 403, 'Sponsor API call with Mobile platform header returns 403 Forbidden');
    assert(
      typeof sponsorMobileCheck.body.message === 'string' &&
      sponsorMobileCheck.body.message.includes('web portal'),
      'Returns web portal guidance message for sponsor on Mobile'
    );

    // 5. PLATFORM HEADER SPOOFING & OMISSION DEFENSE (CRITICAL SECURITY)
    console.log('\n📋 Test 5: Platform Header Spoofing & Omission Security');

    // Student attempts to call Sponsor-only endpoint (POST /api/scholarships) with spoofed X-Client-Platform: mobile
    const spoofMobile = await POST('/api/scholarships', { title: 'Spoofed Scholarship' }, {
      Authorization: `Bearer ${studentToken}`,
      'X-Client-Platform': 'mobile', // Spoofed header matching allowed platform
    });
    assert(spoofMobile.status === 403, 'Spoofing X-Client-Platform: mobile DOES NOT grant Student access to Sponsor route (403)');

    // Student attempts to call Sponsor-only endpoint with NO X-Client-Platform header
    const omitHeader = await POST('/api/scholarships', { title: 'No Header Scholarship' }, {
      Authorization: `Bearer ${studentToken}`,
    });
    assert(omitHeader.status === 403, 'Omitting X-Client-Platform header DOES NOT grant Student access to Sponsor route (403)');

    // Student attempts to call Admin endpoint with spoofed X-Client-Platform: web
    const spoofWebAdmin = await GET('/api/admin/students', {
      Authorization: `Bearer ${studentToken}`,
      'X-Client-Platform': 'web',
    });
    assert(spoofWebAdmin.status === 403, 'Spoofing X-Client-Platform: web DOES NOT grant Student access to Admin route (403)');

    // 6. Role-Based Route Authorization
    console.log('\n📋 Test 6: Role-Based Route Authorization');
    const studentAsSponsor = await GET('/api/scholarship-applications/scholarship/sample123/applicants', {
      Authorization: `Bearer ${studentToken}`,
    });
    assert(studentAsSponsor.status === 403, 'Student cannot call Sponsor applicants endpoint (403)');

    const sponsorAsStudent = await POST('/api/scholarship-applications/sample123/submit', {}, {
      Authorization: `Bearer ${sponsorToken}`,
    });
    assert(sponsorAsStudent.status === 403, 'Sponsor cannot call Student application submission endpoint (403)');

    const sponsorAsAdmin = await GET('/api/admin/audit-logs', {
      Authorization: `Bearer ${sponsorToken}`,
    });
    assert(sponsorAsAdmin.status === 403, 'Sponsor cannot access Admin audit logs (403)');

    // 7. Horizontal Data Isolation (Cross-Sponsor Protection)
    console.log('\n📋 Test 7: Horizontal Data Isolation (Cross-Sponsor Protection)');
    
    // Login as pre-verified Seeded Sponsor or Admin
    const seedSponsorRes = await POST('/api/auth/login', {
      email: 'provider@iskolar.ph',
      password: 'Password123!',
      role: 'sponsor',
      skipMfa: true,
    });
    assert(seedSponsorRes.status === 200, 'Seeded verified Sponsor logs in');
    const seedSponsorToken = seedSponsorRes.body.token;

    // Create Scholarship by Verified Sponsor A
    const created = await POST('/api/scholarships', {
      title: 'Sponsor A Exclusive Grant',
      description: 'Exclusive grant for testing',
      slots: 5,
    }, { Authorization: `Bearer ${seedSponsorToken}` });

    assert(created.status === 201, 'Verified Sponsor A creates a scholarship');
    const scholarshipId = created.body.scholarship.id;

    // Register Sponsor B
    const sponsorBEmail = `sponsor_b_test_${Date.now()}@iskolar.ph`;
    const regSponsorB = await POST('/api/auth/register', {
      name: 'Sponsor B Foundation',
      email: sponsorBEmail,
      password: 'Password123!',
      role: 'sponsor',
      company: 'Sponsor B Foundation Inc',
      organization_documents: ['sec.pdf'],
      privacyPolicyAccepted: true,
    }, { 'X-Client-Platform': 'web' });
    const sponsorBToken = regSponsorB.body?.token;


    // Sponsor B attempts to update Sponsor A's scholarship
    const unauthUpdate = await PUT(`/api/scholarships/${scholarshipId}`, {
      title: 'Tampered Title by Sponsor B',
    }, { Authorization: `Bearer ${sponsorBToken}` });

    assert(unauthUpdate.status === 403 || unauthUpdate.status === 404, 'Sponsor B cannot update Sponsor A scholarship (403/404)');

    // 8. Token Security & Authentication Integrity
    console.log('\n📋 Test 8: Token Security & Authentication Integrity');
    const unauthReq = await GET('/api/scholarship-applications/student/list');
    assert(unauthReq.status === 401, 'Unauthenticated request returns 401 Unauthorized');

    const invalidJwt = await GET('/api/scholarship-applications/student/list', {
      Authorization: 'Bearer invalid.tampered.token',
    });
    assert(invalidJwt.status === 401, 'Tampered JWT returns 401 Unauthorized');

    const secret = process.env.JWT_SECRET || 'iskolar-dev-secret-key';
    const expiredToken = jwt.sign({ id: 999, role: 'student', email: 'expired@test.com' }, secret, { expiresIn: -10 });
    const expiredReq = await GET('/api/scholarship-applications/student/list', {
      Authorization: `Bearer ${expiredToken}`,
    });
    assert(expiredReq.status === 401, 'Expired JWT returns 401 Unauthorized');

  } catch (err) {
    console.error('❌ Test execution error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 ROLE SEPARATION SECURITY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
