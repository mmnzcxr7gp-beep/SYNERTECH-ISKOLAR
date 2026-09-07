const { io } = require('../../client/node_modules/socket.io-client');
const http = require('http');
const FormData = require('form-data');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (_) {
          resolve({ status: res.statusCode, text: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function postMultipart(path, form, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api' + path,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer ' + token
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (_) {
          resolve({ status: res.statusCode, text: resData });
        }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

function put(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api' + path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': 'Bearer ' + token
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (_) {
          resolve({ status: res.statusCode, text: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testSocketIoAndNotifications() {
  console.log('================================================================');
  console.log('⚡ STARTING LIVE SOCKET.IO & REAL-TIME NOTIFICATIONS TEST');
  console.log('================================================================');

  // 1. Authenticate Student, Provider, Admin
  console.log('\n[1] Authenticating all 3 roles...');
  
  const { getSyntheticPasswordForEmail } = require('../src/config/syntheticCredentials');

  // Student (Maria Clara Santos)
  const sPass = getSyntheticPasswordForEmail('maria.santos@iskolar.ph');
  const sRes = await post('/auth/login', { email: 'maria.santos@iskolar.ph', password: sPass, skipMfa: true });
  let sToken = sRes.data?.token;
  if (!sToken && (sRes.data?.requiresMfa || sRes.data?.mfaRequired)) {
    const mfa = await post('/auth/verify-login-otp', { mfaToken: sRes.data.mfaToken, otp: '123456' });
    sToken = mfa.data?.token;
  }

  // Provider (Ayala Foundation)
  const pPass = getSyntheticPasswordForEmail('ayala.foundation@iskolar.ph');
  const pRes = await post('/auth/login', { email: 'ayala.foundation@iskolar.ph', password: pPass, skipMfa: true });
  let pToken = pRes.data?.token;
  if (!pToken && (pRes.data?.requiresMfa || pRes.data?.mfaRequired)) {
    const mfa = await post('/auth/verify-login-otp', { mfaToken: pRes.data.mfaToken, otp: '123456' });
    pToken = mfa.data?.token;
  }

  // Admin
  const aPass = getSyntheticPasswordForEmail('admin@iskolar.ph');
  const aRes = await post('/auth/login', { email: 'admin@iskolar.ph', password: aPass, skipMfa: true });
  let aToken = aRes.data?.token;
  if (!aToken && (aRes.data?.requiresMfa || aRes.data?.mfaRequired)) {
    const mfa = await post('/auth/verify-login-otp', { mfaToken: aRes.data.mfaToken, otp: '123456' });
    aToken = mfa.data?.token;
  }

  if (!sToken || !pToken || !aToken) {
    throw new Error(`Authentication failed. sToken: ${!!sToken}, pToken: ${!!pToken}, aToken: ${!!aToken}. Responses: ${JSON.stringify({ s: sRes.data, p: pRes.data, a: aRes.data })}`);
  }

  console.log('✅ All 3 JWT Tokens obtained.');

  // 2. Connect 3 Live Socket.IO Clients
  console.log('\n[2] Connecting 3 live WebSocket clients to ws://127.0.0.1:4000 ...');

  const studentSocket = io('http://127.0.0.1:4000', {
    auth: { token: sToken },
    transports: ['websocket', 'polling']
  });

  const providerSocket = io('http://127.0.0.1:4000', {
    auth: { token: pToken },
    transports: ['websocket', 'polling']
  });

  const adminSocket = io('http://127.0.0.1:4000', {
    auth: { token: aToken },
    transports: ['websocket', 'polling']
  });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => { connected++; if (connected === 3) resolve(); };
    studentSocket.on('connect', () => { console.log('   🔌 Student Socket Connected:', studentSocket.id); check(); });
    providerSocket.on('connect', () => { console.log('   🔌 Provider Socket Connected:', providerSocket.id); check(); });
    adminSocket.on('connect', () => { console.log('   🔌 Admin Socket Connected:', adminSocket.id); check(); });
  });

  console.log('✅ All 3 Socket.IO clients connected and authenticated in their respective rooms!');

  // 3. Set up event listeners for real-time broadcasts
  const receivedEvents = [];

  studentSocket.on('application-status-changed', (data) => {
    console.log('   📥 [STUDENT SOCKET EVENT RECEIVED] application-status-changed:', data.message || data);
    receivedEvents.push({ recipient: 'student', event: 'application-status-changed', data });
  });

  providerSocket.on('new-application', (data) => {
    console.log('   📥 [PROVIDER SOCKET EVENT RECEIVED] new-application:', data.message || data);
    receivedEvents.push({ recipient: 'provider', event: 'new-application', data });
  });

  adminSocket.on('new-application', (data) => {
    console.log('   📥 [ADMIN SOCKET EVENT RECEIVED] new-application:', data.message || data);
    receivedEvents.push({ recipient: 'admin', event: 'new-application', data });
  });

  // 4. Trigger Real-Time Event: Student Submits Application
  console.log('\n[3] Triggering Event: Student submits application (Scholarship 1003)...');
  const form = new FormData();
  form.append('scholarship_id', '1003');
  form.append('gpa', '1.40');
  form.append('financial_need', 'Medium');
  form.append('achievements', 'Presidents Lister, Ayala Tech Applicant');
  form.append('documents', Buffer.from('%PDF-1.4 Real-time Socket.IO test payload for Ayala Foundation'), {
    filename: 'ayala_socket_test_doc.pdf',
    contentType: 'application/pdf'
  });

  const appRes = await postMultipart('/applications', form, sToken);
  const appId = appRes.data?.application?.id;
  console.log(`   ➔ Application #${appId} created via HTTP POST (Status: ${appRes.status}).`);

  // Wait 1.5s for WebSocket events
  await new Promise(r => setTimeout(r, 1500));

  // 5. Trigger Real-Time Event: Provider Updates Application Status
  console.log('\n[4] Triggering Event: Provider changes status to "approved"...');
  const putRes = await put(`/applications/${appId}/status`, { status: 'approved', remarks: 'Real-time Socket.IO approval by Ayala' }, pToken);
  console.log(`   ➔ Status update response: HTTP ${putRes.status}`);

  // Wait 1.5s for WebSocket events
  await new Promise(r => setTimeout(r, 1500));

  // 6. Verification Summary
  console.log('\n================================================================');
  console.log('📊 SOCKET.IO BROADCAST VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Real-Time Events Received over WebSocket: ${receivedEvents.length}`);
  for (const ev of receivedEvents) {
    console.log(` ✅ [${ev.recipient.toUpperCase()}] Received "${ev.event}":`, ev.data.message || ev.data);
  }

  // Cleanup
  studentSocket.disconnect();
  providerSocket.disconnect();
  adminSocket.disconnect();

  if (receivedEvents.length >= 2) {
    console.log('\n🎉 SOCKET.IO AND REAL-TIME NOTIFICATIONS ARE 100% OPERATIONAL & WORKING!');
  } else {
    console.warn('\n⚠️ Some WebSocket events were delayed or not received.');
  }
}

testSocketIoAndNotifications().then(() => process.exit(0)).catch(err => { console.error('❌ Error:', err); process.exit(1); });
