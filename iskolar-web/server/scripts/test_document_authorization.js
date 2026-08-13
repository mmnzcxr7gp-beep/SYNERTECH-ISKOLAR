const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// 1. Enforce NODE_ENV=test and explicit test-only JWT secret
process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb, createId } = require('../src/config/db');

function signToken(user, expiresIn = '1h') {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    TEST_JWT_SECRET,
    { expiresIn }
  );
}

async function testDocumentAuthorizationIsolated() {
  console.log('🧪 Starting Isolated Document Authorization Test (PHASE B Verification)...');
  await connectDb();

  const timestamp = Date.now();
  const tempDocFilename = `temp_test_doc_${timestamp}.pdf`;
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const tempFilePath = path.join(uploadsDir, tempDocFilename);

  // Create temporary physical file at runtime
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(tempFilePath, '%PDF-1.4 Temporary Isolated Test Document Payload');
  console.log(`✓ Created runtime test fixture: ${tempDocFilename}`);

  // Unique test IDs
  const ownerStudent = { id: 9801, email: `student.owner.${timestamp}@test.ph`, role: 'student' };
  const otherStudent = { id: 9802, email: `student.other.${timestamp}@test.ph`, role: 'student' };
  const ownerProvider = { id: 9803, email: `provider.owner.${timestamp}@test.ph`, role: 'provider' };
  const otherProvider = { id: 9804, email: `provider.other.${timestamp}@test.ph`, role: 'provider' };
  const adminUser = { id: 9805, email: `admin.${timestamp}@test.ph`, role: 'admin' };
  const guestUser = { id: 9806, email: `guest.${timestamp}@test.ph`, role: 'guest' };

  const tokenOwner = signToken(ownerStudent);
  const tokenOtherStudent = signToken(otherStudent);
  const tokenOwnerProvider = signToken(ownerProvider);
  const tokenOtherProvider = signToken(otherProvider);
  const tokenAdmin = signToken(adminUser);
  const tokenGuest = signToken(guestUser);
  const tokenExpired = signToken(ownerStudent, '-1s');
  const tokenInvalid = 'invalid.jwt.signature.payload';

  // Seed test scholarship
  const testScholarshipId = createId('scholarships');
  db.data.scholarships.push({
    id: testScholarshipId,
    sponsor_id: ownerProvider.id,
    provider_id: ownerProvider.id,
    title: 'Isolated Test Scholarship',
    status: 'open',
  });

  // Seed test application
  const testAppId = createId('applications');
  db.data.applications.push({
    id: testAppId,
    scholarship_id: testScholarshipId,
    student_id: ownerStudent.id,
    status: 'pending',
  });

  // Seed test document metadata
  const testDocId = createId('documents');
  db.data.documents.push({
    id: testDocId,
    application_id: testAppId,
    user_id: ownerStudent.id,
    requirement_name: 'Isolated ID Proof',
    filename: tempDocFilename,
    originalname: 'isolated_proof.pdf',
    mime_type: 'application/pdf',
  });

  // Seed metadata-only document (missing physical file on disk)
  const missingFileDocId = createId('documents');
  db.data.documents.push({
    id: missingFileDocId,
    application_id: testAppId,
    user_id: ownerStudent.id,
    requirement_name: 'Missing File Proof',
    filename: `missing_file_${timestamp}.pdf`,
    originalname: 'missing.pdf',
    mime_type: 'application/pdf',
  });

  await db.write();

  const app = buildApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✓ Test server running on port ${port} (NODE_ENV=test)`);

  const makeRequest = (urlPath, tokenHeader) => {
    return new Promise((resolve, reject) => {
      const headers = {};
      if (tokenHeader !== null) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }
      const req = http.get(`http://localhost:${port}${urlPath}`, { headers }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', reject);
    });
  };

  try {
    // 1. No token -> 401
    let res = await makeRequest(`/uploads/${tempDocFilename}`, null);
    assert.strictEqual(res.statusCode, 401, 'No token returns 401');
    console.log('✓ Case 1 (No token): 401');

    // 2. Invalid token -> 401
    res = await makeRequest(`/uploads/${tempDocFilename}`, tokenInvalid);
    assert.strictEqual(res.statusCode, 401, 'Invalid token returns 401');
    console.log('✓ Case 2 (Invalid token): 401');

    // 3. Expired token -> 401
    res = await makeRequest(`/uploads/${tempDocFilename}`, tokenExpired);
    assert.strictEqual(res.statusCode, 401, 'Expired token returns 401');
    console.log('✓ Case 3 (Expired token): 401');

    // 4. Owner student receives 200
    res = await makeRequest(`/api/documents/${testDocId}/download`, tokenOwner);
    assert.strictEqual(res.statusCode, 200, 'Owner student receives 200');
    console.log('✓ Case 4 (Owner student): 200');

    // 5. Unrelated student is denied (403)
    res = await makeRequest(`/api/documents/${testDocId}/download`, tokenOtherStudent);
    assert.strictEqual(res.statusCode, 403, 'Unrelated student is denied');
    console.log('✓ Case 5 (Unrelated student): 403');

    // 6. Assigned provider receives 200
    res = await makeRequest(`/api/documents/${testDocId}/download`, tokenOwnerProvider);
    assert.strictEqual(res.statusCode, 200, 'Assigned provider receives 200');
    console.log('✓ Case 6 (Assigned provider): 200');

    // 7. Unrelated provider is denied (403)
    res = await makeRequest(`/api/documents/${testDocId}/download`, tokenOtherProvider);
    assert.strictEqual(res.statusCode, 403, 'Unrelated provider is denied');
    console.log('✓ Case 7 (Unrelated provider): 403');

    // 8. Permitted administrator receives 200
    res = await makeRequest(`/api/documents/${testDocId}/download`, tokenAdmin);
    assert.strictEqual(res.statusCode, 200, 'Administrator receives 200');
    console.log('✓ Case 8 (Administrator): 200');

    // 9. Unsupported role is denied (403)
    res = await makeRequest(`/api/documents/${testDocId}/download`, tokenGuest);
    assert.strictEqual(res.statusCode, 403, 'Unsupported role is denied');
    console.log('✓ Case 9 (Unsupported role): 403');

    // 10. Physical file with no metadata is not accessible (404)
    res = await makeRequest('/api/documents/file/unregistered_physical_file.pdf', tokenOwner);
    assert.strictEqual(res.statusCode, 404, 'Unregistered physical file returns 404');
    console.log('✓ Case 10 (Unregistered file): 404');

    // 11. Metadata with missing file returns 404
    res = await makeRequest(`/api/documents/${missingFileDocId}/download`, tokenOwner);
    assert.strictEqual(res.statusCode, 404, 'Metadata with missing physical file returns 404');
    console.log('✓ Case 11 (Missing physical file): 404');

    // 12. Malformed ID is rejected safely (400)
    res = await makeRequest('/api/documents/invalid!id@specials/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Malformed ID rejected safely');
    console.log(`✓ Case 12 (Malformed ID): ${res.statusCode}`);

    // 13. Raw traversal rejected (400)
    res = await makeRequest('/api/documents/../package.json/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Raw traversal rejected');
    console.log(`✓ Case 13 (Raw traversal): ${res.statusCode}`);

    // 14. URL-encoded traversal rejected (400)
    res = await makeRequest('/api/documents/..%2fpackage.json/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'URL-encoded traversal rejected');
    console.log(`✓ Case 14 (URL-encoded traversal): ${res.statusCode}`);

    // 15. Double-encoded traversal rejected (400)
    res = await makeRequest('/api/documents/%252e%252e%252fpackage.json/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Double-encoded traversal rejected');
    console.log(`✓ Case 15 (Double-encoded traversal): ${res.statusCode}`);

    // 16. Backslash traversal rejected (400)
    res = await makeRequest('/api/documents/..\\..\\package.json/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Backslash traversal rejected');
    console.log(`✓ Case 16 (Backslash traversal): ${res.statusCode}`);

    // 17. Null-byte style input rejected (400)
    res = await makeRequest('/api/documents/test.pdf%00.png/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Null-byte input rejected');
    console.log(`✓ Case 17 (Null-byte input): ${res.statusCode}`);

    // 18. Absolute path input rejected (400)
    res = await makeRequest('/api/documents//etc/passwd/download', tokenOwner);
    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Absolute path input rejected');
    console.log(`✓ Case 18 (Absolute path input): ${res.statusCode}`);

    console.log('✅ ALL 18 ISOLATED DOCUMENT AUTHORIZATION CASES PASSED SUCCESSFULLY!');
  } finally {
    // 8 & 9. Cleanup runtime temp file and DB test records in finally block
    server.close();
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`✓ Cleaned up runtime temp file: ${tempDocFilename}`);
    }
    db.data.documents = (db.data.documents || []).filter((d) => d.id !== testDocId && d.id !== missingFileDocId);
    db.data.applications = (db.data.applications || []).filter((a) => a.id !== testAppId);
    db.data.scholarships = (db.data.scholarships || []).filter((s) => s.id !== testScholarshipId);
    await db.write();
    console.log('✓ Cleaned up test database records');
  }
}

testDocumentAuthorizationIsolated().catch((err) => {
  console.error('❌ ISOLATED DOCUMENT AUTHORIZATION TEST FAILED:', err);
  process.exit(1);
});
