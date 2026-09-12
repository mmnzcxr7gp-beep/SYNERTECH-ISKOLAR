const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { db, connectDb } = require('../src/config/db');
const { getApplications } = require('../src/controllers/applicationController');
const { getProfile } = require('../src/controllers/authController');
const { getApplicants } = require('../src/controllers/scholarshipApplicationController');

async function testApplicantRealDataFlow() {
  console.log('--- Testing Applicant Real Data Flow ---');
  await connectDb();

  // 1. Verify User 83066 in MongoDB collections
  const user = await db.collections.users.findOne({ email: 'samirianvillaluna01@gmail.com' });
  console.log('User in MongoDB:');
  console.log(' - Name:', user?.name);
  console.log(' - Email:', user?.email);
  console.log(' - School:', user?.school);
  console.log(' - Course:', user?.course);
  console.log(' - Year Level:', user?.yearLevel || user?.gradeLevel);
  console.log(' - GPA:', user?.gpa);

  const studentProfile = await db.collections.student_profiles.findOne({ email: 'samirianvillaluna01@gmail.com' });
  console.log('Student Profile in MongoDB:');
  console.log(' - School:', studentProfile?.school);
  console.log(' - Course:', studentProfile?.course);
  console.log(' - Year Level:', studentProfile?.year_level || studentProfile?.yearLevel);
  console.log(' - GPA:', studentProfile?.gpa);

  // Check application 97973
  const app = await db.collections.applications.findOne({ id: 97973 });
  console.log('Application 97973 in MongoDB:');
  console.log(' - Applicant ID:', app?.student_id || app?.studentId);
  console.log(' - Status:', app?.status);
  console.log(' - Documents Count:', (app?.documents || []).length);
  for (const doc of (app?.documents || [])) {
    console.log(`   * Doc: ${doc.type || doc.name} | OCR matchesAccreditedInstitution: ${doc.ocr_data?.matchesAccreditedInstitution} | schoolName: ${doc.ocr_data?.schoolName || 'N/A'}`);
  }

  // 2. Test getApplications (Admin/Provider API simulation)
  console.log('\nTesting getApplications endpoint response...');
  const fakeReq = {
    user: { id: 1, role: 'admin', email: 'admin@iskolar.ph' },
    query: {},
  };
  let capturedResponse = null;
  const fakeRes = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      capturedResponse = data;
      return this;
    }
  };

  await getApplications(fakeReq, fakeRes, (err) => { if (err) console.error(err); });

  const appList = Array.isArray(capturedResponse) ? capturedResponse : capturedResponse?.applications || [];
  console.log(`Total applications returned: ${appList.length}`);
  const targetApp = appList.find((a) => String(a.id) === '97973' || a.student_email === 'samirianvillaluna01@gmail.com' || a.email === 'samirianvillaluna01@gmail.com');
  
  if (targetApp) {
    console.log('Resolved Target Application payload for Admin/Provider:');
    console.log(' - student_name:', targetApp.student_name || targetApp.studentName);
    console.log(' - student_email:', targetApp.student_email || targetApp.email);
    console.log(' - student_school:', targetApp.student_school || targetApp.studentSchool);
    console.log(' - student_course:', targetApp.student_course || targetApp.studentCourse);
    console.log(' - student_year:', targetApp.student_year || targetApp.studentYear);
    console.log(' - student_gpa:', targetApp.student_gpa || targetApp.studentGpa);
    console.log(' - student_profile school:', targetApp.student_profile?.school);
    console.log(' - student_profile course:', targetApp.student_profile?.course);

    if (
      targetApp.student_school === 'Pamantasan ng Lungsod ng Maynila' ||
      targetApp.studentSchool === 'Pamantasan ng Lungsod ng Maynila' ||
      targetApp.student_profile?.school === 'Pamantasan ng Lungsod ng Maynila'
    ) {
      console.error('❌ FAILURE: Application still contains Pamantasan ng Lungsod ng Maynila!');
      process.exit(1);
    } else {
      console.log('✅ SUCCESS: Application correctly resolved to authentic student school:', targetApp.student_school || targetApp.studentSchool);
    }
  } else {
    console.log('Application 97973 not found in list, listing all applicants:');
    for (const a of appList.slice(0, 5)) {
      console.log(` - ID: ${a.id}, Email: ${a.student_email || a.email}, School: ${a.student_school || a.studentSchool}`);
    }
  }

  // 3. Test getProfile endpoint
  console.log('\nTesting getProfile for samirianvillaluna01@gmail.com...');
  const fakeProfileReq = {
    user: { id: user.id, email: user.email, role: 'student' }
  };
  let profileData = null;
  const fakeProfileRes = {
    status(c) { return this; },
    json(data) { profileData = data; return this; }
  };
  await getProfile(fakeProfileReq, fakeProfileRes, (err) => { if (err) console.error(err); });

  console.log('Resolved Profile Response:');
  console.log(' - User School:', profileData?.user?.school);
  console.log(' - User Course:', profileData?.user?.course);
  console.log(' - User Year Level:', profileData?.user?.yearLevel);
  console.log(' - User GPA:', profileData?.user?.gpa);
  console.log(' - Nested Profile School:', profileData?.user?.profile?.school);
  console.log(' - Nested Profile Course:', profileData?.user?.profile?.course);
  console.log(' - Nested Profile GPA:', profileData?.user?.profile?.gpa);

  if (profileData?.user?.school === 'Pamantasan ng Lungsod ng Maynila' || profileData?.user?.profile?.school === 'Pamantasan ng Lungsod ng Maynila') {
    console.error('❌ FAILURE: Profile returns fake school!');
    process.exit(1);
  } else {
    console.log('✅ SUCCESS: Profile returns authentic school:', profileData?.user?.school, 'and nested profile school:', profileData?.user?.profile?.school);
  }

  await mongoose.disconnect();
  process.exit(0);
}

testApplicantRealDataFlow().catch((e) => {
  console.error('Error running test:', e);
  process.exit(1);
});
