#!/usr/bin/env node
/**
 * ISKOLAR Restart-Persistence Verification
 * 1. Create a unique test user + application via API
 * 2. Confirm records exist
 * 3. Signal for backend restart
 * 4. After restart, retrieve the same records
 * 5. Confirm they survived
 * 6. Cleanup
 */

const http = require('http');
const BASE = 'http://localhost:4000';
const TS = Date.now();
const TEST_EMAIL = `persist.test.${TS}@test.iskolar.ph`;
const TEST_PASS = 'PersistPass123!';

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed; try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const phase = process.argv[2]; // 'create' or 'verify'

(async () => {
  if (phase === 'create') {
    console.log('═══ PHASE 1: CREATE RECORDS ═══');
    
    // Register
    const reg = await request('POST', '/api/auth/register', {
      name: 'Persist Test Student', email: TEST_EMAIL,
      password: TEST_PASS, role: 'student', privacyPolicyAccepted: true,
    });
    console.log(`Register: ${reg.status}`);
    if (reg.status !== 200) { console.log('FAIL: registration', JSON.stringify(reg.body).slice(0,200)); process.exit(1); }
    
    const token = reg.body.token;
    const userId = reg.body.user.id;
    console.log(`User ID: ${userId}`);

    // Login to confirm
    const login = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL, password: TEST_PASS, skipMfa: true
    });
    console.log(`Login: ${login.status}`);

    // Get scholarships and apply
    const schs = await request('GET', '/api/scholarships');
    const scholarships = schs.body?.scholarships || schs.body || [];
    if (scholarships.length > 0) {
      const schId = scholarships[0].id;
      const app = await request('POST', '/api/applications/submit', {
        scholarship_id: schId,
      }, { Authorization: `Bearer ${token}` });
      console.log(`Application submit: ${app.status}`);
      if (app.status === 200 || app.status === 201) {
        const appId = app.body?.application?.id || app.body?.id;
        console.log(`Application ID: ${appId}`);
      }
    }

    // Profile update
    const prof = await request('PUT', '/api/auth/me', {
      name: 'Persist Test Student Updated', phone: '09999999999',
    }, { Authorization: `Bearer ${token}` });
    console.log(`Profile update: ${prof.status}`);

    // Write state file for phase 2
    const fs = require('fs');
    fs.writeFileSync('/tmp/iskolar_persist_test.json', JSON.stringify({
      email: TEST_EMAIL, password: TEST_PASS, userId, token
    }));
    console.log('State saved. Ready for backend restart.');
    
  } else if (phase === 'verify') {
    console.log('═══ PHASE 2: VERIFY AFTER RESTART ═══');
    
    const fs = require('fs');
    const state = JSON.parse(fs.readFileSync('/tmp/iskolar_persist_test.json', 'utf8'));
    
    // Login with the same credentials
    const login = await request('POST', '/api/auth/login', {
      email: state.email, password: state.password, skipMfa: true
    });
    console.log(`Login after restart: ${login.status}`);
    
    if (login.status !== 200) {
      console.log('FAIL: User did not persist across restart');
      console.log(JSON.stringify(login.body).slice(0, 300));
      process.exit(1);
    }

    const token = login.body.token;
    const user = login.body.user;
    console.log(`User ID after restart: ${user.id}`);
    console.log(`User name: ${user.name}`);
    console.log(`User email: ${user.email}`);
    
    // Verify profile update persisted
    const me = await request('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
    console.log(`Profile GET: ${me.status}`);
    const persistedName = me.body?.user?.name;
    console.log(`Persisted name: ${persistedName}`);
    
    if (persistedName === 'Persist Test Student Updated') {
      console.log('✓ Profile update PERSISTED across restart');
    } else {
      console.log('✗ Profile update DID NOT persist');
    }
    
    // Verify applications
    const apps = await request('GET', '/api/applications', null, { Authorization: `Bearer ${token}` });
    console.log(`Applications GET: ${apps.status}`);
    const appList = apps.body || [];
    console.log(`Applications count: ${appList.length}`);
    if (appList.length > 0) {
      console.log('✓ Applications PERSISTED across restart');
      console.log(`First app status: ${appList[0].status}`);
    }

    // Verify scholarships still exist
    const schs = await request('GET', '/api/scholarships');
    const scholarships = schs.body?.scholarships || schs.body || [];
    console.log(`Scholarships count: ${scholarships.length}`);
    if (scholarships.length >= 20) {
      console.log('✓ Scholarships PERSISTED across restart');
    }

    console.log('═══ PERSISTENCE VERIFICATION COMPLETE ═══');
    
    // Cleanup temp file
    try { fs.unlinkSync('/tmp/iskolar_persist_test.json'); } catch {}
    
  } else {
    console.log('Usage: node restart_persistence_test.js [create|verify]');
    process.exit(1);
  }
})().catch(err => { console.error('FATAL:', err); process.exit(2); });
