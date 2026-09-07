const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

/* ================= CONFIG ================= */
const primaryUri = process.env.MONGO_URI;

const resolveDbName = (uri) => {
  if (!uri) return 'iskolar';
  try {
    const match = uri.match(/(?:mongodb(?:\+srv)?:\/\/[^\/]+)\/([^?]+)/);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim();
    }
  } catch (_) {}
  return 'iskolar';
};

const fallbackUri = 'mongodb://127.0.0.1:27017/iskolar';
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.RENDER === 'true';

if (isProd && primaryUri) {
  const lower = primaryUri.toLowerCase();
  if (lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('::1')) {
    console.error('❌ [FATAL] Local MongoDB is strictly forbidden in deployed configuration.');
    throw new Error('FATAL: Local MongoDB (localhost/127.0.0.1) is strictly forbidden in deployed configuration. A valid MongoDB Atlas connection is required.');
  }
}

/* ================= SAFE DB STATE ================= */
const db = {
  data: {
    users: [],
    student_profiles: [],
    scholarships: [],
    applications: [],
    documents: [],
    otps: [],
    schedules: [],
    manual_review_logs: [],
    ocr_extractions: [],
    automatic_check_results: [],

    nextIds: {
      users: 1,
      student_profiles: 1,
      scholarships: 1,
      applications: 1,
      documents: 1,
      otps: 1,
      schedules: 1,
      manual_review_logs: 1,
      ocr_extractions: 1,
      automatic_check_results: 1,
    },
  },

  async ping() {
    try {
      if (!mongoClientInstance) return false;
      const res = await mongoClientInstance.db().command({ ping: 1 });
      return res && res.ok === 1;
    } catch (_) {
      return false;
    }
  },

  async read() {
    try {
      if (!this.collections) return;
      const { withRetry } = require('../utils/resilience');
      await withRetry(async () => {
        // Authoritative Database Persistence:
        // Always load system sequence counters and worker lease state
        const metaDoc = await this.collections.system_metadata.findOne({ _id: 'counters' });
        if (metaDoc && metaDoc.nextIds) {
          this.data.nextIds = { ...this.data.nextIds, ...metaDoc.nextIds };
        }
      }, { retries: 3, baseDelayMs: 200, name: 'db.readCounters' });
    } catch (err) {
      console.error('✗ DB READ ERROR:', err?.message || err);
      if (isProd) throw err;
    }
  },

  async write(specificCollection) {
    if (isProd) {
      // In production, generic bulk-upserting of in-memory arrays is completely disabled (Directive 2).
      // Mutating operations must write directly and atomically to authoritative MongoDB collections.
      if (specificCollection === 'worker_leases' && this.collections?.system_metadata && this.data.worker_leases) {
        await this.collections.system_metadata.updateOne(
          { _id: 'worker_leases' },
          { $set: { leases: this.data.worker_leases, updatedAt: new Date() } },
          { upsert: true }
        ).catch(() => {});
      }
      return;
    }

    try {
      if (!this.collections) return;
      const { withRetry } = require('../utils/resilience');

      const persistCollection = async (col, arr, idField = 'id') => {
        if (!col || !Array.isArray(arr) || arr.length === 0) return;
        const ops = arr.map((item) => {
          let filter;
          if (col === this.collections.users && item.email) {
            filter = { email: item.email };
          } else if (item[idField] != null) {
            filter = { [idField]: item[idField] };
          } else if (item.id != null) {
            filter = { id: item.id };
          } else {
            filter = { _id: item._id };
          }
          const { _id, ...clean } = JSON.parse(JSON.stringify(item));
          return {
            updateOne: {
              filter,
              update: { $set: clean },
              upsert: true,
            },
          };
        });
        if (ops.length > 0) {
          await col.bulkWrite(ops, { ordered: false });
        }
      };

      await withRetry(async () => {
        const writes = [];
        if (!specificCollection || specificCollection === 'users') {
          writes.push(persistCollection(this.collections.users, this.data.users, 'id'));
        }
        if (!specificCollection || specificCollection === 'student_profiles') {
          writes.push(persistCollection(this.collections.student_profiles, this.data.student_profiles, 'user_id'));
        }
        if (!specificCollection || specificCollection === 'scholarships') {
          writes.push(persistCollection(this.collections.scholarships, this.data.scholarships, 'id'));
        }
        if (!specificCollection || specificCollection === 'applications') {
          writes.push(persistCollection(this.collections.applications, this.data.applications, 'id'));
        }
        if (!specificCollection || specificCollection === 'documents') {
          writes.push(persistCollection(this.collections.documents, this.data.documents, 'id'));
        }
        if (!specificCollection || specificCollection === 'schedules') {
          writes.push(persistCollection(this.collections.schedules, this.data.schedules, 'id'));
        }
        if (!specificCollection || specificCollection === 'otps') {
          writes.push(persistCollection(this.collections.otps, this.data.otps, 'email'));
        }
        if (!specificCollection || specificCollection === 'manual_review_logs') {
          writes.push(persistCollection(this.collections.manual_review_logs, this.data.manual_review_logs, 'documentId'));
        }
        if (!specificCollection || specificCollection === 'ocr_extractions') {
          writes.push(persistCollection(this.collections.ocr_extractions, this.data.ocr_extractions, 'documentId'));
        }
        if (!specificCollection || specificCollection === 'automatic_check_results') {
          writes.push(persistCollection(this.collections.automatic_check_results, this.data.automatic_check_results, 'applicationId'));
        }
        if (!specificCollection || specificCollection === 'system_metadata' || specificCollection === 'worker_leases') {
          writes.push(
            this.collections.system_metadata.updateOne(
              { _id: 'counters' },
              { $set: { nextIds: this.data.nextIds, updatedAt: new Date() } },
              { upsert: true }
            )
          );
          if (this.data.worker_leases) {
            writes.push(
              this.collections.system_metadata.updateOne(
                { _id: 'worker_leases' },
                { $set: { leases: this.data.worker_leases, updatedAt: new Date() } },
                { upsert: true }
              )
            );
          }
        }
        await Promise.all(writes);
      }, { retries: 3, baseDelayMs: 250, name: 'db.writeDiscrete' });
    } catch (err) {
      console.error('✗ DB WRITE ERROR:', err?.message || err);
      if (isProd) throw err;
    }
  },

  /**
   * Dual-persistence sync helper for applications (decommissioned for Directive 3).
   * Canonical data storage is the discrete collection 'applications'.
   */
  async syncApplication(_appData) {
    return null;
  },
};

/* ================= ID GENERATORS ================= */
const createAtomicId = async (type) => {
  if (db.collections?.system_metadata) {
    try {
      const res = await db.collections.system_metadata.findOneAndUpdate(
        { _id: `counter_${type}` },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      const doc = res?.value || res;
      if (doc && typeof doc.seq === 'number') {
        return doc.seq;
      }
    } catch (_) {}
  }
  const suffix = Math.floor(Math.random() * 89999 + 10000);
  return Number(`${Date.now().toString().slice(-6)}${suffix}`);
};

const createId = (type) => {
  if (!db.data.nextIds) db.data.nextIds = {};
  if (!db.data.nextIds[type]) {
    db.data.nextIds[type] = 1;
  }

  const id = db.data.nextIds[type];
  db.data.nextIds[type] += 1;

  // Collision-safe unique ID in multi-instance cluster
  const suffix = Math.floor(Math.random() * 8999 + 1000);
  const uniqueId = Number(`${id}${suffix}`);
  return uniqueId;
};


let connectPromise = null;
let mongoClientInstance = null;
let lastClientFailure = 0;
const CLIENT_RETRY_COOLDOWN_MS = 30000;

const seedDefaultUsers = async () => {
  if (!db.data) db.data = {};
  if (!db.data.users) db.data.users = [];
  if (!db.data.student_profiles) db.data.student_profiles = [];
  if (!db.data.scholarships) db.data.scholarships = [];
  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];
  if (!db.data.nextIds) db.data.nextIds = {};

  // If already populated in authoritative database or memory, don't overwrite
  if (db.collections?.users) {
    try {
      const userCount = await db.collections.users.countDocuments();
      if (userCount > 0) {
        return;
      }
    } catch (_) {}
  }
  if (db.data.users && db.data.users.length > 0 && db.data.scholarships && db.data.scholarships.length > 0) {
    return;
  }

  const bcrypt = require('bcrypt');
  const { getSyntheticPasswordForEmail } = require('./syntheticCredentials');
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

  db.data.users = [...admins, ...providers, ...students];
  db.data.student_profiles = student_profiles;
  db.data.scholarships = scholarships;
  db.data.applications = [];
  db.data.documents = [];
  db.data.otps = [];
  db.data.schedules = [];
  db.data.manual_review_logs = [];
  db.data.ocr_extractions = [];
  db.data.automatic_check_results = [];

  if (db.collections?.users) {
    try {
      const userCount = await db.collections.users.countDocuments();
      if (userCount === 0) {
        const seedUsers = [...admins, ...providers, ...students];
        await db.collections.users.bulkWrite(
          seedUsers.map((u) => ({
            updateOne: { filter: { email: u.email }, update: { $set: u }, upsert: true }
          })),
          { ordered: false }
        );
        if (db.collections.student_profiles) {
          await db.collections.student_profiles.bulkWrite(
            student_profiles.map((p) => ({
              updateOne: { filter: { user_id: p.user_id }, update: { $set: p }, upsert: true }
            })),
            { ordered: false }
          );
        }
        if (db.collections.scholarships) {
          await db.collections.scholarships.bulkWrite(
            scholarships.map((s) => ({
              updateOne: { filter: { id: s.id }, update: { $set: s }, upsert: true }
            })),
            { ordered: false }
          );
        }
        console.log('✓ Default seed users, student profiles, and scholarships populated into discrete MongoDB collections.');
      }
    } catch (e) {
      console.warn('⚠️ Seeding discrete collections error:', e.message);
    }
  }

  if (!isProd && db.collection) {
    try {
      await db.collection.replaceOne(
        { _id: 'iskolar_state' },
        { _id: 'iskolar_state', ...db.data },
        { upsert: true }
      );
    } catch (_) {}
  }
};

/* ================= CONNECT DB ================= */
const connectDb = async () => {
  const uriToUse = primaryUri || (!isProd ? fallbackUri : null);
  if (!uriToUse) {
    throw new Error('MONGO_URI is required (MongoClient for app_state)');
  }

  if (isProd) {
    const lower = uriToUse.toLowerCase();
    if (lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('::1')) {
      throw new Error('FATAL: Local MongoDB (localhost/127.0.0.1) is strictly forbidden in deployed configuration.');
    }
  }

  if (db.collection && mongoClientInstance) {
    try {
      await mongoClientInstance.db().command({ ping: 1 });
      return db;
    } catch (pingErr) {
      console.warn('⚠️ [MongoDB] MongoClient ping failed, reconnecting...', pingErr.message);
      db.collection = null;
      mongoClientInstance = null;
      connectPromise = null;
    }
  }

  if (!isProd && lastClientFailure && (Date.now() - lastClientFailure < CLIENT_RETRY_COOLDOWN_MS)) {
    return db;
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const client = new MongoClient(uriToUse, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: false,
      },
      maxPoolSize: 20,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 20000,
      serverSelectionTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
    });

    client.on('open', () => {
      console.log('✓ [MongoDB] connected');
    });

    client.on('close', () => {
      console.warn('⚠️ [MongoDB] disconnected');
      mongoClientInstance = null;
      db.client = null;
      db.collection = null;
      connectPromise = null;
      if (!db._isShuttingDown) {
        console.log('🔄 [MongoDB] reconnecting');
        setTimeout(() => {
          connectDb().catch((err) => {
            console.warn('⚠️ Background reconnect failed:', err?.message || err);
          });
        }, 2000);
      }
    });

    client.on('reconnect', () => {
      console.log('🔄 [MongoDB] reconnecting');
    });

    client.on('error', (err) => {
      console.error('✗ [MongoDB] connection error:', err?.message || err);
    });

    try {
      await client.connect();
      mongoClientInstance = client;
      db.client = client;

      const targetDbName = resolveDbName(uriToUse);
      const database = client.db(targetDbName);
      const legacyStateCollection = database.collection('app_state');

      db.collection = legacyStateCollection;
      db.collections = {
        users: database.collection('users'),
        student_profiles: database.collection('student_profiles'),
        scholarships: database.collection('scholarships'),
        applications: database.collection('applications'),
        documents: database.collection('documents'),
        schedules: database.collection('schedules'),
        otps: database.collection('otps'),
        manual_review_logs: database.collection('manual_review_logs'),
        ocr_extractions: database.collection('ocr_extractions'),
        automatic_check_results: database.collection('automatic_check_results'),
        system_metadata: database.collection('system_metadata'),
        app_state: legacyStateCollection, // PRESERVED 100% INTACT AS ROLLBACK EVIDENCE
      };
      db.lastError = null;

      console.log('✓ MongoDB connected to database', database.databaseName);

      // Auto-migrate legacy app_state into discrete collections if discrete collections are empty
      const userCount = await db.collections.users.countDocuments();
      if (userCount === 0) {
        const legacy = await legacyStateCollection.findOne({ _id: 'iskolar_state' });
        if (legacy && Array.isArray(legacy.users) && legacy.users.length > 0) {
          console.log('📦 Auto-migrating legacy app_state document into discrete collections...');
          const bulkInsert = async (col, arr, idField = 'id') => {
            if (!arr || arr.length === 0) return;
            const ops = arr.map((item) => {
              const filter =
                item[idField] != null
                  ? { [idField]: item[idField] }
                  : item.id != null
                  ? { id: item.id }
                  : { _id: item._id };
              const { _id, ...clean } = item;
              return { updateOne: { filter, update: { $set: clean }, upsert: true } };
            });
            await col.bulkWrite(ops, { ordered: false });
          };

          await bulkInsert(db.collections.users, legacy.users, 'id');
          await bulkInsert(db.collections.student_profiles, legacy.student_profiles, 'user_id');
          await bulkInsert(db.collections.scholarships, legacy.scholarships, 'id');
          await bulkInsert(db.collections.applications, legacy.applications, 'id');
          await bulkInsert(db.collections.documents, legacy.documents, 'id');
          await bulkInsert(db.collections.schedules, legacy.schedules, 'id');
          await bulkInsert(db.collections.otps, legacy.otps, 'email');
          await bulkInsert(db.collections.manual_review_logs, legacy.manual_review_logs, 'documentId');
          await bulkInsert(db.collections.ocr_extractions, legacy.ocr_extractions, 'documentId');
          await bulkInsert(db.collections.automatic_check_results, legacy.automatic_check_results, 'applicationId');

          if (legacy.nextIds) {
            await db.collections.system_metadata.updateOne(
              { _id: 'counters' },
              { $set: { nextIds: legacy.nextIds } },
              { upsert: true }
            );
          }
          console.log('✓ Discrete collections populated from legacy state (app_state preserved for rollback).');
        }
      }

      // Authoritative load from discrete collections
      await db.read();
      console.log('✓ Authoritative state loaded from discrete MongoDB collections.');

      await seedDefaultUsers();
      return db;
    } catch (err) {
      if (isProd) {
        console.error(`❌ [FATAL] Production database connection failed: ${err?.message || err}`);
        throw new Error(`FATAL: Production database connection failed: ${err?.message || err}`);
      }
      console.warn('⚠️ Running in development in-memory mode (no persistence)');

      db.lastError = err?.message || String(err);
      db.collection = null;

      if (!db.data.otps) db.data.otps = [];
      await seedDefaultUsers();

      connectPromise = null;
      lastClientFailure = Date.now();
      return db;
    }
  })();

  return connectPromise;
};

/* ================= EXPORT ================= */
module.exports = {
  db,
  createId,
  createAtomicId,
  connectDb,
  resolveDbName,
};
