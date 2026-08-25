/**
 * ISKOLAR Automated Test Suite: Manual Resubmission & History Preservation
 * 
 * Tests:
 * 1. Provider requests resubmission with mandatory reason
 * 2. Student retrieves document review status and provider reason
 * 3. Student uploads replacement document file
 * 4. Original document metadata and previous versions are preserved
 * 5. Replacement transitions back to PENDING_MANUAL_REVIEW
 * 6. Audit history tracks the resubmission lifecycle
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

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

function makeJsonRequest(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://localhost:${port}${path}`,
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
            resolve({ statusCode: res.statusCode, body: JSON.parse(raw) });
          } catch (_) {
            resolve({ statusCode: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function makeMultipartUpload(port, urlPath, filePath, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const filename = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const payload = Buffer.concat([
      Buffer.from(header, 'utf8'),
      fileContent,
      Buffer.from(footer, 'utf8'),
    ]);

    const req = http.request(
      `http://localhost:${port}${urlPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length,
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
    req.write(payload);
    req.end();
  });
}

async function runManualResubmissionTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING MANUAL RESUBMISSION & HISTORY TESTS');
  console.log('🧪 ====================================================');

  await connectDb();
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const student = { id: 8201, email: `student.resub.${timestamp}@iskolar.ph`, role: 'student' };
  const provider = { id: 8202, email: `provider.resub.${timestamp}@iskolar.ph`, role: 'provider' };

  const studentToken = signToken(student);
  const providerToken = signToken(provider);

  // Seed provider in Mongo & memory
  const { Provider } = require('../src/models');
  if (Provider && mongoose.connection.readyState === 1) {
    await Provider.deleteMany({ userId: provider.id });
    await Provider.create({
      userId: provider.id,
      organizationName: 'Resubmission Review Foundation',
      isVerified: true,
      email: provider.email,
      contactNumber: '+639170003333',
      industry: 'Education',
      registrationNumber: `REG-RESUB-${timestamp}`,
    });
  }

  db.data.users.push(
    { id: student.id, email: student.email, role: 'student' },
    {
      id: provider.id,
      email: provider.email,
      role: 'provider',
      sponsor_verified: true,
      organization_verified: true,
      is_verified: true,
      organization_documents: ['proof.pdf'],
    }
  );

  const testScholarshipId = createId('scholarships');
  db.data.scholarships.push({
    id: testScholarshipId,
    sponsor_id: provider.id,
    provider_id: provider.id,
    title: 'Resubmission Lifecycle Scholarship',
  });

  const testAppId = createId('applications');
  db.data.applications.push({
    id: testAppId,
    scholarship_id: testScholarshipId,
    student_id: student.id,
    status: 'pending_manual_review',
  });

  const testDocId = createId('documents');
  const initialFilename = `original_doc_${timestamp}.pdf`;
  db.data.documents.push({
    id: testDocId,
    application_id: testAppId,
    user_id: student.id,
    filename: initialFilename,
    originalname: 'OriginalCertificate.pdf',
    size: 1024 * 200,
    mime_type: 'application/pdf',
    status: 'PENDING_MANUAL_REVIEW',
  });

  await db.write();

  // Create physical fixture for upload
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const replacementFixturePath = path.join(uploadsDir, `temp_replacement_fixture_${timestamp}.pdf`);
  fs.writeFileSync(replacementFixturePath, '%PDF-1.4 Clear Replacement Certificate Content');

  // Step 1: Provider requests resubmission
  await test('1. Provider requests resubmission with required feedback', async () => {
    const res = await makeJsonRequest(
      port,
      'POST',
      `/api/documents/${testDocId}/review-action`,
      { action: 'NEEDS_RESUBMISSION', reason: 'Document image is blurred and registrar seal is not visible.' },
      providerToken
    );
    assert.strictEqual(res.statusCode, 200);
  });

  // Step 2: Student retrieves document review data
  await test('2. Student fetches document review data and receives provider reason', async () => {
    const res = await makeJsonRequest(
      port,
      'GET',
      `/api/documents/${testDocId}/manual-review`,
      null,
      studentToken
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.reviewStatus, 'NEEDS_RESUBMISSION');
    assert.strictEqual(res.body.providerReason, 'Document image is blurred and registrar seal is not visible.');
    assert.strictEqual(res.body.studentNotice.headline, 'Manual Review Required');
  });

  // Step 3: Student uploads replacement document
  await test('3. Student uploads replacement document, preserving original version history', async () => {
    const res = await makeMultipartUpload(
      port,
      `/api/documents/${testDocId}/resubmit`,
      replacementFixturePath,
      studentToken
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'PENDING_MANUAL_REVIEW');

    const updatedDoc = db.data.documents.find((d) => String(d.id) === String(testDocId));
    assert.strictEqual(updatedDoc.status, 'PENDING_MANUAL_REVIEW');
    assert.strictEqual(updatedDoc.previous_versions.length, 1);
    assert.strictEqual(updatedDoc.previous_versions[0].filename, initialFilename);
    assert.strictEqual(updatedDoc.previous_versions[0].originalname, 'OriginalCertificate.pdf');
  });

  // Step 4: Provider views updated workspace with previous version history
  await test('4. Provider views updated review workspace showing replacement and previous versions', async () => {
    const res = await makeJsonRequest(
      port,
      'GET',
      `/api/documents/${testDocId}/manual-review`,
      null,
      providerToken
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert.strictEqual(res.body.previousVersions.length, 1);
    assert(res.body.history.length >= 2);
  });

  // Clean up fixture
  try {
    if (fs.existsSync(replacementFixturePath)) fs.unlinkSync(replacementFixturePath);
  } catch (_) {}

  server.close();

  console.log('🧪 ====================================================');
  console.log(`🧪 MANUAL RESUBMISSION TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runManualResubmissionTests().catch((e) => {
    console.error('Fatal Resubmission test error:', e);
    process.exit(1);
  });
}

module.exports = { runManualResubmissionTests };

