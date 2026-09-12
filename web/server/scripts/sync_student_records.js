/**
 * sync_student_records.js
 * Harmonizes and syncs student records across users, students, and student_profiles collections
 * in MongoDB Atlas. Removes fake hardcoded data (e.g. Pamantasan ng Lungsod ng Maynila)
 * and repairs missing school/course/year fields.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function syncStudentRecords() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not set.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('iskolar');
    console.log('✓ Connected to MongoDB Atlas database:', db.databaseName);

    // 1. Fetch all student users
    const users = await db.collection('users').find({
      role: { $in: ['student', 'STUDENT', 'applicant', 'APPLICANT'] }
    }).toArray();
    console.log(`Found ${users.length} student user account(s).`);

    for (const u of users) {
      if (!u.id && !u._id) continue;
      const uId = u.id || u._id;
      const numId = Number(u.id);
      const email = (u.email || '').toLowerCase().trim();

      // Find matching student record in students collection
      const studentDoc = await db.collection('students').findOne({
        $or: [
          ...(u.id ? [{ userId: u.id }, { userId: String(u.id) }] : []),
          ...(!Number.isNaN(numId) ? [{ userId: numId }] : []),
          ...(email ? [{ email: email }] : []),
        ]
      });

      // Find matching profile in student_profiles collection
      const profileDoc = await db.collection('student_profiles').findOne({
        $or: [
          ...(u.id ? [{ user_id: u.id }, { user_id: String(u.id) }] : []),
          ...(!Number.isNaN(numId) ? [{ user_id: numId }] : []),
          ...(email ? [{ email: email }] : []),
        ]
      });

      // Determine authoritative truth without fake PLM / BS CS
      const authoritativeSchool =
        (u.school && !u.school.includes('Pamantasan ng Lungsod ng Maynila') ? u.school : null) ||
        (studentDoc?.school && !studentDoc.school.includes('Pamantasan ng Lungsod ng Maynila') ? studentDoc.school : null) ||
        (studentDoc?.schoolName && !studentDoc.schoolName.includes('Pamantasan ng Lungsod ng Maynila') ? studentDoc.schoolName : null) ||
        (profileDoc?.school && !profileDoc.school.includes('Pamantasan ng Lungsod ng Maynila') ? profileDoc.school : null) ||
        u.school || studentDoc?.school || studentDoc?.schoolName || profileDoc?.school || '';

      const authoritativeCourse =
        (u.course && u.course !== 'BS Computer Science' ? u.course : null) ||
        (studentDoc?.course && studentDoc?.course !== 'BS Computer Science' ? studentDoc.course : null) ||
        (profileDoc?.course && profileDoc?.course !== 'BS Computer Science' ? profileDoc.course : null) ||
        u.course || studentDoc?.course || profileDoc?.course || '';

      const authoritativeYearLevel =
        u.yearLevel || studentDoc?.yearLevel || studentDoc?.gradeLevel || profileDoc?.yearLevel || profileDoc?.year_level || '';

      const authoritativeName =
        u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}`.trim() : null) ||
        studentDoc?.name || profileDoc?.name || 'Student';

      console.log(`Syncing student: ${email} -> School: "${authoritativeSchool}", Course: "${authoritativeCourse}"`);

      // Update users collection
      const userUpdates = {};
      if (authoritativeSchool) {
        userUpdates.school = authoritativeSchool;
        userUpdates.schoolName = authoritativeSchool;
      }
      if (authoritativeCourse) userUpdates.course = authoritativeCourse;
      if (authoritativeYearLevel) userUpdates.yearLevel = authoritativeYearLevel;
      if (authoritativeName && !u.name) userUpdates.name = authoritativeName;

      if (Object.keys(userUpdates).length > 0) {
        await db.collection('users').updateOne(
          { _id: u._id },
          { $set: userUpdates }
        );
      }

      // Upsert into students collection
      const studentUpdates = {
        userId: u.id || numId,
        email: email,
        name: authoritativeName,
        school: authoritativeSchool,
        schoolName: authoritativeSchool,
        course: authoritativeCourse,
        yearLevel: authoritativeYearLevel,
        gradeLevel: authoritativeYearLevel,
      };
      await db.collection('students').updateOne(
        {
          $or: [
            ...(u.id ? [{ userId: u.id }, { userId: String(u.id) }] : []),
            ...(!Number.isNaN(numId) ? [{ userId: numId }] : []),
            ...(email ? [{ email: email }] : []),
          ]
        },
        { $set: studentUpdates },
        { upsert: true }
      );

      // Upsert into student_profiles collection
      const profileUpdates = {
        user_id: u.id || numId,
        email: email,
        name: authoritativeName,
        school: authoritativeSchool,
        schoolName: authoritativeSchool,
        course: authoritativeCourse,
        yearLevel: authoritativeYearLevel,
        year_level: authoritativeYearLevel,
        status: profileDoc?.status || 'verified',
        isVerified: true,
      };
      if (profileDoc?.gpa != null) profileUpdates.gpa = profileDoc.gpa;
      if (profileDoc?.family_income != null) profileUpdates.family_income = profileDoc.family_income;
      if (profileDoc?.achievements != null) profileUpdates.achievements = profileDoc.achievements;

      await db.collection('student_profiles').updateOne(
        {
          $or: [
            ...(u.id ? [{ user_id: u.id }, { user_id: String(u.id) }] : []),
            ...(!Number.isNaN(numId) ? [{ user_id: numId }] : []),
            ...(email ? [{ email: email }] : []),
          ]
        },
        { $set: profileUpdates },
        { upsert: true }
      );
    }

    console.log('\n✓ Successfully synchronized all student records across collections!');
  } catch (err) {
    console.error('❌ Error during synchronization:', err);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  syncStudentRecords();
}

module.exports = { syncStudentRecords };
