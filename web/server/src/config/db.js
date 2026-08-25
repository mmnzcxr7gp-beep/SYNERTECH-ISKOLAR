const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

/* ================= CONFIG ================= */
const primaryUri = process.env.MONGO_URI;

console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
const fallbackUri = 'mongodb://127.0.0.1:27017/iskolar';
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.RENDER === 'true';

const stateDocumentId = 'iskolar_state';

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

  async read() {
    try {
      if (!this.collection) return;
      const existing = await this.collection.findOne({ _id: stateDocumentId });
      if (existing) {
        const { _id, ...rest } = existing;
        this.data.users = rest.users || [];
        this.data.student_profiles = rest.student_profiles || [];
        this.data.scholarships = rest.scholarships || [];
        this.data.applications = rest.applications || [];
        this.data.documents = rest.documents || [];
        this.data.otps = rest.otps || [];
        this.data.schedules = rest.schedules || [];
        this.data.manual_review_logs = rest.manual_review_logs || [];
        this.data.ocr_extractions = rest.ocr_extractions || [];
        this.data.automatic_check_results = rest.automatic_check_results || [];
        this.data.nextIds = { ...this.data.nextIds, ...(rest.nextIds || {}) };
      }
    } catch (err) {
      console.error('✗ DB READ ERROR:', err?.message || err);
    }
  },

  async write() {
    try {
      if (!this.collection) return;

      // Fetch latest DB state to merge across instances
      const remote = await this.collection.findOne({ _id: stateDocumentId });
      if (remote) {
        const mergeByKey = (localArr = [], remoteArr = [], keyFn = (x) => x?.id) => {
          const map = new Map();
          for (const item of (remoteArr || [])) {
            const k = keyFn(item);
            if (k != null) map.set(String(k), item);
          }
          for (const item of (localArr || [])) {
            const k = keyFn(item);
            if (k != null) map.set(String(k), item);
          }
          return Array.from(map.values());
        };

        this.data.users = mergeByKey(this.data.users, remote.users);
        this.data.student_profiles = mergeByKey(this.data.student_profiles, remote.student_profiles, (x) => x?.id || x?.user_id);
        this.data.scholarships = mergeByKey(this.data.scholarships, remote.scholarships);
        this.data.applications = mergeByKey(this.data.applications, remote.applications);
        this.data.documents = mergeByKey(this.data.documents, remote.documents);
        this.data.schedules = mergeByKey(this.data.schedules, remote.schedules);
        this.data.otps = mergeByKey(this.data.otps, remote.otps);
        this.data.manual_review_logs = mergeByKey(this.data.manual_review_logs, remote.manual_review_logs, (x) => x?.documentId || x?.id);
        this.data.ocr_extractions = mergeByKey(this.data.ocr_extractions, remote.ocr_extractions, (x) => x?.documentId || x?.id);
        this.data.automatic_check_results = mergeByKey(this.data.automatic_check_results, remote.automatic_check_results, (x) => x?.id || x?.applicationId);

        for (const k of Object.keys(this.data.nextIds || {})) {
          this.data.nextIds[k] = Math.max(this.data.nextIds[k] || 1, remote.nextIds?.[k] || 1);
        }
      }



      // Phase 5: Retry transient MongoDB write failures
      const { withRetry } = require('../utils/resilience');
      await withRetry(
        () => this.collection.updateOne(
          { _id: stateDocumentId },
          { $set: this.data },
          { upsert: true }
        ),
        { retries: 3, baseDelayMs: 500, name: 'db.write' }
      );
    } catch (err) {
      console.error('✗ DB WRITE ERROR:', err?.message || err);
    }
  },

  /**
   * Dual-persistence sync helper for applications.
   * Authoritative MongoDB write executed first when connected, updating db.data cache.
   */
  async syncApplication(appData) {
    if (!appData || !appData.student_id || !appData.scholarship_id) {
      throw new Error('Invalid application data: student_id and scholarship_id required');
    }

    const mongoose = require('mongoose');
    let mongoDoc = null;

    if (mongoose.connection.readyState === 1) {
      const { ScholarshipApplication } = require('../models');
      if (ScholarshipApplication) {
        const statusMap = {
          approved: 'APPROVED',
          rejected: 'DENIED',
          pending: 'SUBMITTED',
          under_review: 'UNDER_REVIEW',
          ranked: 'PENDING_PRE_SCREENING',
        };
        const normalizedStatus = statusMap[String(appData.status).toLowerCase()] || String(appData.status).toUpperCase();

        mongoDoc = await ScholarshipApplication.findOneAndUpdate(
          { $or: [{ _id: appData.id }, { studentId: appData.student_id, scholarshipId: appData.scholarship_id }] },
          {
            $set: {
              studentId: appData.student_id,
              scholarshipId: appData.scholarship_id,
              status: normalizedStatus,
              appliedAt: appData.applied_at || new Date(),
              weightedScore: appData.score || 0,
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    return mongoDoc;
  },
};

/* ================= ID GENERATOR ================= */
const createId = (type) => {
  if (!db.data.nextIds) db.data.nextIds = {};
  if (!db.data.nextIds[type]) {
    db.data.nextIds[type] = 1;
  }

  const id = db.data.nextIds[type];
  db.data.nextIds[type] += 1;

  // Collision-safe unique ID in multi-instance cluster
  const suffix = Math.floor(Math.random() * 899 + 100);
  const uniqueId = Number(`${id}${suffix}`);
  return uniqueId;
};


let connectPromise = null;
let mongoClientInstance = null;

const seedDefaultUsers = async () => {
  if (!db.data.users) db.data.users = [];
  if (!db.data.student_profiles) db.data.student_profiles = [];
  if (!db.data.scholarships) db.data.scholarships = [];
  if (!db.data.applications) db.data.applications = [];
  if (!db.data.documents) db.data.documents = [];
  if (!db.data.nextIds) db.data.nextIds = {};
  if (!db.data.nextIds.users) db.data.nextIds.users = 1;

  const bcrypt = require('bcrypt');

  const defaultUsers = [
    { email: 'admin@iskolar.ph', password: 'Password123!', name: 'System Admin', role: 'admin' },
    { email: 'admin@iskolar.com', password: 'Admin@1234', name: 'Default Admin', role: 'admin' },
    { email: 'provider@iskolar.ph', password: 'Password123!', name: 'Future Leaders Foundation', role: 'provider' },
    { email: 'provider@iskolar.com', password: 'Provider@1234', name: 'Default Provider', role: 'provider' },
    { email: 'sponsor@iskolar.com', password: 'Sponsor@1234', name: 'Default Sponsor', role: 'sponsor' },
    
    // 20 Diverse Seeded Providers with Different Program Needs
    { email: 'jollibee.foundation@iskolar.ph', password: 'Password123!', name: 'Jollibee Group Foundation', role: 'provider', company: 'Jollibee Foods Corporation' },
    { email: 'globe.stem@iskolar.ph', password: 'Password123!', name: 'Globe Telecom STEM Innovators', role: 'provider', company: 'Globe Telecom Inc.' },
    { email: 'gokongwei.brothers@iskolar.ph', password: 'Password123!', name: 'Gokongwei Brothers Foundation', role: 'provider', company: 'JG Summit Holdings' },
    { email: 'metrobank.foundation@iskolar.ph', password: 'Password123!', name: 'Metrobank Foundation CARE', role: 'provider', company: 'Metrobank Group' },
    { email: 'sm.foundation@iskolar.ph', password: 'Password123!', name: 'SM Foundation Inc.', role: 'provider', company: 'SM Investments Corporation' },
    { email: 'ayala.foundation@iskolar.ph', password: 'Password123!', name: 'Ayala Foundation Inc.', role: 'provider', company: 'Ayala Corporation' },
    { email: 'aboitiz.foundation@iskolar.ph', password: 'Password123!', name: 'Aboitiz Foundation Energy', role: 'provider', company: 'Aboitiz Equity Ventures' },
    { email: 'dost.sei@iskolar.ph', password: 'Password123!', name: 'DOST Science Education Institute', role: 'provider', company: 'Department of Science and Technology' },
    { email: 'ched.r4a@iskolar.ph', password: 'Password123!', name: 'CHED Region IV-A Council', role: 'provider', company: 'Commission on Higher Education' },
    { email: 'securitybank.foundation@iskolar.ph', password: 'Password123!', name: 'Security Bank Foundation', role: 'provider', company: 'Security Bank Corporation' },
    { email: 'unilab.foundation@iskolar.ph', password: 'Password123!', name: 'Unilab Foundation Bayanihan', role: 'provider', company: 'Unilab Inc.' },
    { email: 'megaworld.foundation@iskolar.ph', password: 'Password123!', name: 'Megaworld Foundation Design', role: 'provider', company: 'Megaworld Corporation' },
    { email: 'sanmiguel.foundation@iskolar.ph', password: 'Password123!', name: 'San Miguel Corporation CSR', role: 'provider', company: 'San Miguel Corporation' },
    { email: 'pldtsmart.foundation@iskolar.ph', password: 'Password123!', name: 'PLDT Smart Foundation', role: 'provider', company: 'PLDT Inc. & Smart Communications' },
    { email: 'magsaysay.foundation@iskolar.ph', password: 'Password123!', name: 'Ramon Magsaysay Foundation', role: 'provider', company: 'Ramon Magsaysay Award Foundation' },
    { email: 'mondenissin.foundation@iskolar.ph', password: 'Password123!', name: 'Monde Nissin CSR', role: 'provider', company: 'Monde Nissin Corporation' },
    { email: 'bpi.foundation@iskolar.ph', password: 'Password123!', name: 'BPI Empowering Communities', role: 'provider', company: 'Bank of the Philippine Islands' },
    { email: 'pal.foundation@iskolar.ph', password: 'Password123!', name: 'Philippine Airlines Aviation', role: 'provider', company: 'Philippine Airlines Inc.' },
    { email: 'bdo.foundation@iskolar.ph', password: 'Password123!', name: 'BDO Unibank Foundation', role: 'provider', company: 'BDO Unibank Inc.' },
    { email: 'qc.iskolar@iskolar.ph', password: 'Password123!', name: 'Quezon City LGU Iskolar', role: 'provider', company: 'Quezon City Local Government' },

    // 10 Seeded Students
    { email: 'juan.delacruz@iskolar.ph', password: 'Password123!', name: 'Juan Delacruz', role: 'student', school: 'UP Diliman', course: 'BS Computer Science', gpa: 1.25 },
    { email: 'maria.santos@iskolar.ph', password: 'Password123!', name: 'Maria Santos', role: 'student', school: 'PUP Manila', course: 'BS Information Technology', gpa: 1.40 },
    { email: 'mark.reyes@iskolar.ph', password: 'Password123!', name: 'Mark Reyes', role: 'student', school: 'UST Manila', course: 'BS Civil Engineering', gpa: 1.65 },
    { email: 'ana.garcia@iskolar.ph', password: 'Password123!', name: 'Ana Garcia', role: 'student', school: 'DLSU Manila', course: 'BS Accountancy', gpa: 1.30 },
    { email: 'carlo.mendoza@iskolar.ph', password: 'Password123!', name: 'Carlo Mendoza', role: 'student', school: 'Mapúa University', course: 'BS Electronics Engineering', gpa: 1.75 },
    { email: 'bea.aquino@iskolar.ph', password: 'Password123!', name: 'Bea Aquino', role: 'student', school: 'FEU Manila', course: 'BS Nursing', gpa: 1.50 },
    { email: 'christian.ramos@iskolar.ph', password: 'Password123!', name: 'Christian Ramos', role: 'student', school: 'Adamson University', course: 'BS Chemical Engineering', gpa: 1.85 },
    { email: 'diana.torres@iskolar.ph', password: 'Password123!', name: 'Diana Torres', role: 'student', school: 'PLM Manila', course: 'BS Computer Science', gpa: 1.20 },
    { email: 'eric.villanueva@iskolar.ph', password: 'Password123!', name: 'Eric Villanueva', role: 'student', school: 'Batangas State University', course: 'BS Mechanical Engineering', gpa: 1.60 },
    { email: 'grace.castro@iskolar.ph', password: 'Password123!', name: 'Grace Castro', role: 'student', school: 'SLU Baguio', course: 'BS Architecture', gpa: 1.45 },
  ];

  let modified = false;
  const userMap = {};

  for (const u of defaultUsers) {
    let existing = db.data.users.find(x => x.email && x.email.toLowerCase() === u.email.toLowerCase());
    if (!existing) {
      const nextId = createId('users');
      existing = {
        id: nextId,
        name: u.name,
        email: u.email,
        password: bcrypt.hashSync(u.password, 10),
        role: u.role,
        emailVerified: true,
        verificationStatus: 'verified',
        sponsor_verified: u.role === 'provider' || u.role === 'sponsor' ? true : undefined,
        organization_verified: u.role === 'provider' || u.role === 'sponsor' ? true : undefined,
        organization_documents: u.role === 'provider' || u.role === 'sponsor' ? ['seeded-proof.pdf'] : undefined,
        created_at: new Date().toISOString()
      };
      db.data.users.push(existing);
      modified = true;
    }
    userMap[u.email] = existing;

    // Seed student profile if student
    if (u.role === 'student' && u.school) {
      let prof = db.data.student_profiles.find(p => p.user_id === existing.id);
      if (!prof) {
        db.data.student_profiles.push({
          id: createId('student_profiles'),
          user_id: existing.id,
          name: u.name,
          email: u.email,
          school: u.school,
          course: u.course,
          gpa: u.gpa,
          family_income: 120000,
          isVerified: true,
          verificationStatus: 'verified',
        });
        modified = true;
      }
    }
  }

  // Seed Scholarships if empty
  if (db.data.scholarships.length < 20) {
    const rawProviders = [
      { email: 'jollibee.foundation@iskolar.ph', title: 'Jollibee Agro-Entrepreneurship & Culinary Scholarship', desc: 'BS Agriculture, Culinary Arts, Agribusiness major. GPA >= 2.0 (85%). Income < ₱200k.', slots: 25, allowance: 4500, maxAmount: 50000 },
      { email: 'globe.stem@iskolar.ph', title: 'Globe Digital Leaders Tech & Cybersecurity Grant', desc: 'BS Computer Science, IT, Cybersecurity, Data Science. GPA >= 1.5. Laptop + Stipend.', slots: 15, allowance: 8000, maxAmount: 90000 },
      { email: 'gokongwei.brothers@iskolar.ph', title: 'GBF Future Engineers & Scientists Scholarship', desc: 'BS Mechanical, Electrical, Chemical, Civil Engineering. GPA >= 1.75. Income < ₱350k.', slots: 30, allowance: 0, maxAmount: 60000 },
      { email: 'metrobank.foundation@iskolar.ph', title: 'Metrobank CARE Education & Nursing Grant', desc: 'BS Education & Nursing majors. GPA >= 1.75. Board exam assistance.', slots: 40, allowance: 5000, maxAmount: 40000 },
      { email: 'sm.foundation@iskolar.ph', title: 'SM College Education Assistance Program', desc: 'Accountancy, BS IT, BS Computer Engineering. GPA >= 2.0. Public HS graduate.', slots: 50, allowance: 4000, maxAmount: 75000 },
      { email: 'ayala.foundation@iskolar.ph', title: 'Ayala Young Leaders & Public Admin Grant', desc: 'Political Science, Public Admin, Economics. GPA >= 1.5. Community leadership track.', slots: 20, allowance: 5000, maxAmount: 100000 },
      { email: 'aboitiz.foundation@iskolar.ph', title: 'Aboitiz Clean Energy & Power Engineering Grant', desc: 'BS Electrical Engineering, Energy Engineering. GPA >= 1.75. State universities.', slots: 20, allowance: 6000, maxAmount: 70000 },
      { email: 'dost.sei@iskolar.ph', title: 'DOST-SEI Priority Science & Technology Scholarship', desc: 'DOST Priority S&T Courses (Physics, Math, Biotech, Chemistry). Exam score required.', slots: 100, allowance: 7000, maxAmount: 110000 },
      { email: 'ched.r4a@iskolar.ph', title: 'CHED Tulong Dunong Tertiary Education Grant (TDP)', desc: 'All CHED degree programs. Combined income <= ₱400,000. Passing GPA (3.0+).', slots: 200, allowance: 1500, maxAmount: 15000 },
      { email: 'securitybank.foundation@iskolar.ph', title: 'Security Bank Treasury & Finance Scholars Program', desc: 'Finance, Banking, Economics, Statistics (2nd-4th Yr). GPA >= 1.75. Income < ₱250k.', slots: 15, allowance: 5000, maxAmount: 85000 },
      { email: 'unilab.foundation@iskolar.ph', title: 'Unilab Bayanihan Health & Pharmacy Grant', desc: 'Pharmacy, MedTech, Nursing, Physical Therapy, Public Health. GPA >= 2.0.', slots: 35, allowance: 6000, maxAmount: 65000 },
      { email: 'megaworld.foundation@iskolar.ph', title: 'Megaworld Urban Design & Architecture Grant', desc: 'Architecture, Interior Design, Civil Engineering. GPA >= 1.75 + Design Portfolio.', slots: 12, allowance: 4000, maxAmount: 80000 },
      { email: 'sanmiguel.foundation@iskolar.ph', title: 'SMC Sustainable Food Security & Agriculture Grant', desc: 'Food Tech, Agriculture, Veterinary Medicine. Priority for farmer/fisherfolk kids.', slots: 40, allowance: 5000, maxAmount: 70000 },
      { email: 'pldtsmart.foundation@iskolar.ph', title: 'PLDT-Smart Connect Tech & Telecoms Scholarship', desc: 'Telecoms Engineering, Network Engineering, Software Engineering. GPA >= 1.5.', slots: 25, allowance: 7500, maxAmount: 95000 },
      { email: 'magsaysay.foundation@iskolar.ph', title: 'Ramon Magsaysay Social Entrepreneurship & Dev Grant', desc: 'Social Work, Sociology, Psychology, Entrepreneurship. Social impact proposal.', slots: 18, allowance: 5000, maxAmount: 80000 },
      { email: 'mondenissin.foundation@iskolar.ph', title: 'Monde Nissin Nutrition & Community Development Grant', desc: 'Nutrition & Dietetics, Food Science, Community Dev. GPA >= 2.0. Income < ₱200k.', slots: 30, allowance: 4000, maxAmount: 36000 },
      { email: 'bpi.foundation@iskolar.ph', title: 'BPI Empowering Communities Tech & Analytics Grant', desc: 'BS Computer Science, Information Systems, Business Analytics. GPA >= 1.5.', slots: 15, allowance: 6000, maxAmount: 100000 },
      { email: 'pal.foundation@iskolar.ph', title: 'PAL Future Aviators & Aerospace Engineering Scholarship', desc: 'Aeronautical Engineering, Aircraft Maintenance Tech. GPA >= 1.75. Physical fitness.', slots: 10, allowance: 0, maxAmount: 120000 },
      { email: 'bdo.foundation@iskolar.ph', title: 'BDO Futures Accounting & Internal Audit Scholarship', desc: 'BS Accountancy (3rd-4th Year). GPA >= 1.50. Guaranteed BDO Employment upon CPA board.', slots: 20, allowance: 5000, maxAmount: 90000 },
      { email: 'qc.iskolar@iskolar.ph', title: 'QC Iskolar ng Bayan Tertiary Educational Assistance', desc: 'Quezon City resident & voter. Any degree program. Income <= ₱300,000.', slots: 300, allowance: 2500, maxAmount: 20000 },
    ];

    for (const rp of rawProviders) {
      const pUser = userMap[rp.email] || userMap['provider@iskolar.ph'];
      const exists = db.data.scholarships.some((s) => s.title === rp.title);
      if (!exists && pUser) {
        db.data.scholarships.push({
          id: createId('scholarships'),
          sponsor_id: pUser.id,
          provider_id: pUser.id,
          title: rp.title,
          name: rp.title,
          description: rp.desc,
          eligibilityRequirements: rp.desc,
          benefits: rp.desc,
          type: rp.allowance > 0 ? 'Scholarship + Allowance' : 'Scholarship',
          status: 'open',
          slots: rp.slots,
          totalSlots: rp.slots,
          applicationDeadline: '2026-12-31T23:59:59.000Z',
          deadline: '2026-12-31',
          allowance: rp.allowance,
          maxAmount: rp.maxAmount,
          criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
          created_at: new Date().toISOString(),
        });
      }
    }
    modified = true;
  }

  // Seed Applications if empty
  if (db.data.applications.length === 0) {
    const schs = db.data.scholarships;
    const juan = userMap['juan.delacruz@iskolar.ph'];
    const maria = userMap['maria.santos@iskolar.ph'];
    const mark = userMap['mark.reyes@iskolar.ph'];
    const ana = userMap['ana.garcia@iskolar.ph'];
    const carlo = userMap['carlo.mendoza@iskolar.ph'];
    const bea = userMap['bea.aquino@iskolar.ph'];
    const christian = userMap['christian.ramos@iskolar.ph'];
    const diana = userMap['diana.torres@iskolar.ph'];
    const eric = userMap['eric.villanueva@iskolar.ph'];

    const seededApps = [
      { id: createId('applications'), scholarship_id: schs[0].id, student_id: juan.id, status: 'approved', score: 92.5, applied_at: new Date().toISOString() },
      { id: createId('applications'), scholarship_id: schs[0].id, student_id: maria.id, status: 'approved', score: 88.0, applied_at: new Date().toISOString() },
      { id: createId('applications'), scholarship_id: schs[1].id, student_id: ana.id, status: 'approved', score: 94.0, applied_at: new Date().toISOString() },
      { id: createId('applications'), scholarship_id: schs[3].id, student_id: diana.id, status: 'approved', score: 96.0, applied_at: new Date().toISOString() },

      { id: createId('applications'), scholarship_id: schs[0].id, student_id: mark.id, status: 'rejected', score: 65.0, applied_at: new Date().toISOString() },
      { id: createId('applications'), scholarship_id: schs[2].id, student_id: carlo.id, status: 'rejected', score: 60.0, applied_at: new Date().toISOString() },
      { id: createId('applications'), scholarship_id: schs[4].id, student_id: christian.id, status: 'rejected', score: 58.0, applied_at: new Date().toISOString() },

      { id: createId('applications'), scholarship_id: schs[1].id, student_id: bea.id, status: 'pending', score: 82.0, applied_at: new Date().toISOString() },
      { id: createId('applications'), scholarship_id: schs[3].id, student_id: eric.id, status: 'pending', score: 79.5, applied_at: new Date().toISOString() },
    ];

    db.data.applications.push(...seededApps);

    // Seed dummy document proofs for each application so preview buttons work cleanly
    for (const app of seededApps) {
      db.data.documents.push({
        id: createId('documents'),
        application_id: app.id,
        user_id: app.student_id,
        requirement_name: 'Student ID & Transcript',
        originalname: 'student_document_proof.pdf',
        filename: 'seeded_proof.pdf',
        mime_type: 'application/pdf',
        uploaded_at: new Date().toISOString(),
        url: '/uploads/seeded_proof.pdf',
      });
    }
    modified = true;
  }

  if (modified) {
    try {
      if (db.collection) {
        await db.collection.updateOne(
          { _id: stateDocumentId },
          { $set: db.data },
          { upsert: true }
        );
      }
    } catch (writeErr) {
      console.error('✗ Failed to write seeded users to database:', writeErr.message);
    }
  }
};

/* ================= CONNECT DB ================= */
const connectDb = async () => {
  const uriToUse = primaryUri || (!isProd ? fallbackUri : null);
  if (!uriToUse) {
    throw new Error('MONGO_URI is required (MongoClient for app_state)');
  }

  if (db.collection && mongoClientInstance) {
    try {
      await mongoClientInstance.db().command({ ping: 1 });
      return db;
    } catch (pingErr) {
      console.warn('⚠️ MongoClient ping failed, reconnecting...', pingErr.message);
      db.collection = null;
      mongoClientInstance = null;
      connectPromise = null;
    }
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const client = new MongoClient(uriToUse, {
      maxPoolSize: 2,
      minPoolSize: 1,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    try {
      await client.connect();
      mongoClientInstance = client;

      const database = client.db();
      const collection = database.collection('app_state');

      db.collection = collection;
      db.lastError = null;

      console.log('✓ MongoDB connected to database', database.databaseName);

      const existing = await collection.findOne({ _id: stateDocumentId });

      if (existing) {
        const { _id, ...rest } = existing;

        db.data = {
          ...db.data,
          ...rest,
          otps: rest.otps || [],
          nextIds: {
            ...db.data.nextIds,
            ...(rest.nextIds || {}),
          },
        };

        if (!db.data.otps) db.data.otps = [];
        console.log('✓ DB state loaded');
      } else {
        await collection.insertOne({
          _id: stateDocumentId,
          ...db.data,
        });

        console.log('✓ DB state initialized');
      }

      await seedDefaultUsers();
      return db;
    } catch (err) {
      if (isProd) {
        throw new Error(`FATAL: Production database connection failed: ${err?.message || err}`);
      }
      console.warn('⚠️ Running in development in-memory mode (no persistence)');

      db.lastError = err?.message || String(err);
      db.collection = null;

      if (!db.data.otps) db.data.otps = [];
      await seedDefaultUsers();

      connectPromise = null;
      return db;
    }
  })();

  return connectPromise;
};

/* ================= EXPORT ================= */
module.exports = {
  db,
  createId,
  connectDb,
};
