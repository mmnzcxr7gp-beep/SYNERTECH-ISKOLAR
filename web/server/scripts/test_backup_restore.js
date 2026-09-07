/**
 * test_backup_restore.js
 * Controlled Backup & Restore Verification for ISKOLAR 2.0 Database
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { db } = require('../src/config/db');

async function testBackupRestore() {
  console.log('🧪 Testing Database Backup, Snapshot Export, and Restore Integrity...');

  const backupDir = path.join(__dirname, '..', 'scratch');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `controlled_backup_${Date.now()}.json`);

  // 1. Seed controlled non-production dataset
  const testUserId = 99901;
  const testAppId = 88801;
  const testDocId = 77701;

  if (!db.data.users) db.data.users = [];
  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];

  const originalUser = { id: testUserId, name: 'Backup Test Candidate', email: 'backup.test@iskolar.ph', role: 'student' };
  const originalApp = { id: testAppId, student_id: testUserId, scholarship_id: 101, status: 'APPROVED' };
  const originalDoc = { id: testDocId, documentId: String(testDocId), application_id: testAppId, user_id: testUserId, version: 1, status: 'VERIFIED' };

  db.data.users.push(originalUser);
  db.data.applications.push(originalApp);
  db.data.documents.push(originalDoc);

  const initialUserCount = db.data.users.length;
  const initialAppCount = db.data.applications.length;
  const initialDocCount = db.data.documents.length;

  // 2. Perform Backup Export
  const backupPayload = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    data: {
      users: db.data.users,
      applications: db.data.applications,
      documents: db.data.documents,
      scholarships: db.data.scholarships || [],
      notifications: db.data.notifications || [],
      messages: db.data.messages || [],
      audit_logs: db.data.audit_logs || [],
    },
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupPayload, null, 2), 'utf8');
  assert.ok(fs.existsSync(backupFile), 'Backup snapshot file must exist');

  // 3. Simulate Data Loss / Wipe
  db.data.users = db.data.users.filter((u) => u.id !== testUserId);
  db.data.applications = db.data.applications.filter((a) => a.id !== testAppId);
  db.data.documents = db.data.documents.filter((d) => d.id !== testDocId);

  assert.strictEqual(db.data.users.find((u) => u.id === testUserId), undefined, 'Test user wiped');
  assert.strictEqual(db.data.applications.find((a) => a.id === testAppId), undefined, 'Test application wiped');
  assert.strictEqual(db.data.documents.find((d) => d.id === testDocId), undefined, 'Test document wiped');

  // 4. Perform Restore from Backup Snapshot
  const restoredRaw = fs.readFileSync(backupFile, 'utf8');
  const restoredPayload = JSON.parse(restoredRaw);

  db.data.users = restoredPayload.data.users;
  db.data.applications = restoredPayload.data.applications;
  db.data.documents = restoredPayload.data.documents;
  db.data.scholarships = restoredPayload.data.scholarships;
  db.data.notifications = restoredPayload.data.notifications;
  db.data.messages = restoredPayload.data.messages;
  db.data.audit_logs = restoredPayload.data.audit_logs;

  if (typeof db.write === 'function') await db.write();

  // 5. Verify 100% Data Restoration & Integrity
  assert.strictEqual(db.data.users.length, initialUserCount, 'User count restored');
  assert.strictEqual(db.data.applications.length, initialAppCount, 'Application count restored');
  assert.strictEqual(db.data.documents.length, initialDocCount, 'Document count restored');

  const restoredUser = db.data.users.find((u) => u.id === testUserId);
  const restoredApp = db.data.applications.find((a) => a.id === testAppId);
  const restoredDoc = db.data.documents.find((d) => d.id === testDocId);

  assert.ok(restoredUser && restoredUser.email === 'backup.test@iskolar.ph', 'Restored user fields match');
  assert.ok(restoredApp && restoredApp.status === 'APPROVED', 'Restored application fields match');
  assert.ok(restoredDoc && restoredDoc.status === 'VERIFIED', 'Restored document fields match');

  // Cleanup synthetic test records & temp backup file
  db.data.users = db.data.users.filter((u) => u.id !== testUserId);
  db.data.applications = db.data.applications.filter((a) => a.id !== testAppId);
  db.data.documents = db.data.documents.filter((d) => d.id !== testDocId);
  if (typeof db.write === 'function') await db.write();
  try { fs.unlinkSync(backupFile); } catch (_) {}

  console.log('✅ PASS test_backup_restore: Controlled database backup, export, and restore verified');
  process.exit(0);
}

testBackupRestore().catch((err) => {
  console.error('❌ FAIL test_backup_restore:', err);
  process.exit(1);
});
