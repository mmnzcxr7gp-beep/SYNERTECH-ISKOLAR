/**
 * test_admin_content_version_history.js
 * Verifies sequential version history recording and retrieval for administrative edits.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { db, connectDb } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: ADMIN CONTENT VERSION HISTORY');
  console.log('🧪 ====================================================');

  await connectDb();

  const providerId = 5502;
  const adminId = 9902;

  if (!db.data) db.data = { users: [], scholarships: [] };
  if (!db.data.users) db.data.users = [];
  if (!db.data.scholarships) db.data.scholarships = [];

  const adminUser = { id: adminId, email: 'admin_version@iskolar.ph', role: 'admin' };
  db.data.users = db.data.users.filter(u => u.id !== adminId);
  db.data.users.push(adminUser);

  const scholarshipId = 7702;
  const initialScholarship = {
    id: scholarshipId,
    providerId: providerId,
    sponsor_id: providerId,
    title: 'Versioned Engineering Grant',
    description: 'Version 1 content.',
    totalSlots: 10,
    version: 1,
    isDeleted: false,
    editHistory: [],
  };
  db.data.scholarships = db.data.scholarships.filter(s => s.id !== scholarshipId);
  db.data.scholarships.push(initialScholarship);
  await db.write();

  const adminToken = jwt.sign({ id: adminId, email: adminUser.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Edit #1 -> v2
  const edit1Res = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Versioned Engineering Grant (v2 Edited)',
      editReason: 'First administrative correction to description and criteria.',
    });

  if (edit1Res.status !== 200 || edit1Res.body.version !== 2) {
    console.error('❌ FAILED: Edit 1 failed', edit1Res.status, edit1Res.body);
    process.exit(1);
  }
  console.log('  ✅ PASS: Version 1 -> Version 2 transition verified');

  // 2. Edit #2 -> v3
  const edit2Res = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      totalSlots: 15,
      editReason: 'Second administrative update expanding available slots.',
    });

  if (edit2Res.status !== 200 || edit2Res.body.version !== 3) {
    console.error('❌ FAILED: Edit 2 failed', edit2Res.status, edit2Res.body);
    process.exit(1);
  }
  console.log('  ✅ PASS: Version 2 -> Version 3 transition verified');

  // 3. Query Version History Endpoint
  const versionsRes = await request(app)
    .get(`/api/admin/scholarships/${scholarshipId}/versions`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (versionsRes.status !== 200) {
    console.error('❌ FAILED: Failed to fetch version history', versionsRes.status);
    process.exit(1);
  }

  const { currentVersion, editHistory } = versionsRes.body;
  if (currentVersion !== 3) {
    console.error('❌ FAILED: Current version should be 3, got', currentVersion);
    process.exit(1);
  }
  if (!Array.isArray(editHistory) || editHistory.length !== 2) {
    console.error('❌ FAILED: Expected 2 history snapshots, got', editHistory?.length);
    process.exit(1);
  }

  console.log('  ✅ PASS: Complete version history returned with snapshot audit details');

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: ADMIN CONTENT VERSION HISTORY');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
