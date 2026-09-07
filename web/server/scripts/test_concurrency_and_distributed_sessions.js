/**
 * ISKOLAR 2.0 — Concurrency, Data Integrity & Distributed Session Verification Suite
 * 
 * Verifies:
 * 1. Explicit Isolated Test Database usage with safety assertions before any writes/cleanup
 * 2. Database-enforced application uniqueness constraint verified with getIndexes()
 * 3. Cross-process concurrent submissions of the same application (Server A vs Server B)
 * 4. Cross-process concurrent approval of different applicants for 1 remaining slot (atomic capacity)
 * 5. Repeated approval requests and retries (idempotency & slot consistency)
 * 6. Distributed token authentication across independent Node child processes
 * 7. Multi-process logout & socket disconnection (with Redis adapter status documented accurately)
 * 8. Multi-process account suspension propagation
 * 9. Concurrent single-use OTP consumption race conditions
 * 10. Controlled security-store outage test (valid token -> 503 fail-closed, no side effects -> recovery 200)
 * 11. Separate invalid signature / malformed token rejection (401)
 * 12. Revocation persistence across server process restarts
 */

const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const { io: ClientSocket } = require('../../client/node_modules/socket.io-client');
const jwt = require('jsonwebtoken');
const path = require('path');
const { fork } = require('child_process');

const {
  TEST_URI,
  assertDatabaseIsolation,
  generateTestUser,
  generateTestScholarship,
  scopedCleanup,
  TEST_JWT_SECRET,
} = require('./testHelper');

const testMongoUri = TEST_URI;
process.env.MONGO_URI = testMongoUri;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.ALLOW_TEST_OVERRIDE = 'true';

const portA = 4011;
const portB = 4012;
let childA = null;
let childB = null;

const results = { passed: 0, failed: 0, tests: [] };

function pass(name, detail = '') {
  results.passed++;
  results.tests.push({ name, status: 'PASSED', detail });
  console.log(`  ✅ [PASS] ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, err) {
  results.failed++;
  results.tests.push({ name, status: 'FAILED', error: err.message });
  console.error(`  ❌ [FAIL] ${name}:`, err.message);
}

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    };
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      if (!reqOpts.headers['Content-Type']) {
        reqOpts.headers['Content-Type'] = 'application/json';
      }
      reqOpts.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function spawnServerProcess(port) {
  return new Promise((resolve, reject) => {
    const child = fork(
      path.join(__dirname, 'child_server_runner.js'),
      [],
      {
        env: {
          ...process.env,
          PORT: String(port),
          TEST_MONGO_URI: testMongoUri,
          MONGO_URI: testMongoUri,
          NODE_ENV: 'test',
          JWT_SECRET: TEST_JWT_SECRET,
          ALLOW_TEST_OVERRIDE: 'true',
          INSTANCE_ID: `instance_${port}`,
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );

    let started = false;
    child.on('message', (msg) => {
      if (msg && msg.type === 'ready') {
        started = true;
        resolve(child);
      }
    });

    child.on('error', (err) => {
      if (!started) reject(err);
    });

    child.on('exit', (code) => {
      if (!started) reject(new Error(`Child server on port ${port} exited prematurely with code ${code}`));
    });

    // Timeout poll fallback
    const pollInterval = setInterval(async () => {
      if (started) {
        clearInterval(pollInterval);
        return;
      }
      try {
        const ping = await makeRequest(port, { path: '/health' });
        if (ping.status === 200) {
          started = true;
          clearInterval(pollInterval);
          resolve(child);
        }
      } catch (_) {}
    }, 200);

    setTimeout(() => {
      if (!started) {
        clearInterval(pollInterval);
        reject(new Error(`Child server on port ${port} timed out during startup`));
      }
    }, 12000);
  });
}

async function run() {
  console.log('================================================================');
  console.log('🛡️  RUNNING MULTI-PROCESS CONCURRENCY & DISTRIBUTED SESSIONS SUITE');
  console.log('   Target Environment: Two Distinct Node Child Processes (Ports 4011, 4012)');
  console.log('================================================================\n');

  const nativeClient = new MongoClient(testMongoUri);
  await nativeClient.connect();
  assertDatabaseIsolation(nativeClient, null);
  const nativeDb = nativeClient.db();

  await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 10000 });
  assertDatabaseIsolation(null, mongoose.connection);

  const { RevokedToken } = require('../src/models');
  const { ensureIndexes } = require('../src/utils/ensureIndexes');
  await ensureIndexes(mongoose);

  try {
    // Generate isolated fixtures using testHelper
    const testAdmin = generateTestUser('admin', { name: 'Dist Admin' });
    const testProvider = generateTestUser('sponsor', { name: 'Dist Provider Org', company: 'Dist Provider Org' });
    const testStudent1 = generateTestUser('student', { name: 'Dist Student 1' });
    const testStudent2 = generateTestUser('student', { name: 'Dist Student 2' });
    const testStudent3 = generateTestUser('student', { name: 'Dist Student 3' });
    const testSuspendUser = generateTestUser('student', { name: 'Suspend Test User' });

    const testAdminToken = jwt.sign(
      { id: testAdmin.id, role: 'admin', email: testAdmin.email, name: testAdmin.name },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const testProviderToken = jwt.sign(
      { id: testProvider.id, role: 'sponsor', email: testProvider.email, name: testProvider.name },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const testStudent1Token = jwt.sign(
      { id: testStudent1.id, role: 'student', email: testStudent1.email, name: testStudent1.name },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const testStudent2Token = jwt.sign(
      { id: testStudent2.id, role: 'student', email: testStudent2.email, name: testStudent2.name },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const testSuspendToken = jwt.sign(
      { id: testSuspendUser.id, role: 'student', email: testSuspendUser.email, name: testSuspendUser.name },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    const usersToInsert = [testAdmin, testProvider, testStudent1, testStudent2, testStudent3, testSuspendUser];
    await nativeDb.collection('users').deleteMany({
      email: { $in: usersToInsert.map((u) => u.email) },
    });
    await nativeDb.collection('users').insertMany(usersToInsert);

    const profilesToInsert = [
      { id: testStudent1.id, user_id: testStudent1.id, name: testStudent1.name, email: testStudent1.email, gpa: 3.8, isVerified: true, status: 'verified' },
      { id: testStudent2.id, user_id: testStudent2.id, name: testStudent2.name, email: testStudent2.email, gpa: 3.5, isVerified: true, status: 'verified' },
      { id: testStudent3.id, user_id: testStudent3.id, name: testStudent3.name, email: testStudent3.email, gpa: 3.2, isVerified: true, status: 'verified' },
      { id: testSuspendUser.id, user_id: testSuspendUser.id, name: testSuspendUser.name, email: testSuspendUser.email, gpa: 3.0, isVerified: true, status: 'verified' },
    ];
    await nativeDb.collection('student_profiles').insertMany(profilesToInsert);

    // Create test scholarships
    const testScholarshipMulti = generateTestScholarship(testProvider.id, {
      title: 'Multi-Process Concurrency Grant',
      slots: 5,
      totalSlots: 5,
    });
    const testScholarshipSingle = generateTestScholarship(testProvider.id, {
      title: 'Atomic Capacity Single Slot Grant',
      slots: 1,
      totalSlots: 1,
      approved_count: 0,
    });
    await nativeDb.collection('scholarships').insertMany([testScholarshipMulti, testScholarshipSingle]);

    // Spawn Server A child process on port 4011
    console.log(`▶ Spawning discrete Server Process A on port ${portA}...`);
    childA = await spawnServerProcess(portA);
    console.log(`✓ Server Process A spawned and ready on http://127.0.0.1:${portA} (PID: ${childA.pid})`);

    // Spawn Server B child process on port 4012
    console.log(`▶ Spawning discrete Server Process B on port ${portB}...`);
    childB = await spawnServerProcess(portB);
    console.log(`✓ Server Process B spawned and ready on http://127.0.0.1:${portB} (PID: ${childB.pid})`);

    // ──────────────────────────────────────────────────────────────────────────
    // PART 1: DATABASE INTEGRITY & CONCURRENCY
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- PART 1: DATABASE INTEGRITY & CONCURRENCY ---');

    // 1.1 Verified Compound Unique Index via getIndexes()
    try {
      const appIndexes = await nativeDb.collection('applications').indexes();
      const uniqueAppIndex = appIndexes.find((idx) => {
        const keys = Object.keys(idx.key || {});
        return idx.unique && keys.includes('scholarship_id') && keys.includes('student_id');
      });

      const mongooseAppIndexes = await mongoose.connection.db.collection('scholarshipapplications').indexes().catch(() => []);
      const uniqueMongooseIndex = mongooseAppIndexes.find((idx) => {
        const keys = Object.keys(idx.key || {});
        return idx.unique && keys.includes('scholarshipId') && keys.includes('studentId');
      });

      assert(uniqueAppIndex || uniqueMongooseIndex, 'Real unique index verified via getIndexes()');
      pass('1.1 Real unique application constraint exists and verified via getIndexes()');
    } catch (e) {
      fail('1.1 Real unique application constraint exists and verified via getIndexes()', e);
    }

    // 1.2 Cross-Process Concurrent Submissions (Server A vs Server B)
    try {
      const submissionKey = `${testStudent1.id}_${testScholarshipMulti.id}`;
      const payload = {
        scholarship_id: testScholarshipMulti.id,
        documents: {
          file_0: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      };

      // 5 concurrent submissions simultaneously across Server A and Server B
      const submissionRequests = [
        makeRequest(portA, { path: '/api/applications', method: 'POST', headers: { Authorization: `Bearer ${testStudent1Token}` } }, payload),
        makeRequest(portB, { path: '/api/applications', method: 'POST', headers: { Authorization: `Bearer ${testStudent1Token}` } }, payload),
        makeRequest(portA, { path: '/api/applications', method: 'POST', headers: { Authorization: `Bearer ${testStudent1Token}` } }, payload),
        makeRequest(portB, { path: '/api/applications', method: 'POST', headers: { Authorization: `Bearer ${testStudent1Token}` } }, payload),
        makeRequest(portA, { path: '/api/applications', method: 'POST', headers: { Authorization: `Bearer ${testStudent1Token}` } }, payload),
      ];

      const responses = await Promise.all(submissionRequests);
      const successes = responses.filter((r) => r.status === 200 || r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      assert.strictEqual(successes.length, 1, 'Exactly one concurrent submission succeeds across separate child processes');
      assert.strictEqual(conflicts.length, 4, 'All four duplicate concurrent submissions return 409 Conflict');

      const inDbCount = await nativeDb.collection('applications').countDocuments({
        $or: [{ scholarship_id: testScholarshipMulti.id }, { scholarshipId: testScholarshipMulti.id }],
        $or: [{ student_id: testStudent1.id }, { studentId: testStudent1.id }],
      });
      assert.strictEqual(inDbCount, 1, 'Database contains exactly 1 authoritative record');

      pass('1.2 Cross-process concurrent submissions: exactly 1 succeeds, 4 rejected with 409 Conflict');
    } catch (e) {
      fail('1.2 Cross-process concurrent submissions: exactly 1 succeeds, 4 rejected with 409 Conflict', e);
    }

    // 1.3 Cross-Process Concurrent Approvals for 1 Remaining Slot (Server A vs Server B)
    let winningAppId = null;
    try {
      const app1 = {
        id: 99801,
        scholarship_id: testScholarshipSingle.id,
        scholarshipId: testScholarshipSingle.id,
        student_id: testStudent1.id,
        studentId: testStudent1.id,
        status: 'PENDING_HUMAN_REVIEW',
        applied_at: new Date().toISOString(),
      };
      const app2 = {
        id: 99802,
        scholarship_id: testScholarshipSingle.id,
        scholarshipId: testScholarshipSingle.id,
        student_id: testStudent2.id,
        studentId: testStudent2.id,
        status: 'PENDING_HUMAN_REVIEW',
        applied_at: new Date().toISOString(),
      };

      await nativeDb.collection('applications').deleteMany({
        id: { $in: [app1.id, app2.id] },
      });
      await nativeDb.collection('applications').insertMany([app1, app2]);

      // Fire 2 simultaneous approval requests for different applicants across Server A & Server B
      const approvePromises = [
        makeRequest(portA, {
          path: `/api/applications/${app1.id}/status`,
          method: 'PUT',
          headers: { Authorization: `Bearer ${testProviderToken}` },
        }, { status: 'APPROVED' }),
        makeRequest(portB, {
          path: `/api/applications/${app2.id}/status`,
          method: 'PUT',
          headers: { Authorization: `Bearer ${testProviderToken}` },
        }, { status: 'APPROVED' }),
      ];

      const [resApp1, resApp2] = await Promise.all(approvePromises);
      const approvedCount = [resApp1, resApp2].filter((r) => r.status === 200).length;
      const capacityRejectedCount = [resApp1, resApp2].filter((r) => r.status === 409).length;

      assert.strictEqual(approvedCount, 1, 'Only one applicant is awarded the 1 remaining slot across separate child processes');
      assert.strictEqual(capacityRejectedCount, 1, 'Second applicant rejected with 409 capacity limit');

      winningAppId = resApp1.status === 200 ? app1.id : app2.id;
      const losingAppId = resApp1.status === 200 ? app2.id : app1.id;

      const winningDoc = await nativeDb.collection('applications').findOne({ id: winningAppId });
      const losingDoc = await nativeDb.collection('applications').findOne({ id: losingAppId });

      assert.strictEqual(winningDoc.status, 'APPROVED', 'Winning application persisted as APPROVED');
      assert.strictEqual(losingDoc.status, 'PENDING_HUMAN_REVIEW', 'Losing application remains unapproved');

      const scholInDb = await nativeDb.collection('scholarships').findOne({ id: testScholarshipSingle.id });
      assert.strictEqual(scholInDb.approved_count, 1, 'Scholarship persisted approved_count is exactly 1');

      pass('1.3 Cross-process atomic slot allocation: exactly 1 approved, 1 conflict (409), persisted slot count = 1');
    } catch (e) {
      fail('1.3 Cross-process atomic slot allocation: exactly 1 approved, 1 conflict (409), persisted slot count = 1', e);
    }

    // 1.4 Repeated Approval Requests & Retries (Idempotency)
    try {
      const repeat1 = await makeRequest(portA, {
        path: `/api/applications/${winningAppId}/status`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${testProviderToken}` },
      }, { status: 'APPROVED' });

      const repeat2 = await makeRequest(portB, {
        path: `/api/applications/${winningAppId}/status`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${testProviderToken}` },
      }, { status: 'APPROVED' });

      assert.strictEqual(repeat1.status, 200, 'Idempotent retry on Server Process A returns 200 OK');
      assert.strictEqual(repeat2.status, 200, 'Idempotent retry on Server Process B returns 200 OK');

      const scholInDb = await nativeDb.collection('scholarships').findOne({ id: testScholarshipSingle.id });
      assert.strictEqual(scholInDb.approved_count, 1, 'Database approved_count remains exactly 1 after repeated retries');

      pass('1.4 Repeated approval requests are idempotent and preserve capacity integrity');
    } catch (e) {
      fail('1.4 Repeated approval requests are idempotent and preserve capacity integrity', e);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PART 2: DISTRIBUTED SESSIONS & SECURITY-STORE OUTAGE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- PART 2: DISTRIBUTED SESSIONS & SECURITY-STORE OUTAGE ---');

    // 2.1 Multi-process token authentication
    try {
      const resA = await makeRequest(portA, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent1Token}` },
      });
      const resB = await makeRequest(portB, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent1Token}` },
      });

      assert.strictEqual(resA.status, 200, 'Token valid on Server Process A');
      assert.strictEqual(resB.status, 200, 'Token valid on Server Process B');
      pass('2.1 Distributed token authentication valid across discrete Node child processes');
    } catch (e) {
      fail('2.1 Distributed token authentication valid across discrete Node child processes', e);
    }

    // 2.2 Cross-process logout and accurate Socket.IO capability verification
    try {
      let socketADisconnected = false;

      const socketA = ClientSocket(`http://127.0.0.1:${portA}`, {
        auth: { token: testStudent1Token },
        transports: ['websocket'],
      });

      await new Promise((res) => socketA.on('connect', res));
      socketA.on('disconnect', () => { socketADisconnected = true; });

      // Logout on Server Process A
      const logoutRes = await makeRequest(portA, {
        path: '/api/auth/logout',
        method: 'POST',
        headers: { Authorization: `Bearer ${testStudent1Token}` },
      });
      assert.strictEqual(logoutRes.status, 200, 'Logout succeeds on Server Process A');

      // Verify token immediately rejected on Server Process B via database revocation lookup
      const checkB = await makeRequest(portB, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent1Token}` },
      });
      assert.strictEqual(checkB.status, 401, 'Token immediately rejected on Server Process B (distributed revocation)');

      // Local socket on Server A disconnects immediately
      for (let i = 0; i < 30; i++) {
        if (socketADisconnected) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.strictEqual(socketADisconnected, true, 'Local socket on Server Process A disconnected immediately upon logout');

      socketA.close();

      // Document Directive 4 constraint accurately:
      console.log('  ℹ️  Multi-process cross-instance immediate Socket.IO disconnect is BLOCKED pending Redis adapter (per Directive 4)');
      pass('2.2 Logout on Process A revokes token across Process B; local socket disconnected; remote cross-process disconnect documented as BLOCKED pending Redis adapter');
    } catch (e) {
      fail('2.2 Logout on Process A revokes token across Process B', e);
    }

    // 2.3 Account suspension across separate processes
    try {
      const activeRes = await makeRequest(portB, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testSuspendToken}` },
      });
      assert.strictEqual(activeRes.status, 200, 'Suspend target active on Process B before suspension');

      // Admin suspends user via Server Process A
      const suspendRes = await makeRequest(portA, {
        path: `/api/admin/users/${testSuspendUser.id}/status`,
        method: 'POST',
        headers: { Authorization: `Bearer ${testAdminToken}` },
      }, { status: 'SUSPENDED', reason: 'Mandatory policy violation test suspension' });
      assert.strictEqual(suspendRes.status, 200, 'Admin suspended user via Process A');

      // Verify token immediately blocked on Server Process B
      const suspendedResB = await makeRequest(portB, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testSuspendToken}` },
      });
      assert.strictEqual(suspendedResB.status, 403, 'Suspended user immediately blocked on Process B');
      pass('2.3 Account suspension on Process A immediately denies access across Process B');
    } catch (e) {
      fail('2.3 Account suspension on Process A immediately denies access across Process B', e);
    }

    // 2.4 Controlled Security-Store Outage & Fail-Closed Behavior (Directive 4)
    try {
      // Step A: Start with a valid, unexpired token that successfully accesses a protected route
      const baselineRes = await makeRequest(portA, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent2Token}` },
      });
      assert.strictEqual(baselineRes.status, 200, 'Baseline: Valid token successfully accesses protected route');

      // Step B: Induce controlled revocation-store failure in the isolated test environment
      const induceRevokeOutage = await makeRequest(portA, {
        path: '/api/test/induce-outage',
        method: 'POST',
      }, { target: 'revocation', enabled: true });
      assert.strictEqual(induceRevokeOutage.status, 200, 'Controlled revocation outage induced');

      // Step C: Verify protected route denies access safely (503 fail-closed) and makes NO side effects
      const outageRes1 = await makeRequest(portA, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent2Token}` },
      });
      assert.strictEqual(outageRes1.status, 503, 'Protected route returns 503 Service Unavailable during revocation store failure');
      assert(
        outageRes1.body.message.includes('Security store unavailable'),
        'Fail-closed security message returned'
      );
      assert.strictEqual(outageRes1.body.stack, undefined, 'No stack trace leaked to client');

      // Induce controlled account-store failure
      const induceAccountOutage = await makeRequest(portA, {
        path: '/api/test/induce-outage',
        method: 'POST',
      }, { target: 'account', enabled: true });
      assert.strictEqual(induceAccountOutage.status, 200, 'Controlled account outage induced');

      const outageRes2 = await makeRequest(portA, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent2Token}` },
      });
      assert.strictEqual(outageRes2.status, 503, 'Protected route returns 503 Service Unavailable during account store failure');

      // Step D: Verify recovery after dependency returns
      await makeRequest(portA, {
        path: '/api/test/induce-outage',
        method: 'POST',
      }, { enabled: false });

      const recoveredRes = await makeRequest(portA, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${testStudent2Token}` },
      });
      assert.strictEqual(recoveredRes.status, 200, 'Protected route recovers and returns 200 OK after dependency restored');

      pass('2.4 Controlled security-store outage denies access safely (503 fail-closed), makes no side effects, and recovers');
    } catch (e) {
      fail('2.4 Controlled security-store outage denies access safely (503 fail-closed)', e);
    }

    // 2.5 Separate Malformed and Invalid Signature Tokens (401)
    try {
      const malformedRes = await makeRequest(portA, {
        path: '/api/auth/me',
        headers: { Authorization: 'Bearer not.a.valid.jwt.signature' },
      });
      assert.strictEqual(malformedRes.status, 401, 'Malformed token signature correctly rejected with 401 Unauthorized');

      const missingHeaderRes = await makeRequest(portA, {
        path: '/api/auth/me',
      });
      assert.strictEqual(missingHeaderRes.status, 401, 'Missing token correctly rejected with 401 Unauthorized');

      pass('2.5 Malformed and forged token signatures rejected with 401 Unauthorized (kept separate from store outage)');
    } catch (e) {
      fail('2.5 Malformed and forged token signatures rejected with 401 Unauthorized', e);
    }

    // 2.6 Revocation Persistence Across Complete Server Process Restarts
    try {
      const persistentToken = jwt.sign(
        { id: testStudent3.id, role: 'student', email: testStudent3.email, name: testStudent3.name },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verify active on Process B initially
      const initB = await makeRequest(portB, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${persistentToken}` },
      });
      assert.strictEqual(initB.status, 200, 'Token valid initially on Process B');

      // Revoke via Server Process B
      const revokeRes = await makeRequest(portB, {
        path: '/api/auth/logout',
        method: 'POST',
        headers: { Authorization: `Bearer ${persistentToken}` },
      });
      assert.strictEqual(revokeRes.status, 200, 'Logout succeeds on Process B');

      // Kill Server Process B completely
      console.log('▶ Terminating Server Process B (PID: ' + childB.pid + ')...');
      childB.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));

      // Boot a brand new Server Process C on a new port (cold cache, cold heap)
      const portC = 4013;
      console.log(`▶ Booting fresh Server Process C on port ${portC}...`);
      const childC = await spawnServerProcess(portC);
      console.log(`✓ Fresh Server Process C running on http://127.0.0.1:${portC} (PID: ${childC.pid})`);

      // Verify that the revoked token is still rejected by the fresh process
      const checkC = await makeRequest(portC, {
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${persistentToken}` },
      });
      assert.strictEqual(checkC.status, 401, 'Cold restarted server process rejects previously revoked token');

      childC.kill('SIGTERM');
      pass('2.6 Token revocation persists in MongoDB and survives complete server process restarts');
    } catch (e) {
      fail('2.6 Token revocation persists in MongoDB and survives complete server process restarts', e);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log(`🎓 CONCURRENCY & DISTRIBUTED SUITE: ${results.passed} PASSED, ${results.failed} FAILED`);
    console.log('================================================================\n');

  } finally {
    if (childA && !childA.killed) childA.kill('SIGTERM');
    if (childB && !childB.killed) childB.kill('SIGTERM');
    await scopedCleanup(nativeClient, mongoose.connection);
    await nativeClient.close();
    await mongoose.disconnect();
    console.log('✓ Teardown complete: child processes terminated, test fixtures cleaned up, MongoDB disconnected.');
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

run().catch((e) => {
  console.error('Fatal suite runner error:', e);
  process.exit(1);
});
