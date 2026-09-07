/**
 * test_concurrent_duplicate_submissions.js
 * 
 * Production-Readiness Integration Test Suite (Directive 3 & 4):
 * 1. Two-process concurrent duplicate application submissions across separate HTTP ports.
 * 2. Proves exactly ONE request succeeds (200/201) and the concurrent duplicate fails with 409 Conflict.
 * 3. Proves MongoDB collection 'applications' contains strictly 1 record.
 * 4. Verifies database-enforced unique compound index with getIndexes().
 * 5. Proves ensureIndexes fails closed with typed MandatoryUniqueIndexError if uniqueness is violated.
 * 6. Proves /health/readiness returns HTTP 503 when uniqueness is unenforced.
 */

// MUST load testHelper before any application/database modules
const {
  TEST_URI,
  assertDatabaseIsolation,
  generateTestUser,
  generateTestScholarship,
  signToken,
  scopedCleanup,
} = require('./testHelper');

const assert = require('assert');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');
const { MongoClient } = require('mongodb');

function sendPostRequest(port, reqPath, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      `http://127.0.0.1:${port}${reqPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(raw) });
          } catch (_) {
            resolve({ statusCode: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sendGetRequest(port, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${reqPath}`, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(raw) });
        } catch (_) {
          resolve({ statusCode: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
  });
}

function spawnChildServer(port) {
  return new Promise((resolve, reject) => {
    const runnerPath = path.join(__dirname, 'child_server_runner.js');
    const child = fork(runnerPath, [], {
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        MONGO_URI: TEST_URI,
        TEST_MONGO_URI: TEST_URI,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('message', (msg) => {
      if (msg && msg.type === 'ready') {
        resolve({ child, port });
      }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Child server on port ${port} exited prematurely with code ${code}.\nStdout: ${stdout}\nStderr: ${stderr}`));
      }
    });

    // Timeout safety: 15 seconds
    setTimeout(() => {
      resolve({ child, port });
    }, 8000);
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('🧪 CONCURRENT DUPLICATE SUBMISSIONS & UNIQUE CONSTRAINT TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(desc) {
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  }

  function recordFail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc}:`, err?.message || err);
    failed++;
  }

  const client = new MongoClient(TEST_URI);
  const children = [];

  try {
    await client.connect();
    const db = client.db();
    assertDatabaseIsolation(client, null);
    console.log(`✓ Test database connected: ${db.databaseName}`);

    // Ensure clean state before initializing indexes
    await db.collection('applications').deleteMany({
      $or: [
        { scholarship_id: 8888801 },
        { id: { $gte: 9999900 } },
      ],
    }).catch(() => {});

    // Ensure clean state and verified indexes
    const { ensureIndexes } = require('../src/utils/ensureIndexes');
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(TEST_URI);
    }
    await ensureIndexes(mongoose);
    recordPass('Database indexes initialized and verified via ensureIndexes');

    // Verify actual MongoDB indexes with getIndexes()
    const appIndexes = await db.collection('applications').indexes();
    const hasCompoundUnique = appIndexes.some(
      (idx) => (idx.name === 'idx_applications_scholar_student' || idx.name === 'idx_applications_scholarId_studentId') && idx.unique
    );
    assert.strictEqual(hasCompoundUnique, true, 'Compound unique index must exist on applications collection');
    recordPass('Actual MongoDB getIndexes() verification: idx_applications_scholar_student unique=true');

    // 1. Spawn two independent child servers on ports 4081 and 4082
    const portA = 4081;
    const portB = 4082;

    console.log(`\n▶ Spawning Child Server A on port ${portA}...`);
    const serverA = await spawnChildServer(portA);
    children.push(serverA.child);

    console.log(`▶ Spawning Child Server B on port ${portB}...`);
    const serverB = await spawnChildServer(portB);
    children.push(serverB.child);

    recordPass(`Two independent server processes spawned (PID A: ${serverA.child.pid}, PID B: ${serverB.child.pid})`);

    // 2. Setup Test Data
    const providerUser = generateTestUser('provider', {
      name: 'Concurrent Test Foundation',
      organization_name: 'Concurrent Test Foundation',
      isVerified: true,
      sponsor_verified: true,
      organization_verified: true,
    });
    await db.collection('users').insertOne(providerUser);

    const scholarship = generateTestScholarship(providerUser.id, {
      title: 'Concurrency Isolation Scholarship 2026',
      slots: 10,
      totalSlots: 10,
      approved_count: 0,
      status: 'open',
    });
    await db.collection('scholarships').insertOne(scholarship);

    const studentUser = generateTestUser('student', {
      name: 'Concurrent Applicant Student',
      isVerified: true,
      emailVerified: true,
    });
    await db.collection('users').insertOne(studentUser);
    const studentToken = signToken(studentUser);

    const submissionPayload = {
      scholarship_id: scholarship.id,
      gpa: 3.8,
      documents: {
        'Certificate of Enrollment (COE)': {
          filename: 'coe.png',
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
        'Valid School ID': {
          filename: 'school_id.png',
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      },
    };

    // 3. Fire simultaneous concurrent submission requests to Server A and Server B
    console.log('\n▶ Firing simultaneous cross-process application submissions...');
    const [resA, resB] = await Promise.all([
      sendPostRequest(portA, '/api/applications', submissionPayload, studentToken),
      sendPostRequest(portB, '/api/applications', submissionPayload, studentToken),
    ]);

    console.log(`   Response Server A (Port ${portA}): HTTP ${resA.statusCode}`);
    console.log(`   Response Server B (Port ${portB}): HTTP ${resB.statusCode}`);

    const statuses = [resA.statusCode, resB.statusCode];
    const successCount = statuses.filter((s) => s === 200 || s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    assert.strictEqual(successCount, 1, `Expected exactly 1 success (200/201), got ${successCount}`);
    assert.strictEqual(conflictCount, 1, `Expected exactly 1 conflict (409), got ${conflictCount}`);
    recordPass('Two-process concurrency test: Exactly ONE submission succeeded (200/201), exactly ONE rejected (409 Conflict)');

    // 4. Verify in MongoDB collection 'applications'
    const storedCount = await db.collection('applications').countDocuments({
      $or: [
        { scholarship_id: scholarship.id, student_id: studentUser.id },
        { scholarshipId: scholarship.id, studentId: studentUser.id },
      ],
    });
    assert.strictEqual(storedCount, 1, `Database must contain strictly 1 application record, found ${storedCount}`);
    recordPass('Authoritative database constraint: Exactly 1 record exists in collection "applications"');

    // 5. Test direct insertion of duplicate key into MongoDB
    console.log('\n▶ Testing direct duplicate key insertion rejection at database layer...');
    let dbRejected = false;
    try {
      await db.collection('applications').insertOne({
        id: 9999901,
        _id: 9999901,
        scholarship_id: scholarship.id,
        student_id: studentUser.id,
        status: 'pending',
      });
    } catch (dbErr) {
      if (dbErr.code === 11000 || (dbErr.message && dbErr.message.includes('E11000'))) {
        dbRejected = true;
      }
    }
    assert.strictEqual(dbRejected, true, 'Database must reject duplicate key with code 11000');
    recordPass('Database engine directly rejected duplicate insertion with E11000 duplicate key error');

    // 6. Test Fail-Closed behavior when duplicates exist (Directive 4)
    console.log('\n▶ Testing Directive 4: Fail-closed when unique index cannot be created due to duplicates...');
    await db.collection('applications').deleteMany({ id: { $in: [9999901, 9999911, 9999912] } }).catch(() => {});
    const duplicateStudent = generateTestUser('student', { name: 'Dup Student' });
    const baseId = Date.now() + Math.floor(Math.random() * 10000);
    const dupApp1 = {
      id: baseId,
      scholarship_id: 8888801,
      student_id: duplicateStudent.id,
      status: 'pending',
    };
    const dupApp2 = {
      id: baseId + 1,
      scholarship_id: 8888801,
      student_id: duplicateStudent.id,
      status: 'pending',
    };

    // Temporarily drop compound indexes to allow inserting duplicate pair
    await db.collection('applications').dropIndex('idx_applications_scholar_student').catch(() => {});
    await db.collection('applications').dropIndex('scholarship_id_1_student_id_1').catch(() => {});
    await db.collection('applications').dropIndex('scholarshipId_1_studentId_1').catch(() => {});
    await db.collection('applications').insertMany([dupApp1, dupApp2]);

    let threwMandatoryError = false;
    let caughtError = null;
    const { ensureIndexes: freshEnsureIndexes, MandatoryUniqueIndexError } = require('../src/utils/ensureIndexes');
    try {
      await freshEnsureIndexes(mongoose);
    } catch (err) {
      caughtError = err;
      if (err instanceof MandatoryUniqueIndexError || err.name === 'MandatoryUniqueIndexError') {
        threwMandatoryError = true;
      }
    }

    assert.strictEqual(threwMandatoryError, true, `ensureIndexes must throw typed MandatoryUniqueIndexError when duplicates exist (caught: ${caughtError?.message})`);
    recordPass('Fail-closed verified: ensureIndexes throws typed MandatoryUniqueIndexError on duplicate groups');

    // Verify readiness gate in the process where uniqueness is blocked
    const { readinessHandler } = require('../src/utils/healthCheck');
    let readinessStatusCode = 200;
    let readinessBody = null;
    const mockRes = {
      status(code) {
        readinessStatusCode = code;
        return this;
      },
      json(data) {
        readinessBody = data;
        return this;
      },
    };
    await readinessHandler({}, mockRes);
    assert.strictEqual(readinessStatusCode, 503, 'Readiness probe must return 503 when uniqueness is blocked');
    assert.strictEqual(readinessBody?.status, 'not_ready', 'Readiness body must report status="not_ready"');
    assert.strictEqual(readinessBody?.checks?.uniquenessEnforced?.status, 'unready', 'checks.uniquenessEnforced.status must be "unready"');
    recordPass('Readiness gate verified: readiness probe returns HTTP 503 (not_ready) with uniquenessEnforced=unready while uniqueness is blocked');

    // Clean up temporary duplicates and re-enforce index
    await db.collection('applications').deleteMany({ id: { $in: [dupApp1.id, dupApp2.id] } });
    await freshEnsureIndexes(mongoose);
    recordPass('Cleaned up duplicates and re-enforced mandatory indexes');

  } catch (err) {
    recordFail('Concurrency & Unique Index Suite Error', err);
  } finally {
    console.log('\n▶ Shutting down child server processes...');
    for (const child of children) {
      try { child.kill('SIGTERM'); } catch (_) {}
    }
    await client.close().catch(() => {});
    await scopedCleanup().catch(() => {});
  }

  console.log('\n================================================================');
  console.log(`🎓 CONCURRENCY & UNIQUE INDEX SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
