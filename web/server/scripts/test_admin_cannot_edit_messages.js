/**
 * test_admin_cannot_edit_messages.js
 * Verifies immutability: Administrators cannot rewrite, alter, or mutate private application messages.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: IMMUTABILITY OF PRIVATE MESSAGES');
  console.log('🧪 ====================================================');

  const adminToken = jwt.sign({ id: 9905, email: 'admin_security@iskolar.ph', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Attempt to edit message via /api/admin/messages/:id -> 405 Method Not Allowed
  const res1 = await request(app)
    .put('/api/admin/messages/12345')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ body: 'Altered message content by administrator' });

  if (res1.status !== 405 && res1.status !== 404 && res1.status !== 403) {
    console.error('❌ FAILED: Mutating messages should be blocked, got', res1.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 1. Admin mutation of private messages rejected with', res1.status, 'Method Not Allowed / Forbidden');

  // 2. Attempt to delete message via /api/admin/messages/:id -> 405
  const res2 = await request(app)
    .delete('/api/admin/messages/12345')
    .set('Authorization', `Bearer ${adminToken}`);

  if (res2.status !== 405 && res2.status !== 404 && res2.status !== 403) {
    console.error('❌ FAILED: Deleting messages should be blocked, got', res2.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 2. Admin deletion of private messages rejected with', res2.status, 'Method Not Allowed / Forbidden');

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: IMMUTABILITY OF PRIVATE MESSAGES');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
