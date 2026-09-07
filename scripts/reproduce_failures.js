/**
 * Reproduction script to verify and record exact failures across the upload,
 * verification, and submission pipeline before applying any fixes.
 */

const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { buildApp } = require('../web/server/src/vercelApp');
const { connectDb, db, createId } = require('../web/server/src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'iskolar-dev-secret-key';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

async function runReproduction() {
  console.log('=== STARTING REPRODUCTION RUN ===');
  
  await connectDb();
  if (db.read) await db.read();

  const app = buildApp();
  const server = http.createServer(app);
  
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log('Test server listening on port', port);

  // Setup synthetic student in db
  const studentUser = {
    id: 101,
    name: 'Juan Dela Cruz',
    email: 'synthetic.student@iskolar.ph',
    role: 'student',
  };
  if (!db.data.users) db.data.users = [];
  if (!db.data.users.find(u => u.id === 101)) {
    db.data.users.push(studentUser);
  }
  if (!db.data.student_profiles) db.data.student_profiles = [];
  let profile = db.data.student_profiles.find(p => p.user_id === 101);
  if (!profile) {
    profile = {
      id: createId('student_profiles'),
      user_id: 101,
      name: 'Juan Dela Cruz',
      email: 'synthetic.student@iskolar.ph',
      school: 'Pamantasan ng Lungsod ng Maynila',
      course: 'BS Computer Science',
      gpa: 1.25,
      isVerified: true,
      verificationStatus: 'verified',
    };
    db.data.student_profiles.push(profile);
  } else {
    profile.isVerified = true;
    profile.verificationStatus = 'verified';
  }
  await db.write();

  const studentToken = createToken({
    id: 101,
    role: 'student',
    email: 'synthetic.student@iskolar.ph',
    name: 'Juan Dela Cruz',
  });

  // Find a scholarship in db.data.scholarships
  const scholarship = (db.data.scholarships || []).find(s => (s.status || '').toLowerCase() === 'open') || (db.data.scholarships || [])[0] || { id: 1, title: 'Sample Scholarship', requirements: ['Certificate of Grades', 'School ID'] };
  console.log('Using scholarship:', scholarship.id, scholarship.title, 'requirements:', scholarship.requirements);

  // Test 1: Multipart submission with requirement ID fields to /scholarship-applications/:id/submit
  console.log('\n--- Test 1: POST /scholarship-applications/:id/submit (Multer array vs object lookup) ---');
  const boundary = '----WebKitFormBoundaryRepro123';
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');
  
  const postData = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="req_1"; filename="cor.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    dummyPdf,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="req_2"; filename="id.png"\r\nContent-Type: image/png\r\n\r\n`),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  try {
    const res = await fetch(`${baseUrl}/scholarship-applications/${scholarship.id}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(postData.length),
      },
      body: postData,
    });
    
    const status = res.status;
    const body = await res.text();
    console.log('HTTP status:', status);
    console.log('Response body:', body);
  } catch (err) {
    console.error('Request failed:', err);
  }

  // Test 2: Double /api/api/ path issue from Flutter
  console.log('\n--- Test 2: Flutter double /api/api/ URL construction ---');
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/api/scholarship-applications/${scholarship.id}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
      },
    });
    console.log('HTTP status for /api/api/... :', res.status);
    console.log('Response body:', await res.text());
  } catch (err) {
    console.error('Request failed:', err);
  }

  // Test 3: Submitting to /applications/submit with file fields (file_0, file_1)
  console.log('\n--- Test 3: POST /applications/submit (Multer file_0, file_1) ---');
  const postDataApp = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scholarship_id"\r\n\r\n${scholarship.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="gpa"\r\n\r\n1.25\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_0"; filename="cor.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    dummyPdf,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="file_1"; filename="id.png"\r\nContent-Type: image/png\r\n\r\n`),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  try {
    const res = await fetch(`${baseUrl}/applications/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(postDataApp.length),
      },
      body: postDataApp,
    });
    
    const status = res.status;
    const body = await res.text();
    console.log('HTTP status for /applications/submit:', status);
    console.log('Response body:', body);
  } catch (err) {
    console.error('Request failed:', err);
  }

  server.close();
  console.log('\n=== REPRODUCTION RUN FINISHED ===');
  process.exit(0);
}

runReproduction().catch((err) => {
  console.error(err);
  process.exit(1);
});
