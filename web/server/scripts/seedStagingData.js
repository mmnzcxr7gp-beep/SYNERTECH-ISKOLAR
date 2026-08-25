/**
 * Staging Database Seed Script
 * 
 * Populates sample test data for:
 * 1. Admin account (admin@iskolar.ph / IskolarPass123!)
 * 2. Provider account (provider@iskolar.ph / IskolarPass123!)
 * 3. Student account (student@iskolar.ph / IskolarPass123!)
 * 4. Sample Scholarships & Requirements
 * 5. Sample Applications & Transactions
 */

const bcrypt = require('bcrypt');
const { db } = require('../src/config/db');

async function seedStaging() {
  console.log('🌱 Starting Iskolar Staging Data Seeding...');

  // Ensure arrays exist in memory DB
  db.data = db.data || {};
  db.data.users = db.data.users || [];
  db.data.scholarships = db.data.scholarships || [];
  db.data.applications = db.data.applications || [];
  db.data.student_profiles = db.data.student_profiles || [];
  db.data.transactions = db.data.transactions || [];
  db.data.notifications = db.data.notifications || [];

  const defaultPasswordHash = await bcrypt.hash('IskolarPass123!', 10);

  // 1. Seed Accounts
  const defaultUsers = [
    {
      id: 1,
      name: 'System Admin',
      email: 'admin@iskolar.ph',
      password: defaultPasswordHash,
      role: 'admin',
      is_verified: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Future Leaders Foundation',
      email: 'provider@iskolar.ph',
      password: defaultPasswordHash,
      role: 'provider',
      sponsor_verified: true,
      organization_verified: true,
      organization_documents: ['uploads/org_proof.pdf'],
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: 'Maria Santos',
      email: 'student@iskolar.ph',
      password: defaultPasswordHash,
      role: 'student',
      student_verified: true,
      created_at: new Date().toISOString(),
    },
  ];

  for (const u of defaultUsers) {
    const existing = db.data.users.find((x) => x.email === u.email || x.id === u.id);
    if (!existing) {
      db.data.users.push(u);
      console.log(`  ✓ Added user: ${u.email} (${u.role})`);
    } else {
      console.log(`  - User already exists: ${u.email}`);
    }
  }

  // 2. Seed Student Profile
  const existingProfile = db.data.student_profiles.find((p) => p.user_id === 3);
  if (!existingProfile) {
    db.data.student_profiles.push({
      id: 1,
      user_id: 3,
      course: 'BS Computer Science',
      year_level: '3rd Year',
      gpa: 1.25,
      family_income: 180000,
      school: 'Polytechnic University of the Philippines',
      achievements: 'Dean\'s Lister, Hackathon Champion',
    });
    console.log('  ✓ Added student profile for Maria Santos');
  }

  // 3. Seed Scholarships
  const sampleScholarships = [
    {
      id: 101,
      sponsor_id: 2,
      title: 'Future Tech Leaders Grant 2026',
      description: 'Full tuition coverage and monthly allowance for outstanding STEM college students in the Philippines.',
      slots: 15,
      deadline: '2026-12-31',
      requirements: ['Certificate of Grades', 'Income Tax Return / Certificate of Indigency', 'Valid Student ID'],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: 'open',
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      sponsor_id: 2,
      title: 'Community Empowerment Scholarship',
      description: 'Financial assistance for underprivileged working students pursuing higher education.',
      slots: 20,
      deadline: '2026-11-15',
      requirements: ['Enrollment Form', 'Barangay Certificate of Indigency'],
      criteria_json: JSON.stringify({ gpa: 30, financialNeed: 50, achievements: 10, other: 10 }),
      status: 'open',
      created_at: new Date().toISOString(),
    },
  ];

  for (const s of sampleScholarships) {
    const existingS = db.data.scholarships.find((x) => x.id === s.id);
    if (!existingS) {
      db.data.scholarships.push(s);
      console.log(`  ✓ Added scholarship: ${s.title}`);
    }
  }

  // 4. Seed Applications
  const existingApp = db.data.applications.find((a) => a.id === 501);
  if (!existingApp) {
    db.data.applications.push({
      id: 501,
      scholarship_id: 101,
      student_id: 3,
      score: 92.5,
      status: 'under_review',
      applied_at: new Date().toISOString(),
    });
    console.log('  ✓ Added sample application #501 for Maria Santos');
  }

  // 5. Seed Transactions
  const existingTx = db.data.transactions.find((t) => t.id === 901);
  if (!existingTx) {
    db.data.transactions.push({
      id: 901,
      scholarship_id: 101,
      student_id: 3,
      amount: 25000,
      type: 'disbursement',
      status: 'completed',
      reference_number: 'TXN-2026-ISK-001',
      created_at: new Date().toISOString(),
    });
    console.log('  ✓ Added sample transaction #901');
  }

  await db.write();
  console.log('✅ Staging database seeding complete!');
}

if (require.main === module) {
  seedStaging().catch(console.error);
}

module.exports = { seedStaging };
