const { db } = require('../config/db');

const getOverview = (req, res, next) => {
  try {
    const users = db.data.users || [];
    const scholarships = db.data.scholarships || [];
    const applications = db.data.applications || [];
    const documents = db.data.documents || [];

    const openScholarships = scholarships.filter((s) => s.status === 'open').length;
    const closedScholarships = scholarships.filter((s) => s.status === 'closed').length;
    const pendingProviderApprovals = users.filter((u) => (u.role === 'provider' || u.role === 'sponsor') && !u.sponsor_verified).length;
    const pendingOrganizationVerifications = users.filter((u) => (u.role === 'provider' || u.role === 'sponsor') && u.organization_documents && u.organization_documents.length && !u.organization_verified).length;

    const counts = {
      users: users.length,
      scholarships: scholarships.length,
      openScholarships,
      closedScholarships,
      applications: applications.length,
      documents: documents.length,
      pendingProviderApprovals,
      pendingOrganizationVerifications,
    };

    // return some recent entries for quick admin inspection
    const recentApplications = applications
      .slice()
      .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
      .slice(0, 10)
      .map((app) => {
        const user = users.find((u) => u.id === app.student_id) || {};
        const scholarship = scholarships.find((s) => s.id === app.scholarship_id) || {};
        return {
          id: app.id,
          student: { id: user.id, name: user.name, email: user.email },
          scholarship: { id: scholarship.id, title: scholarship.title },
          status: app.status,
          applied_at: app.applied_at,
        };
      });

    return res.json({ counts, recentApplications });
  } catch (error) {
    next(error);
  }
};

const listProviders = (req, res, next) => {
  try {
    const users = db.data.users || [];
    const scholarships = db.data.scholarships || [];
    const applications = db.data.applications || [];
    const documents = db.data.documents || [];

    // providers are users with role 'provider' or 'sponsor'
    const providers = users
      .filter((u) => u.role === 'provider' || u.role === 'sponsor')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        company: u.company || '',
        company_domain: u.company_domain || '',
        organization_website: u.organization_website || '',
        organization_documents: u.organization_documents || [],
        sponsor_verified: !!u.sponsor_verified,
        organization_verified: !!u.organization_verified,
        organization_email_matches_company_domain: !!u.organization_email_matches_company_domain,
        application_documents: [],
      }));

    // build helper maps
    const providersById = {};
    providers.forEach((p) => { providersById[p.id] = p; });

    const scholarshipById = {};
    scholarships.forEach((s) => { scholarshipById[s.id] = s; });

    // attach documents belonging to applications for scholarships owned by each provider
    applications.forEach((app) => {
      const scholarship = scholarshipById[app.scholarship_id];
      if (!scholarship) return;
      const sponsorId = scholarship.sponsor_id ?? scholarship.provider_id;
      const provider = providersById[sponsorId];
      if (!provider) return;
      // find documents for this application
      const docs = documents.filter((d) => d.application_id === app.id).map((d) => ({
        id: d.id,
        application_id: d.application_id,
        filename: d.filename,
        originalname: d.originalname,
        mime_type: d.mime_type,
        file_size: d.file_size,
        uploaded_at: d.uploaded_at,
        type: d.type,
        user_id: d.user_id,
      }));
      if (docs.length) {
        const student = users.find((u) => u.id === app.student_id) || {};
        provider.application_documents.push({
          scholarship_id: scholarship.id,
          scholarship_title: scholarship.title,
          application_id: app.id,
          student_id: app.student_id,
          student_name: student.name || null,
          student_email: student.email || null,
          status: app.status,
          applied_at: app.applied_at,
          documents: docs,
        });
      }
    });

    return res.json({ providers });
  } catch (error) {
    next(error);
  }
};

const approveProvider = async (req, res, next) => {
  try {
    const idStr = String(req.params.id);
    const user = db.data.users.find((u) => String(u.id) === idStr && (u.role === 'provider' || u.role === 'sponsor'));
    if (!user) return res.status(404).json({ message: 'Provider not found' });
    user.sponsor_verified = true;
    try { await db.write(); } catch (e) { console.error('DB write error:', e?.message); }
    return res.json({ user: { id: user.id, name: user.name, email: user.email, sponsor_verified: user.sponsor_verified } });
  } catch (error) {
    next(error);
  }
};

const verifyProviderOrganization = async (req, res, next) => {
  try {
    const idStr = String(req.params.id);
    const user = db.data.users.find((u) => String(u.id) === idStr && (u.role === 'provider' || u.role === 'sponsor'));
    if (!user) return res.status(404).json({ message: 'Provider not found' });
    if (!user.organization_documents || !user.organization_documents.length) {
      return res.status(400).json({ message: 'Provider must upload organization proof before verification' });
    }
    user.organization_verified = true;
    try { await db.write(); } catch (e) { console.error('DB write error:', e?.message); }
    return res.json({ user: { id: user.id, name: user.name, email: user.email, organization_verified: user.organization_verified } });
  } catch (error) {
    next(error);
  }
};

const listScholarships = (req, res, next) => {
  try {
    const scholarships = db.data.scholarships || [];
    const users = db.data.users || [];
    const applications = db.data.applications || [];

    const formatted = scholarships
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((scholarship) => {
        const sponsor = users.find((u) => u.id === scholarship.sponsor_id) || {};
        return {
          ...scholarship,
          sponsor_name: sponsor.name || 'Unknown sponsor',
          sponsor_email: sponsor.email || 'Unknown email',
          sponsor_verified: !!sponsor.sponsor_verified,
          organization_verified: !!sponsor.organization_verified,
          application_count: applications.filter((app) => app.scholarship_id === scholarship.id).length,
          criteria: JSON.parse(scholarship.criteria_json || '{}'),
        };
      });

    return res.json({ scholarships: formatted });
  } catch (error) {
    next(error);
  }
};

const updateScholarshipStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value. Use open or closed.' });
    }
    const scholarship = db.data.scholarships.find((item) => item.id === id);
    if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });
    scholarship.status = status;
    try { await db.write(); } catch (e) { console.error('DB write error:', e?.message); }
    return res.json({ scholarship: { ...scholarship, criteria: JSON.parse(scholarship.criteria_json || '{}') } });
  } catch (error) {
    next(error);
  }
};

const listStudents = async (req, res, next) => {
  try {
    const { Student } = require('../models');
    const mongoose = require('mongoose');
    const users = db.data.users || [];
    const studentProfiles = db.data.student_profiles || [];

    const studentsByUserId = {};

    // 1. Include student users from JSON database
    users
      .filter((u) => u.role === 'student' || u.role === 'applicant')
      .forEach((user) => {
        const profile = studentProfiles.find((p) => String(p.user_id) === String(user.id)) || {};
        studentsByUserId[String(user.id)] = {
          id: user.id,
          email: user.email,
          name: user.name || '',
          lrn: profile.lrn || '',
          schoolName: profile.schoolName || profile.school || '',
          gpa: profile.gpa || null,
          familyIncome: profile.family_income || null,
          verificationStatus: user.verificationStatus || profile.verificationStatus || 'pending',
          isVerified: !!(user.emailVerified || profile.isVerified),
          createdAt: user.created_at,
          profileType: 'json',
        };
      });

    // 2. Merge Mongoose Student records if connected
    if (mongoose.connection.readyState === 1 && Student && typeof Student.find === 'function') {
      try {
        const mongoStudents = await Student.find().lean();
        mongoStudents.forEach((st) => {
          const key = String(st.userId || st._id);
          const existing = studentsByUserId[key] || {};
          studentsByUserId[key] = {
            ...existing,
            id: st.userId || st._id,
            email: st.email || existing.email || '',
            name: st.firstName ? `${st.firstName} ${st.lastName || ''}`.trim() : existing.name || '',
            lrn: st.lrn || existing.lrn || '',
            schoolName: st.schoolName || existing.schoolName || '',
            gpa: st.gpa || existing.gpa || null,
            familyIncome: st.familyIncome || existing.familyIncome || null,
            verificationStatus: st.verificationStatus || existing.verificationStatus || 'pending',
            isVerified: st.isVerified !== undefined ? !!st.isVerified : existing.isVerified,
            createdAt: st.createdAt || existing.createdAt,
            profileType: 'mongo',
          };
        });
      } catch (err) {
        console.warn('⚠️ Mongoose listStudents query notice:', err?.message);
      }
    }

    const students = Object.values(studentsByUserId);
    return res.json({
      students,
      total: students.length,
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const mongoose = require('mongoose');

    let logs = [];
    if (mongoose.connection.readyState === 1) {
      logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate('actorUserId', 'email role name');
    }

    return res.json({ logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  listProviders,
  approveProvider,
  verifyProviderOrganization,
  listScholarships,
  updateScholarshipStatus,
  listStudents,
  getAuditLogs,
};

