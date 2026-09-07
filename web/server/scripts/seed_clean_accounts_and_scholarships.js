const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
const STATE_DOC_ID = 'iskolar_state';

async function seedCleanDatabase() {
  console.log('🔄 Connecting to MongoDB:', MONGO_URI);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('iskolar');

  console.log('📦 Connected. Preparing clean seed data...');

  const { getSyntheticPasswordForEmail } = require('../src/config/syntheticCredentials');
  const getHash = (email) => {
    const raw = getSyntheticPasswordForEmail(email) || 'IskolarSecureAuth#2026!';
    return bcrypt.hashSync(raw, 10);
  };
  const now = new Date().toISOString();

  // 1. 2 Admins
  const admins = [
    {
      id: 1,
      name: 'Super Administrator',
      email: 'admin@iskolar.ph',
      password: getHash('admin@iskolar.ph'),
      role: 'admin',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 2,
      name: 'System Security Admin',
      email: 'security.admin@iskolar.ph',
      password: getHash('security.admin@iskolar.ph'),
      role: 'admin',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    }
  ];

  // 2. 5 Providers
  const providers = [
    {
      id: 101,
      name: 'Gokongwei Brothers Foundation',
      email: 'gokongwei.brothers@iskolar.ph',
      password: getHash('gokongwei.brothers@iskolar.ph'),
      role: 'sponsor',
      company: 'Gokongwei Brothers Foundation',
      organization_name: 'Gokongwei Brothers Foundation',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 102,
      name: 'Ayala Foundation',
      email: 'ayala.foundation@iskolar.ph',
      password: getHash('ayala.foundation@iskolar.ph'),
      role: 'sponsor',
      company: 'Ayala Foundation, Inc.',
      organization_name: 'Ayala Foundation, Inc.',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 103,
      name: 'SM Foundation',
      email: 'sm.foundation@iskolar.ph',
      password: getHash('sm.foundation@iskolar.ph'),
      role: 'sponsor',
      company: 'SM Foundation, Inc.',
      organization_name: 'SM Foundation, Inc.',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 104,
      name: 'Aboitiz Foundation',
      email: 'aboitiz.foundation@iskolar.ph',
      password: getHash('aboitiz.foundation@iskolar.ph'),
      role: 'sponsor',
      company: 'Aboitiz Foundation',
      organization_name: 'Aboitiz Foundation',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 105,
      name: 'Megaworld Foundation',
      email: 'megaworld.foundation@iskolar.ph',
      password: getHash('megaworld.foundation@iskolar.ph'),
      role: 'sponsor',
      company: 'Megaworld Foundation',
      organization_name: 'Megaworld Foundation',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: true,
      organization_verified: true,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    }
  ];

  // 3. 5 Students
  const students = [
    {
      id: 201,
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@iskolar.ph',
      password: getHash('juan.delacruz@iskolar.ph'),
      role: 'student',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: false,
      organization_verified: false,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 202,
      name: 'Maria Clara Santos',
      email: 'maria.santos@iskolar.ph',
      password: getHash('maria.santos@iskolar.ph'),
      role: 'student',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: false,
      organization_verified: false,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 203,
      name: 'Joshua Reyes',
      email: 'joshua.reyes@iskolar.ph',
      password: getHash('joshua.reyes@iskolar.ph'),
      role: 'student',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: false,
      organization_verified: false,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 204,
      name: 'Angelica Lopez',
      email: 'angelica.lopez@iskolar.ph',
      password: getHash('angelica.lopez@iskolar.ph'),
      role: 'student',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: false,
      organization_verified: false,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    },
    {
      id: 205,
      name: 'Christian Bautista',
      email: 'christian.bautista@iskolar.ph',
      password: getHash('christian.bautista@iskolar.ph'),
      role: 'student',
      created_at: now,
      emailVerified: true,
      verificationStatus: 'verified',
      sponsor_verified: false,
      organization_verified: false,
      profilePicture: '',
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: now,
    }
  ];

  // 4. Student Profiles
  const student_profiles = [
    {
      id: 1,
      user_id: 201,
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@iskolar.ph',
      school: 'University of the Philippines Diliman',
      course: 'BS Computer Science',
      year_level: '3rd Year',
      gpa: 1.25,
      family_income: 240000,
      achievements: "DOST Scholar, Dean's Lister 2024-2026, Hackathon Champion",
      status: 'verified',
      isVerified: true,
      verificationStatus: 'verified',
    },
    {
      id: 2,
      user_id: 202,
      name: 'Maria Clara Santos',
      email: 'maria.santos@iskolar.ph',
      school: 'Pamantasan ng Lungsod ng Maynila',
      course: 'BS Information Technology',
      year_level: '2nd Year',
      gpa: 1.40,
      family_income: 180000,
      achievements: "President's Lister, Top 1 IT Department",
      status: 'verified',
      isVerified: true,
      verificationStatus: 'verified',
    },
    {
      id: 3,
      user_id: 203,
      name: 'Joshua Reyes',
      email: 'joshua.reyes@iskolar.ph',
      school: 'Polytechnic University of the Philippines',
      course: 'BS Civil Engineering',
      year_level: '3rd Year',
      gpa: 1.50,
      family_income: 210000,
      achievements: 'College Scholar, PICE Student Chapter Officer',
      status: 'verified',
      isVerified: true,
      verificationStatus: 'verified',
    },
    {
      id: 4,
      user_id: 204,
      name: 'Angelica Lopez',
      email: 'angelica.lopez@iskolar.ph',
      school: 'Technological University of the Philippines',
      course: 'BS Mechanical Engineering',
      year_level: '4th Year',
      gpa: 1.65,
      family_income: 250000,
      achievements: "Dean's Honor Roll, Robotics Club Lead",
      status: 'verified',
      isVerified: true,
      verificationStatus: 'verified',
    },
    {
      id: 5,
      user_id: 205,
      name: 'Christian Bautista',
      email: 'christian.bautista@iskolar.ph',
      school: 'Bulacan State University',
      course: 'BS Electronics Engineering',
      year_level: '2nd Year',
      gpa: 1.75,
      family_income: 190000,
      achievements: 'Academic Excellence Awardee, IEEE Student Member',
      status: 'verified',
      isVerified: true,
      verificationStatus: 'verified',
    }
  ];

  // 5. 10 Scholarships (2 per provider)
  const scholarships = [
    // Provider 101: Gokongwei
    {
      id: 1001,
      sponsor_id: 101,
      provider_id: 101,
      providerId: 101,
      organization_name: 'Gokongwei Brothers Foundation',
      title: 'Gokongwei STEM Leadership Grant 2026',
      description: 'Full academic scholarship and allowance grant for outstanding undergraduate engineering and science majors.',
      type: 'Scholarship + Allowance',
      benefits: '100% Tuition Subsidy + ₱10,000 Monthly Living Allowance + Laptop Grant',
      eligibilityRequirements: 'Enrolled in accredited STEM degree with minimum GWA of 1.75 or equivalent.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID',
        'Income Tax Return (ITR) / Certificate of Indigency'
      ],
      slots: 25,
      totalSlots: 25,
      allowance: 10000,
      maxAmount: 120000,
      deadline: '2026-11-30',
      applicationDeadline: '2026-11-30',
      hasExam: true,
      examDetails: 'Online Aptitude and Analytical Reasoning Assessment',
      hasInterview: true,
      interviewDetails: 'Technical and Values Panel Interview with GBF Executives',
      selectionStages: ['1. Document Screening', '2. Analytical Exam', '3. Panel Interview', '4. Final Awarding'],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: 'open',
      created_at: now,
    },
    {
      id: 1002,
      sponsor_id: 101,
      provider_id: 101,
      providerId: 101,
      organization_name: 'Gokongwei Brothers Foundation',
      title: 'JG Summit Engineering Future Fund',
      description: 'Specialized industry development scholarship supporting mechanical, chemical, and electrical engineering innovators.',
      type: 'Merit & Technical Grant',
      benefits: 'Full Tuition Coverage + ₱8,000 Monthly Stipend + Guaranteed Internship',
      eligibilityRequirements: '3rd or 4th year Engineering students in recognized universities with GWA 1.75 or higher.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Latest Certified Grades / TOR',
        'Valid School ID'
      ],
      slots: 15,
      totalSlots: 15,
      allowance: 8000,
      maxAmount: 96000,
      deadline: '2026-12-15',
      applicationDeadline: '2026-12-15',
      hasExam: false,
      examDetails: '',
      hasInterview: true,
      interviewDetails: 'Engineering Innovation Pitch & Technical Interview',
      selectionStages: ['1. Document Review', '2. Technical Interview', '3. Final Selection'],
      criteria_json: JSON.stringify({ gpa: 45, financialNeed: 25, achievements: 20, other: 10 }),
      status: 'open',
      created_at: now,
    },

    // Provider 102: Ayala
    {
      id: 1003,
      sponsor_id: 102,
      provider_id: 102,
      providerId: 102,
      organization_name: 'Ayala Foundation, Inc.',
      title: 'Ayala Future Leaders College Scholarship',
      description: 'Comprehensive undergraduate leadership scholarship honoring high-potential students in business, sustainability, and community leadership.',
      type: 'Leadership Grant',
      benefits: 'Full Tuition + ₱12,000 Monthly Allowance + Mentorship Program',
      eligibilityRequirements: 'Regular undergraduate student with proven leadership track record and GWA of 1.75 or better.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID',
        'Leadership Portfolio / Certificate'
      ],
      slots: 20,
      totalSlots: 20,
      allowance: 12000,
      maxAmount: 144000,
      deadline: '2026-10-31',
      applicationDeadline: '2026-10-31',
      hasExam: false,
      examDetails: '',
      hasInterview: true,
      interviewDetails: 'Leadership Impact & Purpose Panel Interview',
      selectionStages: ['1. Portfolio & Document Screening', '2. Leadership Assessment', '3. Executive Interview', '4. Awarding'],
      criteria_json: JSON.stringify({ gpa: 35, financialNeed: 25, achievements: 30, other: 10 }),
      status: 'open',
      created_at: now,
    },
    {
      id: 1004,
      sponsor_id: 102,
      provider_id: 102,
      providerId: 102,
      organization_name: 'Ayala Foundation, Inc.',
      title: 'Ayala Tech Innovators Grant',
      description: 'Direct research and education grant for students pursuing software development, AI, data science, and digital innovation.',
      type: 'Innovation Grant',
      benefits: '₱75,000 Annual Educational Assistance + Cloud Project Credits',
      eligibilityRequirements: 'Undergraduate CS/IT/Data Science majors with minimum GPA 1.75.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Valid School ID',
        'Portfolio / GitHub Repository Link'
      ],
      slots: 30,
      totalSlots: 30,
      allowance: 7500,
      maxAmount: 75000,
      deadline: '2026-11-15',
      applicationDeadline: '2026-11-15',
      hasExam: false,
      examDetails: '',
      hasInterview: false,
      interviewDetails: '',
      selectionStages: ['1. Project & Document Evaluation', '2. Final Awarding'],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 20, achievements: 30, other: 10 }),
      status: 'open',
      created_at: now,
    },

    // Provider 103: SM Foundation
    {
      id: 1005,
      sponsor_id: 103,
      provider_id: 103,
      providerId: 103,
      organization_name: 'SM Foundation, Inc.',
      title: 'SM College Education Assistance Program',
      description: 'Flagship national scholarship helping deserving college students achieve their dreams through education and career support.',
      type: 'Undergraduate Grant',
      benefits: '100% Tuition and Miscellaneous Fees + Monthly Stipend + Job Placement Opportunities',
      eligibilityRequirements: 'Graduating SHS / currently enrolled college students with general average of 88% / 1.75 GWA.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID',
        'Certificate of Indigency / ITR'
      ],
      slots: 50,
      totalSlots: 50,
      allowance: 6000,
      maxAmount: 80000,
      deadline: '2026-12-01',
      applicationDeadline: '2026-12-01',
      hasExam: false,
      examDetails: '',
      hasInterview: true,
      interviewDetails: 'Online Verification Interview',
      selectionStages: ['1. Requirements Review', '2. Interview & Family Assessment', '3. Awarding'],
      criteria_json: JSON.stringify({ gpa: 35, financialNeed: 45, achievements: 10, other: 10 }),
      status: 'open',
      created_at: now,
    },
    {
      id: 1006,
      sponsor_id: 103,
      provider_id: 103,
      providerId: 103,
      organization_name: 'SM Foundation, Inc.',
      title: 'Henry Sy Foundation Tech Grant',
      description: 'Dedicated funding for students specializing in applied technology, cloud computing, and cybersecurity.',
      type: 'Technology Fellowship',
      benefits: '₱50,000 Semester Grant + Tech Certification Sponsorship',
      eligibilityRequirements: '2nd to 4th year Computer Science and Information Systems students.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID'
      ],
      slots: 20,
      totalSlots: 20,
      allowance: 5000,
      maxAmount: 50000,
      deadline: '2026-11-20',
      applicationDeadline: '2026-11-20',
      hasExam: false,
      examDetails: '',
      hasInterview: false,
      interviewDetails: '',
      selectionStages: ['1. Academic Screening', '2. Award Confirmation'],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: 'open',
      created_at: now,
    },

    // Provider 104: Aboitiz
    {
      id: 1007,
      sponsor_id: 104,
      provider_id: 104,
      providerId: 104,
      organization_name: 'Aboitiz Foundation',
      title: 'Aboitiz Future Leaders Academic Scholarship',
      description: 'Empowering future leaders through academic excellence and nation-building initiatives across the Philippines.',
      type: 'Academic Scholarship',
      benefits: 'Full Tuition Subsidy + Book Allowance + ₱10,000 Monthly Living Allowance',
      eligibilityRequirements: 'Top 10% of class or minimum GWA 1.50 in Engineering, Business, or IT.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID',
        'Recommendation Letter'
      ],
      slots: 18,
      totalSlots: 18,
      allowance: 10000,
      maxAmount: 120000,
      deadline: '2026-11-25',
      applicationDeadline: '2026-11-25',
      hasExam: true,
      examDetails: 'Leadership & Logical Reasoning Test',
      hasInterview: true,
      interviewDetails: 'Panel Interview with Aboitiz Foundation Trustees',
      selectionStages: ['1. Document Review', '2. Assessment Test', '3. Final Interview', '4. Awarding'],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: 'open',
      created_at: now,
    },
    {
      id: 1008,
      sponsor_id: 104,
      provider_id: 104,
      providerId: 104,
      organization_name: 'Aboitiz Foundation',
      title: 'Aboitiz Clean Energy & Tech Grant',
      description: 'Specialized scholarship for students focusing on renewable energy, environmental science, and sustainable engineering.',
      type: 'Sustainability Grant',
      benefits: '₱60,000 Annual Assistance + Mentorship with AboitizPower Engineers',
      eligibilityRequirements: 'Engineering and Applied Sciences students with passion for green tech.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID'
      ],
      slots: 12,
      totalSlots: 12,
      allowance: 6000,
      maxAmount: 60000,
      deadline: '2026-12-10',
      applicationDeadline: '2026-12-10',
      hasExam: false,
      examDetails: '',
      hasInterview: false,
      interviewDetails: '',
      selectionStages: ['1. Academic & Intent Review', '2. Selection Announcement'],
      criteria_json: JSON.stringify({ gpa: 45, financialNeed: 25, achievements: 20, other: 10 }),
      status: 'open',
      created_at: now,
    },

    // Provider 105: Megaworld
    {
      id: 1009,
      sponsor_id: 105,
      provider_id: 105,
      providerId: 105,
      organization_name: 'Megaworld Foundation',
      title: 'Megaworld Foundation Academic Excellence Scholarship',
      description: 'Prestigious grant supporting exceptional university students across architecture, engineering, and digital arts.',
      type: 'Academic Excellence Grant',
      benefits: '100% Tuition Covered + ₱9,000 Monthly Allowance + Career Guarantee',
      eligibilityRequirements: 'Minimum 1.75 GWA with no failing grades in any enrolled subject.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Official Transcript of Records (TOR)',
        'Valid School ID',
        'Proof of Household Income'
      ],
      slots: 25,
      totalSlots: 25,
      allowance: 9000,
      maxAmount: 108000,
      deadline: '2026-11-28',
      applicationDeadline: '2026-11-28',
      hasExam: false,
      examDetails: '',
      hasInterview: true,
      interviewDetails: 'Megaworld Leadership Interview',
      selectionStages: ['1. Screening', '2. Panel Interview', '3. Awarding'],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: 'open',
      created_at: now,
    },
    {
      id: 1010,
      sponsor_id: 105,
      provider_id: 105,
      providerId: 105,
      organization_name: 'Megaworld Foundation',
      title: 'Megaworld Digital & Creative Arts Scholarship',
      description: 'Nurturing the next generation of creative designers, digital animators, multimedia artists, and game developers.',
      type: 'Creative Arts Fellowship',
      benefits: '₱50,000 Semester Grant + Design Software Licenses + Hardware Grant',
      eligibilityRequirements: 'Multimedia Arts, Fine Arts, and Digital Animation majors.',
      requirements: [
        'Certificate of Enrollment (COE)',
        'Valid School ID',
        'Creative Portfolio (PDF / Link)'
      ],
      slots: 15,
      totalSlots: 15,
      allowance: 5000,
      maxAmount: 50000,
      deadline: '2026-12-05',
      applicationDeadline: '2026-12-05',
      hasExam: false,
      examDetails: '',
      hasInterview: false,
      interviewDetails: '',
      selectionStages: ['1. Portfolio Review', '2. Awarding'],
      criteria_json: JSON.stringify({ gpa: 35, financialNeed: 25, achievements: 30, other: 10 }),
      status: 'open',
      created_at: now,
    }
  ];

  const allUsers = [...admins, ...providers, ...students];

  const statePayload = {
    _id: STATE_DOC_ID,
    users: allUsers,
    student_profiles,
    scholarships,
    applications: [],
    documents: [],
    otps: [],
    schedules: [],
    manual_review_logs: [],
    ocr_extractions: [],
    automatic_check_results: [],
    conversations: [],
    messages: [],
    notifications: [],
    audit_logs: [],
    nextIds: {
      users: 300,
      student_profiles: 10,
      scholarships: 2000,
      applications: 1,
      documents: 1,
      otps: 1,
      schedules: 1,
      manual_review_logs: 1,
      ocr_extractions: 1,
      automatic_check_results: 1,
      conversations: 1,
      messages: 1,
      notifications: 1,
      audit_logs: 1,
    }
  };

  console.log('🧹 Replacing state document in app_state collection...');
  const stateColl = db.collection('app_state');
  await stateColl.replaceOne({ _id: STATE_DOC_ID }, statePayload, { upsert: true });
  await db.collection('state').deleteMany({}).catch(() => {});

  // Sync individual Mongoose collections
  console.log('🔄 Syncing Mongoose collections...');

  // Users collection
  const usersColl = db.collection('users');
  await usersColl.deleteMany({});
  for (const u of allUsers) {
    await usersColl.insertOne({
      _id: String(u.id),
      userId: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.password,
      role: u.role,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      isSuspended: false,
      isDeleted: false,
      sponsor_verified: u.sponsor_verified,
      organization_verified: u.organization_verified,
      company: u.company || '',
      organization_name: u.organization_name || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Students collection
  const studentsColl = db.collection('students');
  await studentsColl.deleteMany({});
  for (const sp of student_profiles) {
    await studentsColl.insertOne({
      _id: String(sp.id),
      userId: sp.user_id,
      email: sp.email,
      firstName: sp.name.split(' ')[0],
      lastName: sp.name.split(' ').slice(1).join(' '),
      school: sp.school,
      course: sp.course,
      yearLevel: sp.year_level,
      gpa: sp.gpa,
      familyIncome: sp.family_income,
      isVerified: true,
      verificationStatus: 'verified',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Providers collection
  const providersColl = db.collection('providers');
  await providersColl.deleteMany({});
  for (const p of providers) {
    await providersColl.insertOne({
      _id: String(p.id),
      userId: p.id,
      email: p.email,
      organizationName: p.organization_name,
      contactNumber: '+639171234567',
      industry: 'Education & Philanthropy',
      registrationNumber: `SEC-${p.id}-2026`,
      operatingRegions: ['National Capital Region (NCR)', 'Region IV-A', 'Region VII'],
      verificationStatus: 'approved',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Scholarships collection
  const scholarshipsColl = db.collection('scholarships');
  await scholarshipsColl.deleteMany({});
  for (const s of scholarships) {
    await scholarshipsColl.insertOne({
      _id: String(s.id),
      providerId: s.provider_id,
      sponsor_id: s.sponsor_id,
      title: s.title,
      description: s.description,
      type: s.type,
      benefits: s.benefits,
      eligibilityRequirements: s.eligibilityRequirements,
      totalSlots: s.slots,
      slots: s.slots,
      allowance: s.allowance,
      maxAmount: s.maxAmount,
      applicationDeadline: new Date(s.deadline),
      deadline: s.deadline,
      requirements: s.requirements,
      selectionStages: s.selectionStages,
      hasExam: s.hasExam,
      examDetails: s.examDetails,
      hasInterview: s.hasInterview,
      interviewDetails: s.interviewDetails,
      criteria_json: s.criteria_json,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Clean remaining collections
  await db.collection('scholarshipapplications').deleteMany({});
  await db.collection('applications').deleteMany({});
  await db.collection('documents').deleteMany({});
  await db.collection('conversations').deleteMany({});
  await db.collection('messages').deleteMany({});
  await db.collection('notifications').deleteMany({});
  await db.collection('schedules').deleteMany({});
  await db.collection('auditlogs').deleteMany({});
  await db.collection('manualreviewlogs').deleteMany({});

  console.log('✅ Clean database seeded successfully:');
  console.log(`   - 2 Admins`);
  console.log(`   - 5 Providers`);
  console.log(`   - 5 Students`);
  console.log(`   - 10 Scholarships (2 per provider)`);
  console.log(`   - Unique synthetic credentials generated and stored in test store.`);

  await client.close();
}

seedCleanDatabase().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
