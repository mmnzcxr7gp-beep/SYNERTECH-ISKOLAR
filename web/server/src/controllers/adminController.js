const mongoose = require('mongoose');
const { db } = require('../config/db');
const AuditLog = require('../models/AuditLog');
const Scholarship = require('../models/Scholarship');

const getOverview = (req, res, next) => {
  try {
    const users = db.data.users || [];
    const scholarships = db.data.scholarships || [];
    const applications = db.data.applications || [];
    const documents = db.data.documents || [];

    const openScholarships = scholarships.filter((s) => s.status === 'open' && !s.isDeleted).length;
    const closedScholarships = scholarships.filter((s) => s.status === 'closed' || s.isDeleted).length;
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

    const providersById = {};
    providers.forEach((p) => { providersById[p.id] = p; });

    const scholarshipById = {};
    scholarships.forEach((s) => { scholarshipById[s.id] = s; });

    applications.forEach((app) => {
      const scholarship = scholarshipById[app.scholarship_id];
      if (!scholarship) return;
      const sponsorId = scholarship.sponsor_id ?? scholarship.provider_id ?? scholarship.providerId;
      const provider = providersById[sponsorId];
      if (!provider) return;
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
      .filter((s) => !s.isDeleted)
      .slice()
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
      .map((scholarship) => {
        const sponsorId = scholarship.sponsor_id ?? scholarship.provider_id ?? scholarship.providerId;
        const sponsor = users.find((u) => u.id === sponsorId) || {};
        return {
          ...scholarship,
          sponsor_name: sponsor.name || sponsor.company || 'Unknown sponsor',
          sponsor_email: sponsor.email || 'Unknown email',
          sponsor_verified: !!sponsor.sponsor_verified,
          organization_verified: !!sponsor.organization_verified,
          application_count: applications.filter((app) => app.scholarship_id === scholarship.id).length,
          criteria: JSON.parse(scholarship.criteria_json || '{}'),
          version: scholarship.version || 1,
          lastEditedBy: scholarship.lastEditedBy || null,
          lastEditReason: scholarship.lastEditReason || null,
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
    if (!['open', 'closed', 'archived', 'Draft', 'Open', 'Closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value. Use open, closed, or archived.' });
    }
    const scholarship = db.data.scholarships.find((item) => Number(item.id) === id || String(item._id) === String(req.params.id));
    if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });
    scholarship.status = status.toLowerCase();
    try { await db.write(); } catch (e) { console.error('DB write error:', e?.message); }
    return res.json({ scholarship: { ...scholarship, criteria: JSON.parse(scholarship.criteria_json || '{}') } });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// ADMINISTRATOR CONTENT EDITING AUTHORITY WITH VERSIONING & AUDIT LOGGING
// =========================================================================

const editScholarshipContent = async (req, res, next) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'administrator')) {
      return res.status(403).json({ message: 'Forbidden: Administrator privileges required for content editing.' });
    }

    const { id } = req.params;
    const {
      title,
      description,
      benefits,
      eligibilityRequirements,
      totalSlots,
      applicationDeadline,
      allowance,
      maxAmount,
      editReason,
    } = req.body;

    if (!editReason || typeof editReason !== 'string' || editReason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory edit reason (minimum 5 characters) is required for administrative content modification.',
      });
    }

    // Locate scholarship in database
    const scholarship = (db.data.scholarships || []).find(
      (s) => String(s.id) === String(id) || String(s._id) === String(id)
    );

    if (!scholarship) {
      return res.status(404).json({ message: 'Target scholarship not found' });
    }

    const currentVersion = scholarship.version || 1;
    const nextVersion = currentVersion + 1;
    const originalAuthorId = scholarship.sponsor_id ?? scholarship.provider_id ?? scholarship.providerId;

    const previousData = {
      title: scholarship.title,
      description: scholarship.description,
      benefits: scholarship.benefits,
      eligibilityRequirements: scholarship.eligibilityRequirements || scholarship.criteria_json,
      totalSlots: scholarship.totalSlots || scholarship.slots,
      applicationDeadline: scholarship.applicationDeadline || scholarship.deadline,
      allowance: scholarship.allowance,
      maxAmount: scholarship.maxAmount,
    };

    const updatedData = {
      title: title !== undefined ? String(title).trim() : previousData.title,
      description: description !== undefined ? String(description).trim() : previousData.description,
      benefits: benefits !== undefined ? String(benefits).trim() : previousData.benefits,
      eligibilityRequirements: eligibilityRequirements !== undefined ? String(eligibilityRequirements).trim() : previousData.eligibilityRequirements,
      totalSlots: totalSlots !== undefined ? Number(totalSlots) : previousData.totalSlots,
      applicationDeadline: applicationDeadline !== undefined ? applicationDeadline : previousData.applicationDeadline,
      allowance: allowance !== undefined ? allowance : previousData.allowance,
      maxAmount: maxAmount !== undefined ? maxAmount : previousData.maxAmount,
    };

    const editSnapshot = {
      version: currentVersion,
      editedBy: adminUser.id || adminUser._id,
      editorRole: adminUser.role,
      editorEmail: adminUser.email,
      editReason: editReason.trim(),
      previousData,
      updatedData,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    };

    if (!scholarship.editHistory) {
      scholarship.editHistory = [];
    }
    scholarship.editHistory.push(editSnapshot);

    // Apply updates while PRESERVING original author
    Object.assign(scholarship, updatedData);
    scholarship.version = nextVersion;
    scholarship.lastEditedBy = adminUser.id || adminUser._id;
    scholarship.lastEditReason = editReason.trim();
    scholarship.updated_at = new Date().toISOString();

    // Ensure original author remains strictly preserved
    if (scholarship.sponsor_id === undefined && originalAuthorId) {
      scholarship.sponsor_id = originalAuthorId;
    }

    try { await db.write(); } catch (e) { console.error('DB write error:', e?.message); }

    // Sync Mongoose model if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Scholarship.findOneAndUpdate(
          { $or: [{ _id: id }, { id: Number(id) || -1 }] },
          {
            $set: {
              ...updatedData,
              version: nextVersion,
              lastEditedBy: adminUser.id || adminUser._id,
              lastEditReason: editReason.trim(),
            },
            $push: { editHistory: editSnapshot },
          }
        );
      } catch (err) {
        console.warn('Mongoose Scholarship sync warning:', err?.message);
      }
    }

    // Create Audit Log Record
    try {
      const logData = {
        actorUserId: adminUser.id || adminUser._id || 1,
        actorRole: 'admin',
        action: 'ADMIN_CONTENT_EDIT',
        targetType: 'Scholarship',
        targetId: String(scholarship.id || scholarship._id),
        beforeSummary: previousData,
        afterSummary: updatedData,
        reason: editReason.trim(),
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      };

      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(logData);
      }
    } catch (auditErr) {
      console.warn('AuditLog creation warning:', auditErr?.message);
    }

    // Dispatch Notification to Original Content Owner
    if (originalAuthorId) {
      if (!db.data.notifications) db.data.notifications = [];
      db.data.notifications.push({
        id: Date.now(),
        user_id: originalAuthorId,
        recipient_id: originalAuthorId,
        title: 'Administrative Content Moderation Notice',
        message: `Your scholarship "${previousData.title}" was updated by an administrator. Version: v${nextVersion}. Reason: ${editReason.trim()}`,
        type: 'ADMIN_CONTENT_EDIT',
        read: false,
        created_at: new Date().toISOString(),
      });
      try { await db.write(); } catch (e) {}
    }

    return res.json({
      message: 'Scholarship content updated by administrator',
      version: nextVersion,
      originalAuthor: originalAuthorId,
      scholarship,
    });
  } catch (error) {
    next(error);
  }
};

const getScholarshipVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scholarship = (db.data.scholarships || []).find(
      (s) => String(s.id) === String(id) || String(s._id) === String(id)
    );
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    return res.json({
      scholarshipId: scholarship.id || scholarship._id,
      currentVersion: scholarship.version || 1,
      originalAuthorId: scholarship.sponsor_id ?? scholarship.provider_id ?? scholarship.providerId,
      editHistory: scholarship.editHistory || [],
    });
  } catch (error) {
    next(error);
  }
};

const softDeleteScholarship = async (req, res, next) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'administrator')) {
      return res.status(403).json({ message: 'Forbidden: Administrator privileges required.' });
    }

    const { id } = req.params;
    const { deleteReason } = req.body;

    if (!deleteReason || typeof deleteReason !== 'string' || deleteReason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory reason (minimum 5 characters) is required for administrative soft deletion.',
      });
    }

    const scholarship = (db.data.scholarships || []).find(
      (s) => String(s.id) === String(id) || String(s._id) === String(id)
    );

    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    scholarship.isDeleted = true;
    scholarship.status = 'closed';
    scholarship.deletedAt = new Date().toISOString();
    scholarship.deletedBy = adminUser.id || adminUser._id;
    scholarship.deleteReason = deleteReason.trim();

    try { await db.write(); } catch (e) {}

    // Audit Log
    try {
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create({
          actorUserId: adminUser.id || adminUser._id || 1,
          actorRole: 'admin',
          action: 'ADMIN_CONTENT_SOFT_DELETE',
          targetType: 'Scholarship',
          targetId: String(scholarship.id || scholarship._id),
          reason: deleteReason.trim(),
          beforeSummary: { title: scholarship.title, status: 'open' },
          afterSummary: { isDeleted: true, status: 'closed' },
          ip: req.ip || '',
        });
      }
    } catch (e) {}

    return res.json({
      message: 'Scholarship soft-deleted and archived successfully',
      scholarship,
    });
  } catch (error) {
    next(error);
  }
};

const listStudents = async (req, res, next) => {
  try {
    const { Student } = require('../models');
    const users = db.data.users || [];
    const studentProfiles = db.data.student_profiles || [];

    const studentsByUserId = {};

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
    let logs = [];
    if (mongoose.connection.readyState === 1) {
      logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate('actorUserId', 'email role name');
    }

    return res.json({ logs });
  } catch (error) {
    next(error);
  }
};

// Immutability Guard Handlers
const blockAuditLogMutation = (req, res) => {
  return res.status(405).json({
    message: 'Method Not Allowed: Audit logs are immutable ledgers and cannot be modified or deleted by administrators or automated processes.',
  });
};

const blockPrivateMessageMutation = (req, res) => {
  return res.status(405).json({
    message: 'Method Not Allowed: Private application messages cannot be rewritten or modified by administrators.',
  });
};

module.exports = {
  getOverview,
  listProviders,
  approveProvider,
  verifyProviderOrganization,
  listScholarships,
  updateScholarshipStatus,
  editScholarshipContent,
  getScholarshipVersions,
  softDeleteScholarship,
  listStudents,
  getAuditLogs,
  blockAuditLogMutation,
  blockPrivateMessageMutation,
};
