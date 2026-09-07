const { performance } = require('perf_hooks');
const assert = require('assert');
const bcrypt = require('bcrypt');
const { startTestServer, signToken, db } = require('./testHelper');

async function benchmark() {
  console.log('================================================================');
  console.log('⚡ RUNNING ISKOLAR 2.0 EXHAUSTIVE PERFORMANCE BENCHMARK SUITE');
  console.log('================================================================\n');

  const env = await startTestServer();
  const results = {};

  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = { id: 20001, email: 'perf.admin@iskolar.test', role: 'admin', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false, password: passwordHash };
    const provider = { id: 20002, email: 'perf.prov@iskolar.test', role: 'provider', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false, password: passwordHash, sponsor_verified: true };
    const student = { id: 20003, email: 'perf.stud@iskolar.test', role: 'student', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false, password: passwordHash, isVerified: true, student_verified: true };

    await db.read();
    db.data.users = (db.data.users || []).filter(u => ![20001, 20002, 20003].includes(u.id));
    db.data.users.push(admin, provider, student);

    // Seed synthetic scholarships if empty
    if (!db.data.scholarships || db.data.scholarships.length < 5) {
      if (!db.data.scholarships) db.data.scholarships = [];
      for (let i = 1; i <= 20; i++) {
        db.data.scholarships.push({
          id: 30000 + i,
          title: `Synthetic Grant ${i}`,
          description: `Performance benchmark scholarship #${i}`,
          amount: 50000,
          sponsor_id: provider.id,
          status: 'ACTIVE',
          deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
      }
    }
    await db.write();

    const adminToken = signToken(admin);
    const providerToken = signToken(provider);
    const studentToken = signToken(student);

    async function measure(name, fn, iterations = 10) {
      const times = [];
      let payloadSize = 0;
      let lastRes = null;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        lastRes = await fn();
        const duration = performance.now() - start;
        times.push(duration);
        if (i === 0 && lastRes) {
          payloadSize = Buffer.byteLength(JSON.stringify(lastRes.body || ''));
        }
      }
      times.sort((a, b) => a - b);
      const avg = times.reduce((s, t) => s + t, 0) / times.length;
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      const min = times[0];
      const max = times[times.length - 1];

      results[name] = { avg, p50, p95, min, max, payloadSize, statusCode: lastRes?.status };
      console.log(`  ⏱️  ${name.padEnd(35)} | p50: ${p50.toFixed(2)}ms | p95: ${p95.toFixed(2)}ms | avg: ${avg.toFixed(2)}ms | payload: ${payloadSize} B | status: ${lastRes?.status}`);
      return lastRes;
    }

    console.log('--- 1. Backend Endpoint Response Timings ---');
    // 1. Health endpoint
    await measure('GET /api/health', () => env.request('GET', '/api/health', null, null));
    // 2. Health root
    await measure('GET /health', () => env.request('GET', '/health', null, null));
    // 3. User Login
    await measure('POST /api/auth/login', () => env.request('POST', '/api/auth/login', { email: 'perf.stud@iskolar.test', password: 'Password123!', skipMfa: true }));
    // 4. Authenticated Profile Me
    await measure('GET /api/auth/me', () => env.request('GET', '/api/auth/me', null, studentToken));
    // 5. Scholarships listing
    await measure('GET /api/scholarships (paginated)', () => env.request('GET', '/api/scholarships?page=1&limit=10', null, studentToken));
    // 6. Applications listing
    await measure('GET /api/applications (student)', () => env.request('GET', '/api/applications', null, studentToken));
    // 7. Notifications listing
    await measure('GET /api/notifications (recovery)', () => env.request('GET', '/api/notifications', null, studentToken));
    // 8. Admin Accounts list
    await measure('GET /api/admin/accounts (admin)', () => env.request('GET', '/api/admin/accounts?page=1&limit=20', null, adminToken));
    // 9. Admin Account details
    await measure('GET /api/admin/accounts/:id (admin)', () => env.request('GET', `/api/admin/accounts/${student.id}`, null, adminToken));
    // 10. Admin Verification action
    await measure('PATCH /api/admin/accounts/:id/verify', () => env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Performance verify' }, adminToken), 5);

    console.log('\n--- 2. Synchronization & Persistence Timings ---');
    // Measure sync pipeline
    const syncStart = performance.now();
    const verRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Sync measure' }, adminToken);
    const dbTime = performance.now();
    assert.strictEqual(verRes.status, 200);

    const notifRes = await env.request('GET', '/api/notifications', null, studentToken);
    const notifTime = performance.now();
    assert.strictEqual(notifRes.status, 200);

    console.log(`  ⚡ Admin Action -> DB Update: ${(dbTime - syncStart).toFixed(2)}ms`);
    console.log(`  ⚡ DB Update -> Notification Recovery: ${(notifTime - dbTime).toFixed(2)}ms`);
    console.log(`  ⚡ Total End-to-End Sync Pipeline: ${(notifTime - syncStart).toFixed(2)}ms`);

  } finally {
    await env.close();
  }

  console.log('\n================================================================');
  console.log('✅ PERFORMANCE BENCHMARK COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  return results;
}

if (require.main === module) {
  benchmark().then(() => process.exit(0)).catch((err) => {
    console.error('❌ Benchmark error:', err);
    process.exit(1);
  });
}

module.exports = { benchmark };
