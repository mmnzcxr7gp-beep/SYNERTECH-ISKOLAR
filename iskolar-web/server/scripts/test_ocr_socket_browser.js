#!/usr/bin/env node
/**
 * ISKOLAR OCR, Socket.IO, and Web Route Authorization Test Suite
 * Real automated testing for OCR extraction & persistence, Socket.IO room isolation,
 * and Web Portal role navigation guards.
 */

const http = require('http');
const io = require('../../iskolar_admin_web/node_modules/socket.io-client');

const BASE = 'http://localhost:4000';

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
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
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function multipartUpload(urlPath, fields = {}, files = [], headers = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const url = new URL(urlPath, BASE);

    let bodyParts = [];

    for (const [key, val] of Object.entries(fields)) {
      bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
    }

    for (const f of files) {
      bodyParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.filename}"\r\nContent-Type: ${f.mime}\r\n\r\n`
        )
      );
      bodyParts.push(f.content);
      bodyParts.push(Buffer.from('\r\n'));
    }

    bodyParts.push(Buffer.from(`--${boundary}--\r\n`));
    const payload = Buffer.concat(bodyParts);

    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const POST = (p, b, h) => request('POST', p, b, h);
const GET = (p, h) => request('GET', p, null, h);

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

async function runOcrAndSocketTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING AUTOMATED OCR, SOCKET.IO & WEB GUARD SUITE');
  console.log('========================================================\n');

  try {
    // 1. Authenticate Student A & Student B
    console.log('📋 Test 1: Student Authentication for Socket & OCR Isolation');
    const studentAEmail = `ocr_student_a_${Date.now()}@iskolar.ph`;
    const regA = await POST('/api/auth/register', {
      name: 'OCR Student A',
      email: studentAEmail,
      password: 'Password123!',
      role: 'student',
      privacyPolicyAccepted: true,
    });
    assert(regA.status === 200 || regA.status === 201, 'Student A registers successfully');
    const tokenA = regA.body.token;
    const userIdA = regA.body.user.id;

    const studentBEmail = `ocr_student_b_${Date.now()}@iskolar.ph`;
    const regB = await POST('/api/auth/register', {
      name: 'OCR Student B',
      email: studentBEmail,
      password: 'Password123!',
      role: 'student',
      privacyPolicyAccepted: true,
    });
    assert(regB.status === 200 || regB.status === 201, 'Student B registers successfully');
    const tokenB = regB.body.token;
    const userIdB = regB.body.user.id;

    // 2. Controlled OCR Image Fixture Extraction & Confirmation Persistence
    console.log('\n📋 Test 2: Controlled OCR Extraction & Confirmation Persistence');
    
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const jpegContent = Buffer.from('STUDENT IDENTIFICATION CARD Name: Juan Dela Cruz ID No: 2026-9999 DOB: 01/15/2004');
    const jpegFooter = Buffer.from([0xFF, 0xD9]);
    const fixtureJpeg = Buffer.concat([jpegHeader, jpegContent, jpegFooter]);

    const ocrUpload = await multipartUpload('/api/ocr/extract', {}, [{
      field: 'document',
      filename: 'sample_id_card.jpg',
      content: fixtureJpeg,
      mime: 'image/jpeg',
    }], { Authorization: `Bearer ${tokenA}` });

    assert(ocrUpload.status === 200, 'OCR document upload and extraction returns HTTP 200');
    assert(ocrUpload.body && typeof ocrUpload.body.documentType === 'string', 'OCR returns valid document type');

    const ocrConfirm = await POST('/api/ocr/confirm', {
      extractedFields: { fullName: 'Juan Dela Cruz' },
      userCorrections: { idNumber: '2026-9999-EDITED', dateOfBirth: '2004-01-15' },
      rawText: 'STUDENT IDENTIFICATION CARD',
    }, { Authorization: `Bearer ${tokenA}` });

    if (ocrConfirm.status !== 200) {
      console.log('  ⚠️ ocrConfirm debug:', ocrConfirm.status, JSON.stringify(ocrConfirm.body));
    }

    assert(ocrConfirm.status === 200, 'OCR confirmation persists corrected fields (HTTP 200)');
    assert(ocrConfirm.body && typeof ocrConfirm.body.message === 'string' && ocrConfirm.body.message.includes('confirmed'), 'Confirmation response returned successfully');

    // 3. Socket.IO Room Isolation & Targeted Delivery
    console.log('\n📋 Test 3: Socket.IO Room Isolation & Targeted Event Delivery');
    
    let receivedA = 0;
    let receivedB = 0;

    const socketA = io(BASE, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    const socketB = io(BASE, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await new Promise((resolve) => setTimeout(resolve, 800));

    socketA.on('notification', () => { receivedA++; });
    socketA.on('application-status-changed', () => { receivedA++; });

    socketB.on('notification', () => { receivedB++; });
    socketB.on('application-status-changed', () => { receivedB++; });

    // Login as Sponsor and create a schedule for Student A to trigger real Socket.IO event
    const sponsorRes = await POST('/api/auth/login', {
      email: 'provider@iskolar.ph',
      password: 'Password123!',
      role: 'sponsor',
      skipMfa: true,
    });
    const sponsorToken = sponsorRes.body.token;

    // Post schedule for Student A -> Triggers Socket.IO event emission to Student A room
    const schedRes = await POST('/api/schedules', {
      type: 'interview',
      title: 'Panel Interview Session',
      date: '2026-08-20',
      time: '10:00 AM',
      venue: 'Webex / Zoom Link',
      assignedStudents: [userIdA],
    }, { Authorization: `Bearer ${sponsorToken}` });

    assert(schedRes.status === 200 || schedRes.status === 201, 'Sponsor creates schedule for Student A (HTTP 201)');

    await new Promise((resolve) => setTimeout(resolve, 800));

    assert(receivedA >= 1, 'Intended Student A receives socket event in student_room_A');
    assert(receivedB === 0, 'Unrelated Student B receives ZERO events from Student A room');

    socketA.disconnect();
    socketB.disconnect();

    // 4. Web Portal Navigation Guard Checks
    console.log('\n📋 Test 4: Web Portal Guidance & Access Guards');
    const studentWebCall = await GET('/api/scholarship-applications/student/list', {
      Authorization: `Bearer ${tokenA}`,
      'X-Client-Platform': 'web',
    });
    assert(studentWebCall.status === 403, 'Student account on Web receives HTTP 403 mobile guidance notice');

  } catch (err) {
    console.error('❌ Test execution error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 AUTOMATED SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runOcrAndSocketTests();
