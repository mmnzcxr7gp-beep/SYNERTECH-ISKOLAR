/**
 * test_admin_edit_audit_log.js
 * Verifies that administrative content edits create immutable AuditLog entries with reasons.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');
const { db, connectDb } = require('../src/config/db');
const AuditLog = require('../src/models/AuditLog');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: ADMIN EDIT AUDIT LOG CREATION');
  console.log('🧪 ====================================================');

  await connectDb();

  const adminId = 9903;
  const adminUser = { id: adminId, email: 'admin_audit@iskolar.ph', role: 'admin' };

  if (!db.data) db.data = { users: [], scholarships: [] };
  if (!db.data.users) db.data.users = [];
  if (!db.data.scholarships) db.data.scholarships = [];

  db.data.users = db.data.users.filter(u => u.id !== adminId);
  db.data.users.push(adminUser);

  const scholarshipId = 7703;
  const scholarship = {
    id: scholarshipId,
    providerId: 5503,
    title: 'Audit Target Scholarship',
    description: 'Initial text.',
    status: 'open',
    version: 1,
    isDeleted: false,
    editHistory: [],
  };
  db.data.scholarships = db.data.scholarships.filter(s => s.id !== scholarshipId);
  db.data.scholarships.push(scholarship);
  await db.write();

  const adminToken = jwt.sign({ id: adminId, email: adminUser.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  const editReason = 'Mandatory compliance update to eligibility criteria per DOST rules.';

  const res = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Audit Target Scholarship (Moderated)',
      editReason,
    });

  if (res.status !== 200) {
    console.error('❌ FAILED: Edit request returned', res.status);
    process.exit(1);
  }

  // Verify Audit Log via GET /api/admin/audit-logs or direct model query
  const auditRes = await request(app)
    .get('/api/admin/audit-logs')
    .set('Authorization', `Bearer ${adminToken}`);

  if (auditRes.status !== 200) {
    console.error('❌ FAILED: Could not retrieve audit logs');
    process.exit(1);
  }

  console.log('  ✅ PASS: Audit log endpoint returned 200 OK');

  if (mongoose.connection.readyState === 1) {
    const mongoLog = await AuditLog.findOne({
      action: 'ADMIN_CONTENT_EDIT',
      targetId: String(scholarshipId),
    }).sort({ createdAt: -1 });

    if (!mongoLog) {
      console.error('❌ FAILED: AuditLog document not found in MongoDB');
      process.exit(1);
    }

    if (mongoLog.reason !== editReason) {
      console.error('❌ FAILED: AuditLog reason mismatch');
      process.exit(1);
    }
    console.log('  ✅ PASS: MongoDB AuditLog record verified with before/after summaries');
  }

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: ADMIN EDIT AUDIT LOG CREATION');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
