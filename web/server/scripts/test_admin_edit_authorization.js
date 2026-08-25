/**
 * test_admin_edit_authorization.js
 * Verifies role-based access control: Non-admins (students, providers, unauthenticated)
 * are strictly blocked from using administrative content editing endpoints.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { db, connectDb } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: ADMIN EDIT AUTHORIZATION & ROLE GUARDS');
  console.log('🧪 ====================================================');

  await connectDb();

  const studentToken = jwt.sign({ id: 101, email: 'student@iskolar.ph', role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
  const providerToken = jwt.sign({ id: 202, email: 'provider@corp.ph', role: 'provider' }, JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ id: 303, email: 'admin@iskolar.ph', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  const scholarshipId = 7704;
  if (!db.data) db.data = { scholarships: [] };
  if (!db.data.scholarships) db.data.scholarships = [];
  db.data.scholarships.push({
    id: scholarshipId,
    title: 'Auth Check Scholarship',
    description: 'Sample',
    version: 1,
  });
  await db.write();

  // 1. Unauthenticated Request -> 401
  const unauthRes = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .send({ title: 'Hacked', editReason: 'Unauthorized test edit' });

  if (unauthRes.status !== 401) {
    console.error('❌ FAILED: Unauthenticated request should be 401, got', unauthRes.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 1. Unauthenticated request blocked with 401 Unauthorized');

  // 2. Student Request -> 403 Forbidden
  const studentRes = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ title: 'Student Edited Title', editReason: 'Student attempting edit' });

  if (studentRes.status !== 403) {
    console.error('❌ FAILED: Student request should be 403, got', studentRes.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 2. Student request blocked with 403 Forbidden');

  // 3. Provider Request -> 403 Forbidden
  const providerRes = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${providerToken}`)
    .send({ title: 'Provider Edited via Admin Endpoint', editReason: 'Provider attempting admin edit' });

  if (providerRes.status !== 403) {
    console.error('❌ FAILED: Provider request should be 403, got', providerRes.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 3. Provider request to admin endpoint blocked with 403 Forbidden');

  // 4. Admin Request without mandatory reason -> 400 Bad Request
  const emptyReasonRes = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Admin Title', editReason: '' });

  if (emptyReasonRes.status !== 400) {
    console.error('❌ FAILED: Empty edit reason should return 400, got', emptyReasonRes.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 4. Admin request without reason rejected with 400 Bad Request');

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: ADMIN EDIT AUTHORIZATION & ROLE GUARDS');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
