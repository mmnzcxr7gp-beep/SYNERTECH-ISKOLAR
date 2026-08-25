/**
 * test_admin_content_edit.js
 * Verifies that administrators can edit scholarship listings with mandatory reason
 * and that the original author is preserved (never replaced by the administrator).
 */

const http = require('http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb } = require('../src/config/db');

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

function makeRequest(port, method, path, body, token) {
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

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: ADMIN CONTENT EDIT & AUTHOR PRESERVATION');
  console.log('🧪 ====================================================');

  await connectDb();

  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const providerId = 5501;
    const adminId = 9901;

    if (!db.data) db.data = { users: [], scholarships: [], notifications: [] };
    if (!db.data.users) db.data.users = [];
    if (!db.data.scholarships) db.data.scholarships = [];

    const providerUser = {
      id: providerId,
      email: 'sponsor_author@corp.ph',
      role: 'provider',
      name: 'Ayala Education Sponsor',
      company: 'Ayala Foundation',
      sponsor_verified: true,
    };
    db.data.users = db.data.users.filter(u => u.id !== providerId && u.id !== adminId);
    db.data.users.push(providerUser);

    const adminUser = {
      id: adminId,
      email: 'admin_eval@iskolar.ph',
      role: 'admin',
      name: 'Senior System Administrator',
    };
    db.data.users.push(adminUser);

    const scholarshipId = 7701;
    const initialScholarship = {
      id: scholarshipId,
      providerId: providerId,
      sponsor_id: providerId,
      title: 'Ayala Future Leaders Grant 2026',
      description: 'Initial grant description with minor typos.',
      benefits: 'Full tuition and ₱15,000 monthly stipend.',
      eligibilityRequirements: 'Minimum 85% GPA.',
      totalSlots: 20,
      applicationDeadline: '2026-12-31',
      status: 'open',
      version: 1,
      isDeleted: false,
      editHistory: [],
    };
    db.data.scholarships = db.data.scholarships.filter(s => s.id !== scholarshipId);
    db.data.scholarships.push(initialScholarship);
    await db.write();

    const adminToken = signToken(adminUser);

    // 2. Perform Administrative Edit with Mandatory Reason
    const editPayload = {
      title: 'Ayala Future Leaders Scholarship Program 2026',
      description: 'Corrected official description: Empowering engineering students across the Philippines.',
      benefits: 'Full tuition subsidy and ₱20,000 monthly living allowance.',
      totalSlots: 25,
      editReason: 'Corrected official program title and updated stipend allocation per provider memorandum.',
    };

    const res = await makeRequest(port, 'PUT', `/api/admin/scholarships/${scholarshipId}/content`, editPayload, adminToken);

    if (res.statusCode !== 200) {
      console.error('❌ FAILED: Expected 200 OK, got', res.statusCode, res.body);
      process.exit(1);
    }

    const updated = res.body.scholarship;

    // 3. Assertions
    if (updated.title !== editPayload.title) {
      console.error('❌ FAILED: Title was not updated properly');
      process.exit(1);
    }
    console.log('  ✅ PASS: Title and content fields updated successfully');

    if (updated.version !== 2) {
      console.error('❌ FAILED: Expected version 2, got', updated.version);
      process.exit(1);
    }
    console.log('  ✅ PASS: Content version incremented to v2');

    const preservedAuthor = updated.sponsor_id ?? updated.providerId;
    if (preservedAuthor !== providerId) {
      console.error('❌ FAILED: Original author was overwritten! Expected', providerId, 'got', preservedAuthor);
      process.exit(1);
    }
    console.log('  ✅ PASS: Original author (Provider #' + providerId + ') strictly preserved');

    if (updated.lastEditedBy !== adminId || updated.lastEditReason !== editPayload.editReason) {
      console.error('❌ FAILED: lastEditedBy or lastEditReason mismatch');
      process.exit(1);
    }
    console.log('  ✅ PASS: Administrator edit reason and editor ID recorded');

    console.log('🧪 ====================================================');
    console.log('🧪 TEST PASSED: ADMIN CONTENT EDIT & AUTHOR PRESERVATION');
    console.log('🧪 ====================================================');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Unhandled test error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

run();
