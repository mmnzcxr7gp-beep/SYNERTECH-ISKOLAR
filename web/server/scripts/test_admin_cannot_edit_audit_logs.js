/**
 * test_admin_cannot_edit_audit_logs.js
 * Verifies immutability: Audit log entries cannot be modified or deleted via API endpoints.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: IMMUTABILITY OF AUDIT LOGS');
  console.log('🧪 ====================================================');

  const adminToken = jwt.sign({ id: 9906, email: 'admin_audit_guard@iskolar.ph', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Attempt to update audit log -> 405 Method Not Allowed
  const res1 = await request(app)
    .put('/api/admin/audit-logs/650000000000000000000001')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'MUTATED_ACTION', reason: 'Attempt to tamper ledger' });

  if (res1.status !== 405) {
    console.error('❌ FAILED: Mutating audit log should return 405 Method Not Allowed, got', res1.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 1. Audit log mutation strictly blocked with 405 Method Not Allowed');

  // 2. Attempt to delete audit log -> 405 Method Not Allowed
  const res2 = await request(app)
    .delete('/api/admin/audit-logs/650000000000000000000001')
    .set('Authorization', `Bearer ${adminToken}`);

  if (res2.status !== 405) {
    console.error('❌ FAILED: Deleting audit log should return 405 Method Not Allowed, got', res2.status);
    process.exit(1);
  }
  console.log('  ✅ PASS: 2. Audit log deletion strictly blocked with 405 Method Not Allowed');

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: IMMUTABILITY OF AUDIT LOGS');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
