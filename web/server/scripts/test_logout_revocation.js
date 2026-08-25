#!/usr/bin/env node
/**
 * JWT Logout Revocation Test
 * Verifies that a logged-in session token is immediately revoked upon calling POST /api/auth/logout,
 * and subsequent API calls using the old token are rejected with HTTP 401 Unauthorized.
 */

const assert = require('assert');
const http = require('http');

const BASE = 'http://localhost:4000';

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      { method, headers: reqHeaders },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('========================================================');
  console.log('🧪 RUNNING JWT LOGOUT REVOCATION TEST');
  console.log('========================================================\n');

  // 1. Register / login test student
  const email = `logout_test_${Date.now()}@iskolar.ph`;
  const regRes = await request('POST', '/api/auth/register', {
    name: 'Logout Test Student',
    email,
    password: 'Password123!',
    role: 'student',
    privacyPolicyAccepted: true,
  });

  assert(regRes.status === 200 || regRes.status === 201, 'Student registers successfully');
  const token = regRes.body.token;
  assert(token, 'JWT token returned on registration');
  console.log('✓ Step 1: Student registered and token received');

  // 2. Access protected profile route with token (Should succeed HTTP 200)
  const profileBefore = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${token}`,
  });
  assert(profileBefore.status === 200, 'Authenticated request with active token returns 200');
  console.log('✓ Step 2: Accessing /api/auth/me with active token returns HTTP 200');

  // 3. Call logout endpoint
  const logoutRes = await request('POST', '/api/auth/logout', null, {
    Authorization: `Bearer ${token}`,
  });
  assert(logoutRes.status === 200, 'Logout request returns HTTP 200');
  console.log('✓ Step 3: POST /api/auth/logout succeeded with HTTP 200');

  // 4. Attempt accessing protected profile route with revoked token (Must fail HTTP 401)
  const profileAfter = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${token}`,
  });
  assert(profileAfter.status === 401, 'Request with revoked token returns HTTP 401');
  console.log('✓ Step 4: Accessing /api/auth/me with revoked token rejected with HTTP 401 Unauthorized');

  console.log('\n========================================================');
  console.log('✅ JWT LOGOUT REVOCATION TEST PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runTest().catch((err) => {
  console.error('❌ Logout revocation test failed:', err);
  process.exit(1);
});
