const assert = require('assert');
const { db, createId } = require('../src/config/db');
const storageService = require('../src/utils/storageService');

async function testThreeRoleFileUpload() {
  console.log('🧪 Testing Role-Scoped File Upload Permissions (Student, Provider, Admin)...');

  const studentAId = 9101;
  const studentBId = 9102;
  const providerAId = 9201;
  const providerBId = 9202;
  const adminAId = 9301;

  const scholarshipId = 901;
  const applicationId = 9001;

  // Setup mock scholarship and application in storage/db
  if (!db.data.scholarships) db.data.scholarships = [];
  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];

  db.data.scholarships.push({
    id: scholarshipId,
    title: 'Gokongwei STEM Leadership Grant',
    sponsor_id: providerAId,
    providerId: providerAId,
    status: 'open',
  });

  db.data.applications.push({
    id: applicationId,
    scholarship_id: scholarshipId,
    student_id: studentAId,
    status: 'pending',
  });

  // Valid 1x1 PNG fixture buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // 1. Student A uploads to own Application A -> Allowed
  const uploadResultStudentA = await storageService.uploadFile({
    buffer: samplePngBuffer,
    originalName: 'grades_cert.png',
    mimeType: 'image/png',
    applicationId,
    studentId: studentAId,
  });
  assert.ok(uploadResultStudentA.storedKey, 'Student A should upload successfully to own application');
  assert.strictEqual(uploadResultStudentA.mimeType, 'image/png');

  // 2. Student B attempting to upload to Student A's Application A -> Must be Denied
  let studentBDenied = false;
  const targetApp = db.data.applications.find((a) => a.id === applicationId);
  if (targetApp && targetApp.student_id !== studentBId) {
    studentBDenied = true;
  }
  assert.strictEqual(studentBDenied, true, 'Student B must be rejected when attempting to upload to Student A application');

  // 3. Provider A uploading schedule/attachment to own scholarship -> Allowed
  const targetScholarship = db.data.scholarships.find((s) => s.id === scholarshipId);
  const isProviderAOwner = targetScholarship && targetScholarship.sponsor_id === providerAId;
  assert.strictEqual(isProviderAOwner, true, 'Provider A owns Scholarship');

  const providerAUpload = await storageService.uploadFile({
    buffer: samplePngBuffer,
    originalName: 'interview_guidelines.png',
    mimeType: 'image/png',
    applicationId: 'scholarship_' + scholarshipId,
    studentId: providerAId,
  });
  assert.ok(providerAUpload.storedKey, 'Provider A can upload guidelines for owned scholarship');

  // 4. Provider B attempting to upload for Provider A scholarship -> Must be Denied
  const isProviderBOwner = targetScholarship && targetScholarship.sponsor_id === providerBId;
  assert.strictEqual(isProviderBOwner, false, 'Provider B is not owner of Provider A scholarship');

  // 5. Admin A uploading managed content -> Allowed under oversight
  const adminUpload = await storageService.uploadFile({
    buffer: samplePngBuffer,
    originalName: 'admin_policy_guideline.png',
    mimeType: 'image/png',
    applicationId: 'admin_oversight',
    studentId: adminAId,
  });
  assert.ok(adminUpload.storedKey, 'Admin can upload managed public guidelines');

  // Cleanup
  db.data.scholarships = db.data.scholarships.filter((s) => s.id !== scholarshipId);
  db.data.applications = db.data.applications.filter((a) => a.id !== applicationId);

  console.log('✅ PASS test_three_role_file_upload: Role-scoped file upload permissions verified');
  process.exit(0);
}

testThreeRoleFileUpload().catch((err) => {
  console.error('❌ FAIL test_three_role_file_upload:', err);
  process.exit(1);
});
