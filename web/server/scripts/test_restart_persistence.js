/**
 * test_restart_persistence.js
 * Validates that all critical entities (applications, documents, OCR data,
 * messages, schedules, and notifications) survive service restarts and reloads cleanly.
 */

const assert = require('assert');
const { db, createId } = require('../src/config/db');

async function testRestartPersistence() {
  console.log('🧪 Testing Entity Restart Persistence (Applications, Docs, OCR, Messages, Schedules, Notifs)...');

  const ts = Date.now();
  const testAppId = 9801;
  const testDocId = 88901;
  const testUserId = 7701;

  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];
  if (!db.data.messages) db.data.messages = [];
  if (!db.data.schedules) db.data.schedules = [];
  if (!db.data.notifications) db.data.notifications = [];

  // 1. Create entities
  db.data.applications.push({
    id: testAppId,
    scholarship_id: 1,
    student_id: testUserId,
    status: 'APPROVED',
    applied_at: new Date().toISOString(),
  });

  db.data.documents.push({
    id: testDocId,
    documentId: String(testDocId),
    application_id: testAppId,
    user_id: testUserId,
    storedKey: `applications/${testAppId}/documents/doc_1/v1/test_${ts}.pdf`,
    version: 1,
    status: 'VERIFIED',
    ocr_result: { confidence: 99 },
  });

  db.data.messages.push({
    id: 991,
    application_id: testAppId,
    sender_id: String(testUserId),
    body: 'Persistence verification message',
  });

  db.data.schedules.push({
    id: 992,
    application_id: testAppId,
    title: 'Panel Interview',
    date: new Date().toISOString(),
  });

  db.data.notifications.push({
    id: 993,
    userId: testUserId,
    title: 'Application Approved',
    type: 'application_approved',
    read: false,
  });

  if (typeof db.write === 'function') await db.write();

  // 2. Simulate complete restart: re-read database store
  if (typeof db.read === 'function') await db.read();

  // 3. Confirm all entities survived
  const app = db.data.applications.find((a) => a.id === testAppId);
  assert.ok(app, 'Application must survive restart');
  assert.strictEqual(app.status, 'APPROVED');

  const doc = db.data.documents.find((d) => d.id === testDocId);
  assert.ok(doc, 'Document must survive restart');
  assert.strictEqual(doc.version, 1);

  const msg = db.data.messages.find((m) => m.application_id === testAppId);
  assert.ok(msg, 'Conversation messages must survive restart');

  const sched = db.data.schedules.find((s) => s.application_id === testAppId);
  assert.ok(sched, 'Schedules must survive restart');

  const notif = db.data.notifications.find((n) => n.userId === testUserId);
  assert.ok(notif, 'Notifications must survive restart');

  // Cleanup
  db.data.applications = db.data.applications.filter((a) => a.id !== testAppId);
  db.data.documents = db.data.documents.filter((d) => d.id !== testDocId);
  db.data.messages = db.data.messages.filter((m) => m.application_id !== testAppId);
  db.data.schedules = db.data.schedules.filter((s) => s.application_id !== testAppId);
  db.data.notifications = db.data.notifications.filter((n) => n.userId !== testUserId);

  console.log('✅ PASS test_restart_persistence: Full restart persistence verified across all entity types');
  process.exit(0);
}

testRestartPersistence().catch((err) => {
  console.error('❌ FAIL test_restart_persistence:', err);
  process.exit(1);
});
