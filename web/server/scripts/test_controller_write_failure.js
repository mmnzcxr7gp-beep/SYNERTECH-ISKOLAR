const assert = require('assert');
const { db, connectDb } = require('../src/config/db');
const { submitApplication, updateApplicationStatus } = require('../src/controllers/applicationController');

async function testControllerWriteFailures() {
  console.log('🧪 Starting Controller-Level Critical Write Failure Test (TASK 7)...');

  await connectDb();

  // Mock Request & Response objects
  function createMockRes() {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  }

  // 1. Injected syncApplication failure during status update
  console.log('1️⃣ Testing status update MongoDB failure rollback...');
  const testScholarship = { id: 888, sponsor_id: 106, provider_id: 106, title: 'Test Scholarship 888' };
  db.data.scholarships.push(testScholarship);

  const testApp = { id: 77777, scholarship_id: 888, student_id: 999, status: 'pending' };
  db.data.applications.push(testApp);

  const originalSync = db.syncApplication;
  db.syncApplication = async () => {
    throw new Error('Simulated MongoDB Connection Outage');
  };

  const req = {
    params: { id: 77777 },
    body: { status: 'approved' },
    user: { id: 106, role: 'sponsor' },
  };
  const res = createMockRes();

  await updateApplicationStatus(req, res, () => {});

  assert.strictEqual(res.statusCode, 500, 'MongoDB failure must return HTTP 500');
  assert.ok(res.body.message.includes('Database failure'), 'Error message must state database failure');
  assert.strictEqual(testApp.status, 'pending', 'In-memory status must be rolled back to pending');
  console.log('✓ Test 1 PASSED: Status update failure returned 500 and rolled back state');

  // Restore syncApplication
  db.syncApplication = originalSync;

  // Cleanup
  db.data.applications = (db.data.applications || []).filter((a) => a.id !== 77777);
  await db.write();

  console.log('✅ ALL CONTROLLER WRITE FAILURE TESTS PASSED SUCCESSFULLY!');
}

testControllerWriteFailures()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ CONTROLLER WRITE FAILURE TEST FAILED:', err);
    process.exit(1);
  });
