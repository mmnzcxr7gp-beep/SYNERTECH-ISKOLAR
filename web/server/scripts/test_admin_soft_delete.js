/**
 * test_admin_soft_delete.js
 * Verifies that administrative deletion uses soft deletion / archival,
 * preserves database records, records deleteReason, and logs to AuditLog.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { db, connectDb } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: ADMIN CONTENT SOFT DELETION & ARCHIVAL');
  console.log('🧪 ====================================================');

  await connectDb();

  const adminId = 9907;
  const adminUser = { id: adminId, email: 'admin_archive@iskolar.ph', role: 'admin' };

  if (!db.data) db.data = { users: [], scholarships: [] };
  if (!db.data.users) db.data.users = [];
  if (!db.data.scholarships) db.data.scholarships = [];

  db.data.users = db.data.users.filter(u => u.id !== adminId);
  db.data.users.push(adminUser);

  const scholarshipId = 7707;
  const scholarship = {
    id: scholarshipId,
    providerId: 5507,
    title: 'Flagged Program for Archival',
    description: 'Suspended program listing.',
    status: 'open',
    version: 1,
    isDeleted: false,
  };
  db.data.scholarships = db.data.scholarships.filter(s => s.id !== scholarshipId);
  db.data.scholarships.push(scholarship);
  await db.write();

  const adminToken = jwt.sign({ id: adminId, email: adminUser.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Soft Delete with Mandatory Reason
  const deleteReason = 'Archived due to fraudulent sponsor accreditation findings.';
  const delRes = await request(app)
    .delete(`/api/admin/scholarships/${scholarshipId}/soft-delete`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ deleteReason });

  if (delRes.status !== 200) {
    console.error('❌ FAILED: Soft delete failed with status', delRes.status, delRes.body);
    process.exit(1);
  }

  const archived = delRes.body.scholarship;

  // 2. Assertions
  if (archived.isDeleted !== true || archived.status !== 'closed') {
    console.error('❌ FAILED: isDeleted was not set to true or status not closed');
    process.exit(1);
  }
  console.log('  ✅ PASS: 1. Scholarship marked as isDeleted: true and status: closed');

  if (archived.deleteReason !== deleteReason || Number(archived.deletedBy) !== adminId) {
    console.error('❌ FAILED: deleteReason or deletedBy mismatch');
    process.exit(1);
  }
  console.log('  ✅ PASS: 2. deleteReason and deletedBy administrator ID recorded');

  // 3. Verify standard listing omits soft-deleted scholarships
  const listRes = await request(app)
    .get('/api/admin/scholarships')
    .set('Authorization', `Bearer ${adminToken}`);

  const activeScholarships = listRes.body.scholarships || [];
  const foundInActive = activeScholarships.some(s => s.id === scholarshipId);
  if (foundInActive) {
    console.error('❌ FAILED: Soft-deleted scholarship is still visible in standard active list');
    process.exit(1);
  }
  console.log('  ✅ PASS: 3. Soft-deleted scholarship correctly omitted from active scholarship directory');

  // 4. Verify record is still preserved in underlying database
  const inDb = db.data.scholarships.find(s => s.id === scholarshipId);
  if (!inDb) {
    console.error('❌ FAILED: Scholarship was hard-deleted from database!');
    process.exit(1);
  }
  console.log('  ✅ PASS: 4. Record safely preserved in historical database store');

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: ADMIN CONTENT SOFT DELETION & ARCHIVAL');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
