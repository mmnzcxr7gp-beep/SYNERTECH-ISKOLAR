const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Directive 1: Never load production .env in test scripts.
// Only load .env.test if explicitly present.
const testEnvPath = path.join(__dirname, '../.env.test');
if (fs.existsSync(testEnvPath)) {
  require('dotenv').config({ path: testEnvPath });
}

const ALLOWED_TEST_DATABASES = ['iskolar_isolated_test', 'iskolar_test'];

function resolveIsolatedTestUri() {
  let resolvedUri = '';
  if (process.env.TEST_MONGO_URI && process.env.TEST_MONGO_URI.trim()) {
    resolvedUri = process.env.TEST_MONGO_URI.trim();
  } else if (process.env.MONGO_TEST_URI && process.env.MONGO_TEST_URI.trim()) {
    resolvedUri = process.env.MONGO_TEST_URI.trim();
  } else {
    // Prohibit unchecked replacements on production MONGO_URI.
    // Default to a strictly isolated local test database URI:
    resolvedUri = 'mongodb://127.0.0.1:27017/iskolar_isolated_test';
  }

  // Strictly enforce that the resolved database is explicitly allowlisted
  let dbName = '';
  try {
    const parsed = new URL(resolvedUri);
    dbName = (parsed.pathname || '').replace(/^\//, '').toLowerCase();
  } catch (_) {
    const match = resolvedUri.match(/\/([a-zA-Z0-9_\-]+)(\?|$)/);
    dbName = match ? match[1].toLowerCase() : '';
  }

  const isAllowlisted = ALLOWED_TEST_DATABASES.includes(dbName) ||
    (dbName.endsWith('isolated_test') && !dbName.includes('prod') && dbName !== 'iskolar');

  if (!isAllowlisted) {
    throw new Error(
      `CRITICAL SECURITY ISOLATION VIOLATION: Target test database "${dbName}" is not explicitly allowlisted (${ALLOWED_TEST_DATABASES.join(', ')}). Refusing test execution.`
    );
  }

  return resolvedUri;
}

const TEST_URI = resolveIsolatedTestUri();
process.env.TEST_MONGO_URI = TEST_URI;
process.env.MONGO_URI = TEST_URI;
process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.ALLOW_TEST_OVERRIDE = 'true';
process.env.STORAGE_DRIVER = 'local';
process.env.N8N_DISABLED = 'true';

// Directive 6: Outbound network call blocker in test environment
const https = require('https');
function installOutboundNetworkBlocker() {
  const isLocalHost = (host) => {
    if (!host) return true;
    const h = String(host).toLowerCase().split(':')[0];
    return h === '127.0.0.1' || h === 'localhost' || h === '::1';
  };

  const origHttpRequest = http.request;
  http.request = function (urlOrOptions, options, callback) {
    let targetHost = '127.0.0.1';
    if (typeof urlOrOptions === 'string') {
      try { targetHost = new URL(urlOrOptions).hostname; } catch (_) {}
    } else if (urlOrOptions && (urlOrOptions.hostname || urlOrOptions.host)) {
      targetHost = urlOrOptions.hostname || urlOrOptions.host;
    }
    if (!isLocalHost(targetHost)) {
      throw new Error(`CRITICAL TEST ISOLATION ERROR: Outbound HTTP network call to "${targetHost}" is blocked in tests.`);
    }
    return origHttpRequest.apply(this, arguments);
  };

  const origHttpsRequest = https.request;
  https.request = function (urlOrOptions, options, callback) {
    let targetHost = '127.0.0.1';
    if (typeof urlOrOptions === 'string') {
      try { targetHost = new URL(urlOrOptions).hostname; } catch (_) {}
    } else if (urlOrOptions && (urlOrOptions.hostname || urlOrOptions.host)) {
      targetHost = urlOrOptions.hostname || urlOrOptions.host;
    }
    if (!isLocalHost(targetHost)) {
      throw new Error(`CRITICAL TEST ISOLATION ERROR: Outbound HTTPS network call to "${targetHost}" is blocked in tests.`);
    }
    return origHttpsRequest.apply(this, arguments);
  };
}
installOutboundNetworkBlocker();

const testRunId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb } = require('../src/config/db');

function assertDatabaseIsolation(client, mongooseConn) {
  let nativeDbName = null;
  if (client) {
    nativeDbName = typeof client.db === 'function' ? client.db().databaseName : null;
  }
  let mongooseDbName = null;
  if (mongooseConn) {
    mongooseDbName = mongooseConn.name || (mongooseConn.db ? mongooseConn.db.databaseName : null);
  }

  const check = (name, type) => {
    if (!name) return;
    const isAllowlisted = ALLOWED_TEST_DATABASES.includes(name.toLowerCase()) ||
      (name.toLowerCase().endsWith('isolated_test') && !name.toLowerCase().includes('prod') && name.toLowerCase() !== 'iskolar');
    if (!isAllowlisted) {
      throw new Error(`CRITICAL SECURITY VIOLATION: ${type} resolved to non-allowlisted database "${name}". Aborting immediately.`);
    }
  };

  check(nativeDbName, 'Native MongoDB');
  check(mongooseDbName, 'Mongoose connection');
}

// Track records created during test runs for scoped cleanup
const runTracker = {
  userIds: new Set(),
  emails: new Set(),
  scholarshipIds: new Set(),
  applicationIds: new Set(),
  documentIds: new Set(),
};

function generateTestUser(role = 'student', overrides = {}) {
  // Use unique high IDs that will never conflict with seed IDs (1, 2, 101-105, 201-205)
  const id = 9000000 + Math.floor(Math.random() * 900000) + Math.floor(Date.now() % 100000);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const email = `test.${role}.${Date.now()}.${randomSuffix}@iskolar.test`;
  const rawPassword = `TestPass#2026_${randomSuffix}!`;
  const hashedPassword = bcrypt.hashSync(rawPassword, 10);
  const now = new Date().toISOString();

  runTracker.userIds.add(id);
  runTracker.emails.add(email);

  const baseUser = {
    id,
    _id: id,
    name: overrides.name || `Test ${role.toUpperCase()} ${randomSuffix}`,
    email,
    password: hashedPassword,
    rawPassword,
    role,
    created_at: now,
    emailVerified: true,
    verificationStatus: 'verified',
    sponsor_verified: role === 'sponsor' || role === 'provider',
    organization_verified: role === 'sponsor' || role === 'provider',
    isVerified: true,
    accountStatus: 'ACTIVE',
    isSuspended: false,
    isDeleted: false,
    privacyPolicyAccepted: true,
    privacyPolicyAcceptedAt: now,
    testRunId: overrides.testRunId || testRunId,
    ...overrides,
  };

  return baseUser;
}

function generateTestScholarship(providerId, overrides = {}) {
  const id = 8000000 + Math.floor(Math.random() * 900000) + Math.floor(Date.now() % 100000);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  runTracker.scholarshipIds.add(id);

  return {
    id,
    _id: id,
    sponsor_id: providerId,
    provider_id: providerId,
    providerId,
    testRunId: overrides.testRunId || testRunId,
    organization_name: overrides.organization_name || `Test Foundation ${randomSuffix}`,
    title: overrides.title || `Test Grant ${randomSuffix} 2026`,
    description: 'Isolated test scholarship opportunity grant.',
    type: 'Academic Grant',
    benefits: 'Full Tuition Subsidy + Monthly Allowance',
    eligibilityRequirements: 'Enrolled student with GWA 1.75 or higher.',
    requirements: ['Certificate of Enrollment (COE)', 'Valid School ID'],
    slots: overrides.slots !== undefined ? overrides.slots : 10,
    totalSlots: overrides.totalSlots !== undefined ? overrides.totalSlots : 10,
    approved_count: 0,
    allowance: 5000,
    maxAmount: 50000,
    deadline: '2026-12-31',
    applicationDeadline: '2026-12-31',
    hasExam: false,
    hasInterview: false,
    selectionStages: ['1. Review', '2. Awarding'],
    criteria_json: JSON.stringify({ gpa: 50, financialNeed: 50 }),
    status: 'open',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

async function scopedCleanup(client, mongooseConn) {
  const cli = client || db.client;
  const mg = mongooseConn || require('mongoose').connection;
  assertDatabaseIsolation(cli, mg);

  const nativeDb = cli?.db ? (typeof cli.db === 'function' ? cli.db() : cli.db) : null;
  if (!nativeDb) return;

  // Directive 6: Restrict cleanup strictly to records tagged with the current testRunId or tracked run IDs
  const userFilters = [];
  if (runTracker.userIds.size > 0) {
    userFilters.push({ id: { $in: Array.from(runTracker.userIds) } });
    userFilters.push({ _id: { $in: Array.from(runTracker.userIds) } });
  }
  if (runTracker.emails.size > 0) {
    userFilters.push({ email: { $in: Array.from(runTracker.emails) } });
  }
  userFilters.push({ testRunId });

  await nativeDb.collection('users').deleteMany({ $or: userFilters }).catch(() => {});
  await nativeDb.collection('student_profiles').deleteMany({
    $or: [
      ...(runTracker.userIds.size > 0 ? [{ user_id: { $in: Array.from(runTracker.userIds) } }] : []),
      ...(runTracker.emails.size > 0 ? [{ email: { $in: Array.from(runTracker.emails) } }] : []),
      { testRunId },
    ],
  }).catch(() => {});

  if (runTracker.scholarshipIds.size > 0) {
    await nativeDb.collection('scholarships').deleteMany({
      $or: [
        { id: { $in: Array.from(runTracker.scholarshipIds) } },
        { testRunId },
      ],
    }).catch(() => {});
  }

  if (runTracker.applicationIds.size > 0 || runTracker.userIds.size > 0) {
    await nativeDb.collection('applications').deleteMany({
      $or: [
        ...(runTracker.applicationIds.size > 0 ? [{ id: { $in: Array.from(runTracker.applicationIds) } }] : []),
        ...(runTracker.userIds.size > 0 ? [{ student_id: { $in: Array.from(runTracker.userIds) } }] : []),
        ...(runTracker.userIds.size > 0 ? [{ studentId: { $in: Array.from(runTracker.userIds) } }] : []),
        { testRunId },
      ],
    }).catch(() => {});
  }

  // Clear in-memory run tracker
  runTracker.userIds.clear();
  runTracker.emails.clear();
  runTracker.scholarshipIds.clear();
  runTracker.applicationIds.clear();
  runTracker.documentIds.clear();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name || user.email },
    TEST_JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function request(port, method, reqPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://127.0.0.1:${port}${reqPath}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, statusCode: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
          } catch (_) {
            resolve({ status: res.statusCode, statusCode: res.statusCode, headers: res.headers, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function startTestServer() {
  await connectDb();
  assertDatabaseIsolation(db.client, require('mongoose').connection);
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    jwtSecret: TEST_JWT_SECRET,
    db,
    server,
    close: () => new Promise((res) => server.close(res)),
    request: (method, reqPath, body, token) => request(port, method, reqPath, body, token),
  };
}

module.exports = {
  startTestServer,
  signToken,
  request,
  db,
  TEST_JWT_SECRET,
  TEST_URI,
  ALLOWED_TEST_DATABASES,
  assertDatabaseIsolation,
  generateTestUser,
  generateTestScholarship,
  scopedCleanup,
  testRunId,
  runTracker,
};
