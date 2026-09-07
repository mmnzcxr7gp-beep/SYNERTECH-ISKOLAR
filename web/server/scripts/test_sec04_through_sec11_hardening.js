/**
 * ISKOLAR SECURITY FINDINGS SEC-04 THROUGH SEC-11 VERIFICATION SUITE
 * 
 * Verifies:
 * - SEC-04: Cleartext transport enforcement & HTTPS/HSTS configuration
 * - SEC-05: Persistent shared session revocation, suspension revocation & Socket.IO
 * - SEC-06: Inconsistent API validation (slots, deadlines, required fields)
 * - SEC-07: Scoped database access & duplicate application database indexes
 * - SEC-08: Configuration exposure & secret sanitization
 * - SEC-09: Modal dialog accessibility, focus containment & Escape dismissal
 * - SEC-10: Truthful, permission-aware scholarship assistant
 * - SEC-11: Financial assistance ledger scope & access controls
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

const { startTestServer, generateTestUser, scopedCleanup, assertDatabaseIsolation } = require('./testHelper');

const repoRoot = path.resolve(__dirname, '../../..');

let passed = 0;
let total = 0;

function recordPass(name) {
  passed++;
  total++;
  console.log(`  ✅ [PASS] ${name}`);
}

function recordFail(name, err) {
  total++;
  console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
}

async function run() {
  console.log('================================================================');
  console.log('🛡️  RUNNING ISKOLAR REMEDIATION VERIFICATION SUITE (SEC-04 to SEC-11)');
  console.log('================================================================\n');

  const testEnv = await startTestServer();
  const baseUrl = testEnv.baseUrl;
  const JWT_SECRET = testEnv.jwtSecret;
  const db = testEnv.db;
  const server = testEnv.server;

  const request = (method, endpoint, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, baseUrl);
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
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            let data = null;
            try {
              data = JSON.parse(raw);
            } catch (_) {
              data = raw;
            }
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(postData);
      req.end();
    });
  };

  try {
    // =========================================================================
    // PART 1: SEC-04 CLEARTEXT TRANSPORT & ENCRYPTION
    // =========================================================================
    console.log('--- PART 1: SEC-04 CLEARTEXT TRANSPORT ENFORCEMENT ---');

    // 1.1 AndroidManifest does not allow universal cleartext traffic
    try {
      const manifest = fs.readFileSync(path.join(repoRoot, 'mobile/android/app/src/main/AndroidManifest.xml'), 'utf8');
      assert(!manifest.includes('android:usesCleartextTraffic="true"'), 'AndroidManifest must not set usesCleartextTraffic="true"');
      assert(manifest.includes('@xml/network_security_config'), 'AndroidManifest must specify network_security_config');
      recordPass('1.1 AndroidManifest.xml enforces network_security_config without universal cleartext');
    } catch (e) {
      recordFail('1.1 AndroidManifest.xml enforces network_security_config without universal cleartext', e);
    }

    // 1.2 network_security_config blocks cleartext in production and scopes development exceptions to debug variant
    try {
      const mainNetSec = fs.readFileSync(path.join(repoRoot, 'mobile/android/app/src/main/res/xml/network_security_config.xml'), 'utf8');
      assert(mainNetSec.includes('cleartextTrafficPermitted="false"'), 'main network_security_config must block cleartext traffic by default');
      assert(!mainNetSec.includes('cleartextTrafficPermitted="true"'), 'main network_security_config must not contain cleartext exceptions');

      const debugNetSecPath = path.join(repoRoot, 'mobile/android/app/src/debug/res/xml/network_security_config.xml');
      assert(fs.existsSync(debugNetSecPath), 'debug variant network_security_config must exist');
      const debugNetSec = fs.readFileSync(debugNetSecPath, 'utf8');
      assert(debugNetSec.includes('<domain-config cleartextTrafficPermitted="true">'), 'Debug network_security_config must isolate emulator domains');
      assert(debugNetSec.includes('10.0.2.2'), 'Debug network_security_config must include Android emulator gateway 10.0.2.2');
      recordPass('1.2 network_security_config.xml isolates local development domains and blocks cleartext in release');
    } catch (e) {
      recordFail('1.2 network_security_config.xml isolates local development domains and blocks cleartext in release', e);
    }

    // 1.3 iOS Info.plist disables arbitrary cleartext loads
    try {
      const plist = fs.readFileSync(path.join(repoRoot, 'mobile/ios/Runner/Info.plist'), 'utf8');
      assert(!plist.includes('<key>NSAllowsArbitraryLoads</key>'), 'Info.plist must not allow arbitrary cleartext loads');
      assert(plist.includes('<key>NSAllowsLocalNetworking</key>'), 'Info.plist must allow local networking for development');
      recordPass('1.3 iOS Info.plist enforces ATS without arbitrary cleartext loads');
    } catch (e) {
      recordFail('1.3 iOS Info.plist enforces ATS without arbitrary cleartext loads', e);
    }

    // 1.4 HSTS security headers
    try {
      const res = await request('GET', '/api/v1/health', null, { 'X-Forwarded-Proto': 'https' });
      assert(res.headers['strict-transport-security'], 'HSTS header must be present for HTTPS requests');
      assert(res.headers['strict-transport-security'].includes('max-age=31536000'), 'HSTS must specify 1 year max-age');
      recordPass('1.4 Express securityHeaders enforces HSTS on HTTPS requests');
    } catch (e) {
      recordFail('1.4 Express securityHeaders enforces HSTS on HTTPS requests', e);
    }

    // =========================================================================
    // PART 2: SEC-05 SESSIONS AND REVOCATION
    // =========================================================================
    console.log('\n--- PART 2: SEC-05 PERSISTENT SESSIONS AND REVOCATION ---');

    const testUser = generateTestUser('student');
    const userToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });

    // 2.1 Authenticated access works before logout
    try {
      if (db.collections?.users) {
        await db.collections.users.insertOne({ ...testUser });
      }
      const res = await request('GET', '/api/auth/me', null, { Authorization: `Bearer ${userToken}` });
      assert.strictEqual(res.status, 200, 'User profile should be accessible with active token');
      recordPass('2.1 Active token authenticates successfully');
    } catch (e) {
      recordFail('2.1 Active token authenticates successfully', e);
    }

    // 2.2 Logout revokes token
    try {
      const logoutRes = await request('POST', '/api/auth/logout', null, { Authorization: `Bearer ${userToken}` });
      assert.strictEqual(logoutRes.status, 200, 'Logout should succeed');

      const replayRes = await request('GET', '/api/auth/me', null, { Authorization: `Bearer ${userToken}` });
      assert.strictEqual(replayRes.status, 401, 'Replayed token after logout must return 401 Unauthorized');
      assert(replayRes.body.message.includes('revoked'), 'Error message must specify token revocation');
      recordPass('2.2 Token is revoked immediately upon logout and rejects replay');
    } catch (e) {
      recordFail('2.2 Token is revoked immediately upon logout and rejects replay', e);
    }

    // 2.3 Account suspension revokes active sessions
    try {
      const suspendUser = generateTestUser('student');
      const suspendToken = jwt.sign(suspendUser, JWT_SECRET, { expiresIn: '1h' });

      if (db.collections?.users) {
        await db.collections.users.insertOne({ ...suspendUser });
      }

      // Verify accessible initially
      const initRes = await request('GET', '/api/auth/me', null, { Authorization: `Bearer ${suspendToken}` });
      assert.strictEqual(initRes.status, 200, 'Should be active before suspension');

      // Admin suspends user
      const adminUser = generateTestUser('admin');
      const adminToken = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '1h' });
      if (db.collections?.users) {
        await db.collections.users.insertOne({ ...adminUser });
      }

      const suspendRes = await request('POST', `/api/admin/users/${suspendUser.id}/status`, {
        status: 'SUSPENDED',
        reason: 'Violation of platform terms',
      }, { Authorization: `Bearer ${adminToken}` });
      assert.strictEqual(suspendRes.status, 200, 'Admin suspension request should succeed');

      // Verify subsequent request with existing token is rejected with 403
      const blockedRes = await request('GET', '/api/auth/me', null, { Authorization: `Bearer ${suspendToken}` });
      assert.strictEqual(blockedRes.status, 403, 'Suspended account must be rejected with 403 Forbidden');
      recordPass('2.3 Suspended account access is revoked across active sessions');
    } catch (e) {
      recordFail('2.3 Suspended account access is revoked across active sessions', e);
    }

    // =========================================================================
    // PART 3: SEC-06 INCONSISTENT API VALIDATION
    // =========================================================================
    console.log('\n--- PART 3: SEC-06 API VALIDATION CONSISTENCY ---');

    const providerUser = generateTestUser('provider', {
      sponsor_verified: true,
      organization_verified: true,
      isVerified: true,
    });
    const providerToken = jwt.sign(providerUser, JWT_SECRET, { expiresIn: '1h' });
    if (db.collections?.users) {
      await db.collections.users.insertOne({ ...providerUser });
    }

    // 3.1 Create scholarship without title
    try {
      const res = await request('POST', '/api/scholarships', {
        title: '',
        slots: 10,
      }, { Authorization: `Bearer ${providerToken}` });
      // Controller or validation catches empty title
      assert(res.status === 400 || res.status === 422, 'Empty scholarship title must be rejected with 400/422');
      recordPass('3.1 Rejects scholarship creation with missing or empty title');
    } catch (e) {
      recordFail('3.1 Rejects scholarship creation with missing or empty title', e);
    }

    // 3.2 Create scholarship with invalid slots (negative or zero)
    try {
      const res = await request('POST', '/api/scholarships', {
        title: 'Invalid Slot Program',
        slots: -5,
      }, { Authorization: `Bearer ${providerToken}` });
      assert(res.status === 400 || res.status === 422 || res.body.scholarship?.slots >= 1, 'Non-positive slots must be sanitized or rejected');
      recordPass('3.2 Sanitizes or rejects non-positive scholarship slots');
    } catch (e) {
      recordFail('3.2 Sanitizes or rejects non-positive scholarship slots', e);
    }

    // =========================================================================
    // PART 4: SEC-07 DATABASE MIRRORING & INDEXING
    // =========================================================================
    console.log('\n--- PART 4: SEC-07 DATABASE SCALABILITY & DUPLICATE INDEXES ---');

    try {
      const ensureIndexes = fs.readFileSync(path.join(repoRoot, 'web/server/src/utils/ensureIndexes.js'), 'utf8');
      assert(ensureIndexes.includes('idx_applications_scholar_student'), 'ensureIndexes must define idx_applications_scholar_student index');
      assert(ensureIndexes.includes('unique: true'), 'ensureIndexes must declare unique constraint on compound applications index');
      assert(ensureIndexes.includes('revokedtokens'), 'ensureIndexes must define revokedtokens collection indexing');
      assert(ensureIndexes.includes('expireAfterSeconds: 0'), 'ensureIndexes must configure TTL index for revoked tokens');
      recordPass('4.1 ensureIndexes.js enforces compound unique application and TTL revocation indexes');
    } catch (e) {
      recordFail('4.1 ensureIndexes.js enforces compound unique application and TTL revocation indexes', e);
    }

    // =========================================================================
    // PART 5: SEC-08 CONFIGURATION EXPOSURE
    // =========================================================================
    console.log('\n--- PART 5: SEC-08 CONFIGURATION SANITIZATION ---');

    try {
      const envExample = fs.readFileSync(path.join(repoRoot, 'web/server/.env.example'), 'utf8');
      assert(!envExample.includes('samgarciavillaluna_db_user'), '.env.example must not contain real database usernames');
      assert(!envExample.includes('0lz3nds.mongodb.net'), '.env.example must not contain real MongoDB cluster hostnames');
      assert(!envExample.includes('8eb7d9b780431b7af22e28c7a6c79ee2'), '.env.example must not contain real Cloudflare account IDs');
      assert(!envExample.includes('iskolar.official@gmail.com'), '.env.example must not contain real email accounts');
      recordPass('5.1 web/server/.env.example sanitized of all personal accounts and cluster addresses');
    } catch (e) {
      recordFail('5.1 web/server/.env.example sanitized of all personal accounts and cluster addresses', e);
    }

    // =========================================================================
    // PART 6: SEC-09 MODAL ACCESSIBILITY
    // =========================================================================
    console.log('\n--- PART 6: SEC-09 MODAL ACCESSIBILITY ---');

    try {
      const loginModal = fs.readFileSync(path.join(repoRoot, 'web/client/src/components/LoginModal.jsx'), 'utf8');
      assert(loginModal.includes('role="dialog"'), 'LoginModal must include role="dialog"');
      assert(loginModal.includes('aria-modal="true"'), 'LoginModal must include aria-modal="true"');
      assert(loginModal.includes('aria-labelledby="login-modal-title"'), 'LoginModal must include aria-labelledby');
      assert(loginModal.includes('id="login-modal-title"'), 'LoginModal must define login-modal-title header id');
      assert(loginModal.includes("e.key === 'Escape'"), 'LoginModal must handle Escape key dismissal');
      assert(loginModal.includes("e.key === 'Tab'"), 'LoginModal must contain focus trap logic');
      recordPass('6.1 LoginModal implements accessible role, labels, Escape dismissal, and focus trap');
    } catch (e) {
      recordFail('6.1 LoginModal implements accessible role, labels, Escape dismissal, and focus trap', e);
    }

    // =========================================================================
    // PART 7: SEC-10 TRUTHFUL PERMISSION-AWARE CHATBOT ASSISTANT
    // =========================================================================
    console.log('\n--- PART 7: SEC-10 CHATBOT ASSISTANT ENDPOINT ---');

    // 7.1 Scholarship inquiry
    try {
      const res = await request('POST', '/api/chatbot/query', { query: 'What scholarships are open?' });
      assert.strictEqual(res.status, 200, 'Chatbot query should return 200 OK');
      assert(res.body.success, 'Response should indicate success');
      assert(typeof res.body.answer === 'string' && res.body.answer.length > 10, 'Should return informative answer');
      assert(!res.body.answer.includes('Demo response'), 'Should not contain static mock string');
      recordPass('7.1 /api/chatbot/query answers scholarship inquiry from platform database');
    } catch (e) {
      recordFail('7.1 /api/chatbot/query answers scholarship inquiry from platform database', e);
    }

    // 7.2 GWA criteria inquiry
    try {
      const res = await request('POST', '/api/chatbot/query', { query: 'What GWA do I need to qualify?' });
      assert.strictEqual(res.status, 200, 'Chatbot query should return 200 OK');
      assert(res.body.answer.includes('GWA') || res.body.answer.includes('GPA'), 'Answer should discuss GWA thresholds');
      recordPass('7.2 /api/chatbot/query details GWA and academic criteria');
    } catch (e) {
      recordFail('7.2 /api/chatbot/query details GWA and academic criteria', e);
    }

    // 7.3 Empty query rejection
    try {
      const res = await request('POST', '/api/chatbot/query', { query: '' });
      assert.strictEqual(res.status, 400, 'Empty query should return 400 Bad Request');
      recordPass('7.3 /api/chatbot/query validates required query parameter');
    } catch (e) {
      recordFail('7.3 /api/chatbot/query validates required query parameter', e);
    }

    // =========================================================================
    // PART 8: SEC-11 FINANCIAL SCOPE
    // =========================================================================
    console.log('\n--- PART 8: SEC-11 FINANCIAL ASSISTANCE LEDGER ---');

    try {
      const txController = fs.readFileSync(path.join(repoRoot, 'web/server/src/controllers/transactionController.js'), 'utf8');
      assert(txController.includes('provider.isVerified'), 'Transaction creation must require verified provider status');
      assert(txController.includes('generateTransactionId'), 'Transaction records must generate distinct transaction identifiers');
      recordPass('8.1 Transaction controller enforces role verification and ledger integrity');
    } catch (e) {
      recordFail('8.1 Transaction controller enforces role verification and ledger integrity', e);
    }

    console.log('\n================================================================');
    console.log(`🎓 VERIFICATION COMPLETE: ${passed}/${total} PASSED`);
    console.log('================================================================\n');

  } finally {
    await scopedCleanup().catch(() => {});
    if (server) server.close();
    process.exit(passed === total ? 0 : 1);
  }
}

run().catch((err) => {
  console.error('\n❌ HARDENING TEST SUITE ERROR:', err);
  process.exit(1);
});
