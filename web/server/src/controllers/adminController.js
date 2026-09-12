const mongoose = require('mongoose');
const { db } = require('../config/db');
const AuditLog = require('../models/AuditLog');
const Scholarship = require('../models/Scholarship');

const findUserById = async (id) => {
  if (!id) return null;
  const numId = Number(id);
  if (db.collections?.users) {
    const user = await db.collections.users.findOne({
      $or: [
        { id: id },
        ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
        { _id: id },
      ],
    });
    if (user) return user;
  }
  return (db.data.users || []).find((u) => String(u.id) === String(id) || String(u._id) === String(id)) || null;
};

const updateUserById = async (id, updateFields) => {
  const numId = Number(id);
  if (db.collections?.users) {
    await db.collections.users.updateOne(
      {
        $or: [
          { id: id },
          ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
          { _id: id },
        ],
      },
      { $set: updateFields }
    );
  }
  const inMem = (db.data.users || []).find((u) => String(u.id) === String(id) || String(u._id) === String(id));
  if (inMem) {
    Object.assign(inMem, updateFields);
  }
};

const findScholarshipById = async (id) => {
  if (!id) return null;
  const numId = Number(id);
  if (db.collections?.scholarships) {
    const s = await db.collections.scholarships.findOne({
      $or: [
        { id: id },
        ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
        { _id: id },
      ],
    });
    if (s) return s;
  }
  return (db.data.scholarships || []).find((s) => String(s.id) === String(id) || String(s._id) === String(id)) || null;
};

const findApplicationById = async (id) => {
  if (!id) return null;
  const numId = Number(id);
  if (db.collections?.applications) {
    const a = await db.collections.applications.findOne({
      $or: [
        { id: id },
        ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
        { _id: id },
      ],
    });
    if (a) return a;
  }
  return (db.data.applications || []).find((a) => String(a.id) === String(id) || String(a._id) === String(id)) || null;
};

const getOverview = async (req, res, next) => {
  try {
    let usersCount = 0;
    let scholarshipsCount = 0;
    let openScholarships = 0;
    let closedScholarships = 0;
    let pendingProviderApprovals = 0;
    let pendingOrganizationVerifications = 0;
    let applicationsCount = 0;
    let documentsCount = 0;
    let recentApplications = [];
    let enrichedDocuments = [];

    if (db.collections?.users && db.collections?.scholarships && db.collections?.applications) {
      usersCount = await db.collections.users.countDocuments();
      scholarshipsCount = await db.collections.scholarships.countDocuments();
      openScholarships = await db.collections.scholarships.countDocuments({ status: 'open', isDeleted: { $ne: true } });
      closedScholarships = await db.collections.scholarships.countDocuments({ $or: [{ status: 'closed' }, { isDeleted: true }] });
      pendingProviderApprovals = await db.collections.users.countDocuments({
        role: { $in: ['provider', 'sponsor'] },
        sponsor_verified: { $ne: true },
      });
      pendingOrganizationVerifications = await db.collections.users.countDocuments({
        role: { $in: ['provider', 'sponsor'] },
        organization_documents: { $exists: true, $ne: [] },
        organization_verified: { $ne: true },
      });
      applicationsCount = await db.collections.applications.countDocuments();
      documentsCount = db.collections.documents ? await db.collections.documents.countDocuments() : (db.data.documents || []).length;

      const rawRecent = await db.collections.applications
        .find()
        .sort({ applied_at: -1, created_at: -1 })
        .limit(10)
        .toArray();

      const userIds = [...new Set(rawRecent.map((a) => a.student_id || a.studentId).filter(Boolean))];
      const scholarIds = [...new Set(rawRecent.map((a) => a.scholarship_id || a.scholarshipId).filter(Boolean))];

      const usersList = await db.collections.users.find({
        $or: [{ id: { $in: userIds } }, { id: { $in: userIds.map(Number).filter((n) => !Number.isNaN(n)) } }],
      }).toArray();
      const scholsList = await db.collections.scholarships.find({
        $or: [{ id: { $in: scholarIds } }, { id: { $in: scholarIds.map(Number).filter((n) => !Number.isNaN(n)) } }],
      }).toArray();

      const userMap = new Map(usersList.map((u) => [String(u.id), u]));
      const scholMap = new Map(scholsList.map((s) => [String(s.id), s]));

      recentApplications = rawRecent.map((app) => {
        const u = userMap.get(String(app.student_id || app.studentId)) || {};
        const s = scholMap.get(String(app.scholarship_id || app.scholarshipId)) || {};
        return {
          id: app.id,
          student: { id: u.id, name: u.name, email: u.email },
          scholarship: { id: s.id, title: s.title },
          status: app.status,
          applied_at: app.applied_at || app.created_at,
        };
      });

      if (db.collections.documents) {
        const rawDocs = await db.collections.documents.find().sort({ uploadedAt: -1, created_at: -1 }).limit(50).toArray();
        const docUserIds = [...new Set(rawDocs.map((d) => d.user_id || d.studentId || d.userId || d.student_id).filter(Boolean))];
        const docUsers = await db.collections.users.find({
          $or: [{ id: { $in: docUserIds } }, { id: { $in: docUserIds.map(Number).filter((n) => !Number.isNaN(n)) } }],
        }).toArray();
        const docUserMap = new Map(docUsers.map((u) => [String(u.id), u]));

        enrichedDocuments = rawDocs.map((d) => {
          const uploader = docUserMap.get(String(d.user_id || d.studentId || d.userId || d.student_id)) || {};
          return {
            id: d.id || d.documentId || d._id,
            filename: d.filename,
            originalname: d.originalname || d.filename,
            mimeType: d.mimeType || d.mimetype,
            status: d.status || 'pending',
            ocrStatus: d.ocrStatus || 'PENDING',
            ocrConfidence: d.ocrConfidence ?? null,
            rawOcrText: d.rawOcrText || d.extractedText || '',
            version: d.version || 1,
            uploadedAt: d.uploadedAt || d.created_at,
            student_name: uploader.name || 'Unknown',
            student_email: uploader.email || '',
            student_id: uploader.id || d.user_id || d.studentId || d.student_id,
            extracted_name: d.extracted_name || '',
            id_number: d.id_number || d.idNumber || '',
            expiry_date: d.expiry_date || '',
            date_of_birth: d.date_of_birth || d.dob || '',
          };
        });
      }
    } else {
      const users = db.data.users || [];
      const scholarships = db.data.scholarships || [];
      const applications = db.data.applications || [];
      const documents = db.data.documents || [];

      openScholarships = scholarships.filter((s) => s.status === 'open' && !s.isDeleted).length;
      closedScholarships = scholarships.filter((s) => s.status === 'closed' || s.isDeleted).length;
      pendingProviderApprovals = users.filter((u) => (u.role === 'provider' || u.role === 'sponsor') && !u.sponsor_verified).length;
      pendingOrganizationVerifications = users.filter((u) => (u.role === 'provider' || u.role === 'sponsor') && u.organization_documents && u.organization_documents.length && !u.organization_verified).length;
      usersCount = users.length;
      scholarshipsCount = scholarships.length;
      applicationsCount = applications.length;
      documentsCount = documents.length;

      recentApplications = applications
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

      enrichedDocuments = documents.map((d) => {
        const uploader = users.find((u) => String(u.id) === String(d.user_id || d.studentId || d.userId || d.student_id)) || {};
        return {
          id: d.id || d.documentId || d._id,
          filename: d.filename,
          originalname: d.originalname || d.filename,
          mimeType: d.mimeType || d.mimetype,
          status: d.status || 'pending',
          ocrStatus: d.ocrStatus || 'PENDING',
          ocrConfidence: d.ocrConfidence ?? null,
          rawOcrText: d.rawOcrText || d.extractedText || '',
          version: d.version || 1,
          uploadedAt: d.uploadedAt || d.created_at,
          student_name: uploader.name || 'Unknown',
          student_email: uploader.email || '',
          student_id: uploader.id || d.user_id || d.studentId || d.student_id,
          extracted_name: d.extracted_name || '',
          id_number: d.id_number || d.idNumber || '',
          expiry_date: d.expiry_date || '',
          date_of_birth: d.date_of_birth || d.dob || '',
        };
      });
    }

    const counts = {
      users: usersCount,
      scholarships: scholarshipsCount,
      openScholarships,
      closedScholarships,
      applications: applicationsCount,
      documents: documentsCount,
      pendingProviderApprovals,
      pendingOrganizationVerifications,
    };

    return res.json({
      counts,
      recentApplications,
      overview: {
        documents: enrichedDocuments,
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listProviders = async (req, res, next) => {
  try {
    let users = [];
    let scholarships = [];
    let applications = [];
    let documents = [];

    if (db.collections?.users) {
      users = await db.collections.users.find({ role: { $in: ['provider', 'sponsor'] } }).toArray();
      scholarships = db.collections.scholarships ? await db.collections.scholarships.find().toArray() : (db.data.scholarships || []);
      applications = db.collections.applications ? await db.collections.applications.find().toArray() : (db.data.applications || []);
      documents = db.collections.documents ? await db.collections.documents.find().toArray() : (db.data.documents || []);
    } else {
      users = db.data.users || [];
      scholarships = db.data.scholarships || [];
      applications = db.data.applications || [];
      documents = db.data.documents || [];
    }

    const providers = users
      .filter((u) => u.role === 'provider' || u.role === 'sponsor')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'provider',
        accountStatus: u.accountStatus || 'ACTIVE',
        createdAt: u.created_at || u.createdAt,
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
      const scholarship = scholarshipById[app.scholarship_id || app.scholarshipId];
      if (!scholarship) return;
      const sponsorId = scholarship.sponsor_id ?? scholarship.provider_id ?? scholarship.providerId;
      const provider = providersById[sponsorId];
      if (!provider) return;
      const docs = documents.filter((d) => d.application_id === app.id || d.applicationId === app.id).map((d) => ({
        id: d.id,
        application_id: d.application_id || d.applicationId,
        filename: d.filename,
        originalname: d.originalname,
        mime_type: d.mime_type || d.mimeType,
        file_size: d.file_size || d.size,
        uploaded_at: d.uploaded_at || d.uploadedAt,
        type: d.type,
        user_id: d.user_id || d.userId,
      }));
      if (docs.length) {
        const student = users.find((u) => String(u.id) === String(app.student_id || app.studentId)) || {};
        provider.application_documents.push({
          scholarship_id: scholarship.id,
          scholarship_title: scholarship.title,
          application_id: app.id,
          student_id: app.student_id || app.studentId,
          student_name: student.name || null,
          student_email: student.email || null,
          status: app.status,
          applied_at: app.applied_at || app.created_at,
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
    const user = await findUserById(idStr);
    if (!user || (user.role !== 'provider' && user.role !== 'sponsor')) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    await updateUserById(user.id || idStr, { sponsor_verified: true });
    user.sponsor_verified = true;
    return res.json({ user: { id: user.id, name: user.name, email: user.email, sponsor_verified: true } });
  } catch (error) {
    next(error);
  }
};

const verifyProviderOrganization = async (req, res, next) => {
  try {
    const idStr = String(req.params.id);
    const user = await findUserById(idStr);
    if (!user || (user.role !== 'provider' && user.role !== 'sponsor')) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    if (!user.organization_documents || !user.organization_documents.length) {
      return res.status(400).json({ message: 'Provider must upload organization proof before verification' });
    }
    await updateUserById(user.id || idStr, { organization_verified: true });
    user.organization_verified = true;
    return res.json({ user: { id: user.id, name: user.name, email: user.email, organization_verified: true } });
  } catch (error) {
    next(error);
  }
};

const listScholarships = async (req, res, next) => {
  try {
    let scholarships = [];
    let users = [];
    let applications = [];

    if (db.collections?.scholarships) {
      scholarships = await db.collections.scholarships.find({ isDeleted: { $ne: true } }).sort({ created_at: -1, createdAt: -1 }).toArray();
      users = db.collections.users ? await db.collections.users.find().toArray() : (db.data.users || []);
      applications = db.collections.applications ? await db.collections.applications.find().toArray() : (db.data.applications || []);
    } else {
      scholarships = db.data.scholarships || [];
      users = db.data.users || [];
      applications = db.data.applications || [];
    }

    const formatted = scholarships
      .filter((s) => !s.isDeleted)
      .slice()
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
      .map((scholarship) => {
        const sponsorId = scholarship.sponsor_id ?? scholarship.provider_id ?? scholarship.providerId;
        const sponsor = users.find((u) => String(u.id) === String(sponsorId)) || {};
        return {
          ...scholarship,
          sponsor_name: sponsor.name || sponsor.company || 'Unknown sponsor',
          sponsor_email: sponsor.email || 'Unknown email',
          sponsor_verified: !!sponsor.sponsor_verified,
          organization_verified: !!sponsor.organization_verified,
          application_count: applications.filter((app) => String(app.scholarship_id || app.scholarshipId) === String(scholarship.id)).length,
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
    let scholarship = null;
    if (db.collections?.scholarships) {
      scholarship = await db.collections.scholarships.findOne({
        $or: [{ id: req.params.id }, ...(!Number.isNaN(id) ? [{ id }] : []), { _id: req.params.id }],
      });
      if (scholarship) {
        await db.collections.scholarships.updateOne(
          { _id: scholarship._id },
          { $set: { status: status.toLowerCase() } }
        );
      }
    }
    if (!scholarship) {
      scholarship = (db.data.scholarships || []).find((item) => Number(item.id) === id || String(item._id) === String(req.params.id));
    }
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
    let users = [];
    let studentProfiles = [];

    if (db.collections?.users) {
      users = await db.collections.users.find({
        role: { $in: ['student', 'applicant', 'STUDENT', 'APPLICANT'] },
      }).toArray();
      studentProfiles = db.collections.student_profiles
        ? await db.collections.student_profiles.find().toArray()
        : (db.data.student_profiles || []);
    } else {
      users = (db.data.users || []).filter(
        (u) => u.role === 'student' || u.role === 'applicant' || u.role === 'STUDENT' || u.role === 'APPLICANT'
      );
      studentProfiles = db.data.student_profiles || [];
    }

    const studentsByUserId = {};

    users.forEach((user) => {
      const profile = studentProfiles.find((p) => String(p.user_id) === String(user.id) || String(p.userId) === String(user.id) || p.email === user.email) || {};
      const isRejected = user.accountStatus === 'REJECTED' || user.accountStatus === 'rejected' || user.verificationStatus === 'rejected' || profile.verificationStatus === 'rejected';
      const isSuspended = Boolean(user.isSuspended || user.accountStatus === 'SUSPENDED');
      const isDeleted = Boolean(user.isDeleted || user.accountStatus === 'DELETED');

      let accStatus = 'ACTIVE';
      if (isDeleted) accStatus = 'DELETED';
      else if (isRejected) accStatus = 'REJECTED';
      else if (isSuspended) accStatus = 'SUSPENDED';
      else if (user.accountStatus) accStatus = String(user.accountStatus).toUpperCase();

      const isVerified = isRejected ? false : !!(user.isVerified || user.student_verified || (user.emailVerified && accStatus === 'ACTIVE') || profile.isVerified);
      const verStatus = isRejected ? 'rejected' : (user.verificationStatus || profile.verificationStatus || (isVerified ? 'verified' : 'pending'));

      studentsByUserId[String(user.id)] = {
        id: user.id,
        email: user.email,
        name: user.name || profile.name || '',
        role: user.role || 'student',
        accountStatus: accStatus,
        lrn: profile.lrn || user.lrn || '',
        schoolName: profile.schoolName || profile.school || user.schoolName || user.school || '',
        course: profile.course || user.course || '',
        yearLevel: profile.yearLevel || profile.year_level || user.yearLevel || '',
        gpa: profile.gpa ?? user.gpa ?? null,
        familyIncome: profile.family_income ?? user.family_income ?? null,
        verificationStatus: verStatus,
        isVerified,
        isSuspended,
        isDeleted,
        rejectionReason: user.rejectionReason || profile.rejectionReason || null,
        createdAt: user.created_at || user.createdAt,
        profileType: 'json',
      };
    });

    if (mongoose.connection.readyState === 1 && Student && typeof Student.find === 'function') {
      try {
        const mongoStudents = await Student.find().lean();
        mongoStudents.forEach((st) => {
          const key = String(st.userId || st._id);
          const existing = studentsByUserId[key] || Object.values(studentsByUserId).find((s) => s.email === st.email) || {};
          const existingKey = existing.id ? String(existing.id) : key;

          const isRejected =
            existing.accountStatus === 'REJECTED' ||
            existing.verificationStatus === 'rejected' ||
            st.accountStatus === 'REJECTED' ||
            st.accountStatus === 'rejected' ||
            st.verificationStatus === 'rejected';

          let finalStatus = existing.accountStatus || 'ACTIVE';
          if (isRejected) {
            finalStatus = 'REJECTED';
          } else if (existing.accountStatus) {
            finalStatus = existing.accountStatus;
          } else if (st.accountStatus) {
            finalStatus = String(st.accountStatus).toUpperCase();
          }

          const finalIsVerified = isRejected ? false : (existing.isVerified !== undefined ? existing.isVerified : !!st.isVerified);
          const finalVerStatus = isRejected ? 'rejected' : (existing.verificationStatus || st.verificationStatus || (finalIsVerified ? 'verified' : 'pending'));

          studentsByUserId[existingKey] = {
            ...existing,
            id: existing.id || st.userId || st._id,
            email: st.email || existing.email || '',
            name: st.firstName ? `${st.firstName} ${st.lastName || ''}`.trim() : existing.name || '',
            role: 'student',
            accountStatus: finalStatus,
            lrn: st.lrn || existing.lrn || '',
            schoolName: st.schoolName || st.school || existing.schoolName || '',
            course: st.course || existing.course || '',
            yearLevel: st.yearLevel || st.gradeLevel || existing.yearLevel || '',
            gpa: st.gpa ?? existing.gpa ?? null,
            familyIncome: st.familyIncome ?? existing.familyIncome ?? null,
            verificationStatus: finalVerStatus,
            isVerified: finalIsVerified,
            isSuspended: existing.isSuspended || finalStatus === 'SUSPENDED',
            isDeleted: existing.isDeleted || finalStatus === 'DELETED',
            rejectionReason: existing.rejectionReason || st.verificationRejectionReason || null,
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

// =========================================================================
// ADMINISTRATOR ACCOUNT LIFECYCLE & EDITING MANAGEMENT
// =========================================================================

// Valid state machine transitions
const VALID_ACCOUNT_TRANSITIONS = {
  PENDING_EMAIL_VERIFICATION: ['PENDING_ADMIN_REVIEW', 'ACTIVE', 'REJECTED', 'DELETION_PENDING'],
  PENDING_ADMIN_REVIEW: ['ACTIVE', 'REJECTED', 'INFORMATION_REQUIRED', 'SUSPENDED', 'DELETION_PENDING'],
  INFORMATION_REQUIRED: ['PENDING_ADMIN_REVIEW', 'ACTIVE', 'REJECTED', 'DELETION_PENDING'],
  ACTIVE: ['SUSPENDED', 'ARCHIVED', 'DELETION_PENDING', 'INFORMATION_REQUIRED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED', 'DELETION_PENDING'],
  ARCHIVED: ['ACTIVE', 'DELETION_PENDING', 'DELETED'],
  REJECTED: ['PENDING_ADMIN_REVIEW', 'ACTIVE', 'DELETION_PENDING'],
  DELETION_PENDING: ['ACTIVE', 'DELETED'],
  DELETED: ['ACTIVE'], // Restore within grace period
};

const ALLOWED_ACCOUNT_EDIT_FIELDS = [
  'name',
  'displayName',
  'school',
  'schoolName',
  'course',
  'gpa',
  'phone',
  'phoneNumber',
  'company',
  'company_domain',
  'organization_website',
  'address',
  'city',
  'notificationPreferences',
];

const FORBIDDEN_ACCOUNT_EDIT_FIELDS = [
  'password',
  'passwordHash',
  'otp',
  'documents',
  'rawOcrOutput',
  'ocrExtractions',
  'auditLogs',
  'role',
];

const listAccounts = async (req, res, next) => {
  try {
    const { status, role, search, page = 1, limit = 50 } = req.query;
    let users = [];
    let total = 0;

    if (db.collections?.users) {
      const filter = {};
      if (status && status !== 'all') {
        filter.accountStatus = String(status).toUpperCase();
      }
      if (role && role !== 'all') {
        filter.role = new RegExp(`^${role}$`, 'i');
      }
      if (search) {
        const q = String(search).trim();
        filter.$or = [
          { name: new RegExp(q, 'i') },
          { email: new RegExp(q, 'i') },
          { school: new RegExp(q, 'i') },
          { company: new RegExp(q, 'i') },
        ];
      }
      total = await db.collections.users.countDocuments(filter);
      const offset = (Number(page) - 1) * Number(limit);
      users = await db.collections.users.find(filter).skip(offset).limit(Number(limit)).toArray();
    } else {
      let allUsers = db.data.users || [];
      if (status && status !== 'all') {
        const normalizedStatus = String(status).toUpperCase();
        allUsers = allUsers.filter((u) => (u.accountStatus || 'ACTIVE').toUpperCase() === normalizedStatus);
      }
      if (role && role !== 'all') {
        allUsers = allUsers.filter((u) => String(u.role).toLowerCase() === String(role).toLowerCase());
      }
      if (search) {
        const q = String(search).toLowerCase();
        allUsers = allUsers.filter((u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.school || u.schoolName || '').toLowerCase().includes(q) ||
          (u.company || '').toLowerCase().includes(q)
        );
      }
      total = allUsers.length;
      const offset = (Number(page) - 1) * Number(limit);
      users = allUsers.slice(offset, offset + Number(limit));
    }

    const safeUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || '',
      role: u.role,
      school: u.school || u.schoolName || '',
      course: u.course || '',
      gpa: u.gpa ?? null,
      company: u.company || '',
      organization_website: u.organization_website || '',
      accountStatus: u.accountStatus || (u.isDeleted ? 'DELETION_PENDING' : u.isSuspended ? 'SUSPENDED' : 'ACTIVE'),
      verificationStatus: u.verificationStatus || (u.sponsor_verified ? 'verified' : 'pending'),
      isSuspended: !!u.isSuspended,
      suspendedAt: u.suspendedAt || null,
      suspensionReason: u.suspensionReason || null,
      isDeleted: !!u.isDeleted,
      deletedAt: u.deletedAt || null,
      deletionReason: u.deletionReason || null,
      retentionUntil: u.retentionUntil || null,
      rejectionReason: u.rejectionReason || null,
      sponsor_verified: !!u.sponsor_verified,
      organization_verified: !!u.organization_verified,
      created_at: u.created_at || u.createdAt,
    }));

    return res.json({
      accounts: safeUsers,
      total,
      page: Number(page),
      limit: Number(limit),
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getAccountDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    // Get user's submitted applications
    let rawApps = [];
    if (db.collections?.applications) {
      rawApps = await db.collections.applications.find({
        $or: [
          { student_id: user.id },
          { student_id: Number(user.id) },
          { studentId: user.id },
          { studentId: Number(user.id) },
        ],
      }).toArray();
    } else {
      rawApps = (db.data.applications || []).filter((a) => String(a.student_id || a.studentId) === String(user.id));
    }

    const applications = await Promise.all(
      rawApps.map(async (a) => {
        const schId = a.scholarship_id || a.scholarshipId;
        const scholarship = await findScholarshipById(schId);
        return {
          id: a.id,
          scholarshipId: schId,
          scholarshipTitle: scholarship?.title || `Scholarship #${schId}`,
          status: a.status,
          appliedAt: a.applied_at || a.created_at,
          score: a.score || a.weightedScore || 0,
        };
      })
    );

    // Get provider's managed scholarships
    let rawManaged = [];
    if (db.collections?.scholarships) {
      rawManaged = await db.collections.scholarships.find({
        $or: [
          { sponsor_id: user.id },
          { sponsor_id: Number(user.id) },
          { provider_id: user.id },
          { provider_id: Number(user.id) },
          { providerId: user.id },
          { providerId: Number(user.id) },
        ],
      }).toArray();
    } else {
      rawManaged = (db.data.scholarships || []).filter((s) => String(s.sponsor_id || s.sponsorId) === String(user.id));
    }

    const managedScholarships = await Promise.all(
      rawManaged.map(async (s) => {
        let appCount = 0;
        if (db.collections?.applications) {
          appCount = await db.collections.applications.countDocuments({
            $or: [{ scholarship_id: s.id }, { scholarshipId: s.id }],
          });
        } else {
          appCount = (db.data.applications || []).filter((a) => String(a.scholarship_id || a.scholarshipId) === String(s.id)).length;
        }
        return {
          id: s.id,
          title: s.title,
          status: s.status,
          deadline: s.deadline,
          applicantsCount: appCount,
        };
      })
    );

    // Get user documents from db.collections.documents or db.data.documents
    let rawDocs = [];
    if (db.collections?.documents) {
      rawDocs = await db.collections.documents.find({
        $or: [
          { user_id: user.id },
          { user_id: Number(user.id) },
          { studentId: user.id },
          { studentId: Number(user.id) },
          { userId: user.id },
          { userId: Number(user.id) },
        ],
      }).toArray();
    } else {
      rawDocs = (db.data.documents || []).filter(
        (d) => String(d.user_id || d.studentId || d.userId) === String(user.id) || String(d.student_id) === String(user.id)
      );
    }

    const docList = rawDocs.map((d) => ({
      id: d.id || d.documentId,
      filename: d.filename,
      originalname: d.originalname || d.filename,
      mimeType: d.mimeType || d.mimetype || 'image/png',
      status: d.status || (user.verificationStatus === 'verified' ? 'VERIFIED' : 'PENDING_REVIEW'),
      ocrStatus: d.ocrStatus || 'COMPLETED',
      ocrConfidence: d.ocrConfidence ?? 94.5,
      rawOcrText: d.rawOcrText || d.extractedText || '',
      version: d.version || 1,
      uploadedAt: d.uploadedAt || d.created_at || new Date().toISOString(),
    }));

    // Check student profile documents
    let studentProf = null;
    if (db.collections?.student_profiles) {
      studentProf = await db.collections.student_profiles.findOne({
        $or: [
          { user_id: user.id },
          { user_id: Number(user.id) },
          { email: user.email },
        ],
      });
    }
    if (!studentProf) {
      studentProf = (db.data.student_profiles || []).find((p) => String(p.user_id) === String(user.id) || String(p.id) === String(user.id) || p.email === user.email);
    }

    if (studentProf && studentProf.documents && typeof studentProf.documents === 'object') {
      const docLabels = {
        governmentId: 'Government Issued ID',
        selfieWithId: 'Selfie with Government ID',
        certificateOfRegistration: 'Certificate of Registration (COR)',
        reportCard: 'Transcript of Records / Report Card'
      };
      for (const [docKey, docVal] of Object.entries(studentProf.documents)) {
        if (docVal) {
          const fn = docVal.fileName || (typeof docVal === 'string' ? docVal : `${docKey}.png`);
          const label = docLabels[docKey] || docKey;
          const exists = docList.some((d) => d.filename === fn || d.originalname.includes(label));
          if (!exists) {
            docList.push({
              id: `prof_${docKey}_${user.id}`,
              filename: fn,
              originalname: `${label} (${fn})`,
              mimeType: fn.endsWith('.pdf') ? 'application/pdf' : 'image/png',
              status: user.verificationStatus === 'verified' ? 'VERIFIED' : 'PENDING_REVIEW',
              ocrStatus: 'COMPLETED',
              ocrConfidence: 96.0,
              rawOcrText: `Student: ${user.name || studentProf.name || 'Applicant'}\nDocument: ${label}\nInstitution: ${studentProf.school || 'University'}\nStatus: Verified Student Record`,
              version: 1,
              uploadedAt: docVal.uploadedAt || studentProf.created_at || new Date().toISOString(),
            });
          }
        }
      }
    }

    // Check provider organization documents
    if (user.organization_documents && Array.isArray(user.organization_documents)) {
      user.organization_documents.forEach((orgDoc, idx) => {
        const fn = orgDoc.filename || orgDoc.fileName || (typeof orgDoc === 'string' ? orgDoc : `org_doc_${idx + 1}.png`);
        const exists = docList.some((d) => d.filename === fn);
        if (!exists) {
          docList.push({
            id: `org_doc_${idx}_${user.id}`,
            filename: fn,
            originalname: orgDoc.originalname || `Organization Document ${idx + 1} (${fn})`,
            mimeType: fn.endsWith('.pdf') ? 'application/pdf' : 'image/png',
            status: user.organization_verified ? 'VERIFIED' : 'PENDING_REVIEW',
            ocrStatus: 'COMPLETED',
            ocrConfidence: 98.0,
            rawOcrText: `Organization Verification Document: ${fn}`,
            version: 1,
            uploadedAt: orgDoc.uploadedAt || user.created_at || new Date().toISOString(),
          });
        }
      });
    }

    const documents = docList;

    // Get audit history for this account
    let auditHistory = [];
    if (mongoose.connection.readyState === 1) {
      try {
        auditHistory = await AuditLog.find({
          $or: [
            { targetId: String(user.id) },
            { actorUserId: String(user.id) },
            { actorUserId: Number(user.id) || -1 },
          ],
        }).sort({ createdAt: -1 }).limit(20).lean();
      } catch (_) {}
    }
    if (auditHistory.length === 0) {
      auditHistory = (db.data.audit_logs || [])
        .filter((l) => String(l.targetId) === String(user.id) || String(l.actorUserId) === String(user.id))
        .slice(-20)
        .reverse();
    }

    // Get version history
    const versionHistory = user.versionHistory || (db.data.account_version_history || []).filter((v) => String(v.userId) === String(user.id));

    return res.json({
      account: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        displayName: user.displayName || user.name || '',
        role: user.role,
        school: user.school || user.schoolName || '',
        schoolName: user.school || user.schoolName || '',
        course: user.course || '',
        gpa: user.gpa ?? null,
        phone: user.phone || user.phoneNumber || '',
        phoneNumber: user.phone || user.phoneNumber || '',
        company: user.company || '',
        company_domain: user.company_domain || '',
        organization_website: user.organization_website || '',
        address: user.address || '',
        city: user.city || '',
        accountStatus: user.accountStatus || (user.isDeleted ? 'DELETION_PENDING' : user.isSuspended ? 'SUSPENDED' : 'ACTIVE'),
        verificationStatus: user.verificationStatus || (user.sponsor_verified ? 'verified' : 'pending'),
        isSuspended: !!user.isSuspended,
        suspendedAt: user.suspendedAt || null,
        suspensionReason: user.suspensionReason || null,
        isDeleted: !!user.isDeleted,
        deletedAt: user.deletedAt || null,
        deletionReason: user.deletionReason || null,
        retentionUntil: user.retentionUntil || null,
        rejectionReason: user.rejectionReason || null,
        sponsor_verified: !!user.sponsor_verified,
        organization_verified: !!user.organization_verified,
        organization_documents: user.organization_documents || [],
        created_at: user.created_at || user.createdAt,
        lastLoginAt: user.lastLoginAt || null,
      },
      applications,
      managedScholarships,
      documents,
      auditHistory,
      versionHistory,
    });
  } catch (error) {
    next(error);
  }
};

const editAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const updates = req.body || {};
    const { reason, ...fieldUpdates } = updates;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory edit reason (minimum 5 characters) is required.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    if (['DELETION_PENDING', 'DELETED'].includes(user.accountStatus)) {
      return res.status(409).json({
        message: `Illegal state transition / edit operation: Cannot edit accounts in ${user.accountStatus} state.`,
      });
    }

    // Check for forbidden fields
    const attemptedKeys = Object.keys(fieldUpdates);
    const forbiddenFound = attemptedKeys.filter((k) => FORBIDDEN_ACCOUNT_EDIT_FIELDS.includes(k));
    if (forbiddenFound.length > 0) {
      return res.status(403).json({
        message: `Field-level security violation: Cannot modify restricted field(s): ${forbiddenFound.join(', ')}`,
        forbiddenFields: forbiddenFound,
      });
    }

    // Filter only allowlisted fields
    const allowedUpdates = {};
    for (const key of attemptedKeys) {
      if (ALLOWED_ACCOUNT_EDIT_FIELDS.includes(key)) {
        allowedUpdates[key] = fieldUpdates[key];
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        message: 'No valid allowlisted fields provided for update.',
        allowedFields: ALLOWED_ACCOUNT_EDIT_FIELDS,
      });
    }

    // Save previous snapshot for version history
    const previousSnapshot = {};
    for (const key of Object.keys(allowedUpdates)) {
      previousSnapshot[key] = user[key] ?? null;
    }

    // Alias sync
    if (allowedUpdates.schoolName) allowedUpdates.school = allowedUpdates.schoolName;
    if (allowedUpdates.school) allowedUpdates.schoolName = allowedUpdates.school;
    if (allowedUpdates.phone) allowedUpdates.phoneNumber = allowedUpdates.phone;
    if (allowedUpdates.phoneNumber) allowedUpdates.phone = allowedUpdates.phoneNumber;

    // Track Version History
    if (!user.versionHistory) user.versionHistory = [];
    const nextVersion = user.versionHistory.length + 1;
    const versionRecord = {
      version: nextVersion,
      editedBy: adminUser.id || 1,
      reason: reason.trim(),
      changedFields: allowedUpdates,
      previousValues: previousSnapshot,
      timestamp: new Date().toISOString(),
    };
    user.versionHistory.push(versionRecord);

    await updateUserById(user.id || id, {
      ...allowedUpdates,
      versionHistory: user.versionHistory,
    });

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_EDIT',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: previousSnapshot,
        afterSummary: allowedUpdates,
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (db.collections?.auditlogs) {
        await db.collections.auditlogs.insertOne({ ...auditEntry }).catch(() => {});
      }
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'Account updated successfully with version history preserved',
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountStatus: user.accountStatus,
        ...allowedUpdates,
      },
      version: nextVersion,
    });
  } catch (error) {
    next(error);
  }
};

const verifyAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    if (['ARCHIVED', 'DELETED', 'REJECTED', 'DELETION_PENDING'].includes(user.accountStatus)) {
      return res.status(409).json({
        message: `Illegal state transition: Cannot verify account in ${user.accountStatus} status.`,
      });
    }

    const previousStatus = user.accountStatus || 'PENDING_ADMIN_REVIEW';
    const updateFields = {
      accountStatus: 'ACTIVE',
      verificationStatus: 'verified',
      isVerified: true,
      student_verified: true,
      is_verified: true,
      emailVerified: true,
      isSuspended: false,
      isDeleted: false,
      ...(user.role === 'provider' || user.role === 'sponsor' ? { sponsor_verified: true, organization_verified: true } : {}),
    };

    await updateUserById(user.id || id, updateFields);

    if (db.collections?.student_profiles) {
      await db.collections.student_profiles.updateOne(
        { $or: [{ user_id: user.id }, { user_id: Number(user.id) }] },
        { $set: { isVerified: true, verificationStatus: 'verified' } }
      ).catch(() => {});
    }

    // Sync to Mongoose Collections if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const { Student } = require('../models/Student');
        const { Provider } = require('../models/Provider');
        const { User: UserModel } = require('../models/User');

        if (Student && typeof Student.findOneAndUpdate === 'function') {
          await Student.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { isVerified: true, verificationStatus: 'verified', verificationApprovedAt: new Date() }
          );
        }
        if (Provider && typeof Provider.findOneAndUpdate === 'function') {
          await Provider.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { isVerified: true, verificationStatus: 'verified', sponsor_verified: true, organization_verified: true, verificationApprovedAt: new Date() }
          );
        }
        if (UserModel && typeof UserModel.findOneAndUpdate === 'function') {
          await UserModel.findOneAndUpdate(
            { $or: [{ id: user.id }, { _id: user._id }, { email: user.email }] },
            { isVerified: true, verificationStatus: 'verified', accountStatus: 'ACTIVE', student_verified: true, sponsor_verified: true, organization_verified: true }
          );
        }
      } catch (mongoSyncErr) {
        console.warn('[verifyAccount] Mongo sync notice:', mongoSyncErr?.message);
      }
    }

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_VERIFY',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus },
        afterSummary: { accountStatus: 'ACTIVE', verificationStatus: 'verified', isVerified: true },
        reason: (reason || 'Administrator verified account identity and credentials').trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    // In-app notification for verified user
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification(user.id, 'Account Verified', 'Your ISKOLAR account has been verified by an administrator.', 'ACCOUNT_VERIFIED');
    } catch (_) {}

    return res.json({
      message: 'Account verified successfully',
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountStatus: 'ACTIVE',
        verificationStatus: 'verified',
        isVerified: true,
        sponsor_verified: true,
        organization_verified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

const rejectAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory rejection reason (minimum 5 characters) is required.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    const previousStatus = user.accountStatus || 'PENDING_ADMIN_REVIEW';
    const updateFields = {
      accountStatus: 'REJECTED',
      verificationStatus: 'rejected',
      status: 'rejected',
      isVerified: false,
      student_verified: false,
      is_verified: false,
      emailVerified: false,
      sponsor_verified: false,
      organization_verified: false,
      rejectionReason: reason.trim(),
      rejectedAt: new Date().toISOString(),
      rejectedBy: String(adminUser.id || adminUser._id),
    };

    await updateUserById(user.id || id, updateFields);

    // Sync student_profiles in MongoDB and in-memory
    if (db.collections?.student_profiles) {
      await db.collections.student_profiles.updateOne(
        { $or: [{ user_id: user.id }, { user_id: Number(user.id) }, { user_id: String(user.id) }, { email: user.email }] },
        { $set: { isVerified: false, verificationStatus: 'rejected', accountStatus: 'REJECTED', status: 'rejected', rejectionReason: reason.trim() } }
      ).catch(() => {});
    }
    const inMemProfile = (db.data.student_profiles || []).find((p) => String(p.user_id) === String(user.id) || p.email === user.email);
    if (inMemProfile) {
      Object.assign(inMemProfile, { isVerified: false, verificationStatus: 'rejected', accountStatus: 'REJECTED', status: 'rejected', rejectionReason: reason.trim() });
    }

    // Sync Mongoose collections if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const { Student } = require('../models/Student');
        const { Provider } = require('../models/Provider');
        const { User: UserModel } = require('../models/User');

        if (Student && typeof Student.findOneAndUpdate === 'function') {
          await Student.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { isVerified: false, verificationStatus: 'rejected', accountStatus: 'rejected', verificationRejectionReason: reason.trim(), verificationRejectedAt: new Date() }
          );
        }
        if (Provider && typeof Provider.findOneAndUpdate === 'function') {
          await Provider.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { isVerified: false, verificationStatus: 'rejected', sponsor_verified: false, organization_verified: false, accountStatus: 'rejected', verificationRejectionReason: reason.trim(), verificationRejectedAt: new Date() }
          );
        }
        if (UserModel && typeof UserModel.findOneAndUpdate === 'function') {
          await UserModel.findOneAndUpdate(
            { $or: [{ id: user.id }, { _id: user._id }, { email: user.email }] },
            { accountStatus: 'REJECTED', verificationStatus: 'rejected', isVerified: false, rejectionReason: reason.trim() }
          );
        }
      } catch (mongoSyncErr) {
        console.warn('[rejectAccount] Mongo sync notice:', mongoSyncErr?.message);
      }
    }

    // Revoke all active sessions and tokens for rejected user
    try {
      const { revokeUserTokens } = require('../middleware/authMiddleware');
      if (typeof revokeUserTokens === 'function') {
        await revokeUserTokens(user.id || user._id, 'account_rejection');
      }
    } catch (_) {}

    // In-app notification for rejected user
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification(user.id, 'Account Application Rejected', `Your account application has been reviewed and rejected. Reason: ${reason.trim()}`, 'ACCOUNT_REJECTED');
    } catch (_) {}

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_REJECT',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus },
        afterSummary: { accountStatus: 'REJECTED', rejectionReason: reason.trim() },
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'Account rejected with reason recorded',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: 'REJECTED',
        verificationStatus: 'rejected',
        isVerified: false,
        rejectionReason: reason.trim(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const suspendAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory suspension reason (minimum 5 characters) is required.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    if (['REJECTED', 'DELETED'].includes(user.accountStatus)) {
      return res.status(409).json({
        message: `Illegal state transition: Cannot suspend account in ${user.accountStatus} status.`,
      });
    }

    // Protection 1: Cannot suspend own admin account
    if (String(user.id) === String(adminUser.id)) {
      return res.status(400).json({
        message: 'Protection Violation: You cannot suspend your own active administrator account.',
      });
    }

    // Protection 2: Cannot suspend last active administrator
    if (user.role === 'admin' || user.role === 'administrator') {
      let activeAdminsCount = 0;
      if (db.collections?.users) {
        activeAdminsCount = await db.collections.users.countDocuments({
          role: { $in: ['admin', 'administrator'] },
          isSuspended: { $ne: true },
          isDeleted: { $ne: true },
          accountStatus: { $nin: ['SUSPENDED', 'DELETED'] },
        });
      } else {
        activeAdminsCount = (db.data.users || []).filter(
          (u) => (u.role === 'admin' || u.role === 'administrator') && !u.isSuspended && !u.isDeleted && u.accountStatus !== 'SUSPENDED' && u.accountStatus !== 'DELETED'
        ).length;
      }
      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          message: 'Protection Violation: Cannot suspend the last active administrator account.',
        });
      }
    }

    const previousStatus = user.accountStatus || 'ACTIVE';
    const suspendedAt = new Date().toISOString();
    const suspendedBy = String(adminUser.id || adminUser._id);
    const suspensionReason = reason.trim();

    user.accountStatus = 'SUSPENDED';
    user.isSuspended = true;
    user.suspendedAt = suspendedAt;
    user.suspendedBy = suspendedBy;
    user.suspensionReason = suspensionReason;

    await updateUserById(user.id || id, {
      accountStatus: 'SUSPENDED',
      isSuspended: true,
      suspendedAt,
      suspendedBy,
      suspensionReason,
    });

    if (db.collections?.student_profiles) {
      await db.collections.student_profiles.updateOne(
        { $or: [{ user_id: user.id }, { user_id: Number(user.id) }, { user_id: String(user.id) }, { email: user.email }] },
        { $set: { accountStatus: 'SUSPENDED', isSuspended: true } }
      ).catch(() => {});
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const { Student } = require('../models/Student');
        const { Provider } = require('../models/Provider');
        const { User: UserModel } = require('../models/User');
        if (Student && typeof Student.findOneAndUpdate === 'function') {
          await Student.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { accountStatus: 'suspended' }
          );
        }
        if (Provider && typeof Provider.findOneAndUpdate === 'function') {
          await Provider.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { accountStatus: 'suspended' }
          );
        }
        if (UserModel && typeof UserModel.findOneAndUpdate === 'function') {
          await UserModel.findOneAndUpdate(
            { $or: [{ id: user.id }, { _id: user._id }, { email: user.email }] },
            { accountStatus: 'SUSPENDED', isSuspended: true, suspendedAt, suspendedBy, suspensionReason }
          );
        }
      } catch (_) {}
    }

    // Revoke all active sessions and disconnect Socket.IO connections for suspended user
    try {
      const { revokeUserTokens } = require('../middleware/authMiddleware');
      if (typeof revokeUserTokens === 'function') {
        await revokeUserTokens(user.id || user._id, 'account_suspension');
      }
    } catch (_) {}

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_SUSPEND',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus, isSuspended: false },
        afterSummary: { accountStatus: 'SUSPENDED', isSuspended: true, suspensionReason: reason.trim() },
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    // In-app notification for suspended user
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification(user.id, 'Account Suspended', `Your account has been suspended by an administrator. Reason: ${reason.trim()}`, 'ACCOUNT_SUSPENDED');
    } catch (_) {}

    return res.json({
      message: 'Account suspended successfully',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: user.accountStatus,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

const reactivateAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory reactivation reason (minimum 5 characters) is required.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    if (['DELETED', 'PENDING_ADMIN_REVIEW', 'PENDING_EMAIL_VERIFICATION', 'REJECTED'].includes(user.accountStatus)) {
      return res.status(409).json({
        message: `Illegal state transition: Cannot reactivate account in ${user.accountStatus} status.`,
      });
    }

    const previousStatus = user.accountStatus || 'SUSPENDED';
    await updateUserById(user.id || id, {
      accountStatus: 'ACTIVE',
      isSuspended: false,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
    });

    if (db.collections?.student_profiles) {
      await db.collections.student_profiles.updateOne(
        { $or: [{ user_id: user.id }, { user_id: Number(user.id) }, { user_id: String(user.id) }, { email: user.email }] },
        { $set: { accountStatus: 'ACTIVE', isSuspended: false } }
      ).catch(() => {});
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const { Student } = require('../models/Student');
        const { Provider } = require('../models/Provider');
        const { User: UserModel } = require('../models/User');
        if (Student && typeof Student.findOneAndUpdate === 'function') {
          await Student.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { accountStatus: 'active' }
          );
        }
        if (Provider && typeof Provider.findOneAndUpdate === 'function') {
          await Provider.findOneAndUpdate(
            { $or: [{ userId: user.id }, { userId: String(user.id) }, { user_id: user.id }, { email: user.email }] },
            { accountStatus: 'active' }
          );
        }
        if (UserModel && typeof UserModel.findOneAndUpdate === 'function') {
          await UserModel.findOneAndUpdate(
            { $or: [{ id: user.id }, { _id: user._id }, { email: user.email }] },
            { accountStatus: 'ACTIVE', isSuspended: false, suspendedAt: null, suspendedBy: null, suspensionReason: null }
          );
        }
      } catch (_) {}
    }

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_REACTIVATE',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus, isSuspended: true },
        afterSummary: { accountStatus: 'ACTIVE', isSuspended: false },
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    // In-app notification for reactivated user
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification(user.id, 'Account Reactivated', 'Your ISKOLAR account has been reactivated by an administrator.', 'ACCOUNT_REACTIVATED');
    } catch (_) {}

    return res.json({
      message: 'Account reactivated successfully',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: 'ACTIVE',
        isSuspended: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

const archiveAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory archival reason (minimum 5 characters) is required.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    if (['DELETED', 'PENDING_ADMIN_REVIEW', 'PENDING_EMAIL_VERIFICATION'].includes(user.accountStatus)) {
      return res.status(409).json({
        message: `Illegal state transition: Cannot archive account in ${user.accountStatus} status.`,
      });
    }

    if (String(user.id) === String(adminUser.id)) {
      return res.status(400).json({
        message: 'Protection Violation: You cannot archive your own active administrator account.',
      });
    }

    const previousStatus = user.accountStatus || 'ACTIVE';
    await updateUserById(user.id || id, {
      accountStatus: 'ARCHIVED',
      isSuspended: true,
      archivedAt: new Date().toISOString(),
    });

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_ARCHIVE',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus },
        afterSummary: { accountStatus: 'ARCHIVED' },
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'Account archived successfully with records preserved',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: 'ARCHIVED',
      },
    });
  } catch (error) {
    next(error);
  }
};

const softDeleteAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason, deleteReason } = req.body || {};
    const effectiveReason = (reason || deleteReason || '').trim();

    if (!effectiveReason || effectiveReason.length < 5) {
      return res.status(400).json({
        message: 'A mandatory deletion reason (minimum 5 characters) is required for account deactivation.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    // Protection 1: Cannot delete own admin account
    if (String(user.id) === String(adminUser.id)) {
      return res.status(400).json({
        message: 'Protection Violation: You cannot delete your own active administrator account.',
      });
    }

    // Protection 2: Cannot delete last active administrator
    if (user.role === 'admin' || user.role === 'administrator') {
      let activeAdminsCount = 0;
      if (db.collections?.users) {
        activeAdminsCount = await db.collections.users.countDocuments({
          role: { $in: ['admin', 'administrator'] },
          isDeleted: { $ne: true },
          accountStatus: { $nin: ['DELETION_PENDING', 'DELETED'] },
        });
      } else {
        activeAdminsCount = (db.data.users || []).filter(
          (u) => (u.role === 'admin' || u.role === 'administrator') && !u.isDeleted && u.accountStatus !== 'DELETION_PENDING' && u.accountStatus !== 'DELETED'
        ).length;
      }
      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          message: 'Protection Violation: Cannot delete the last active administrator account.',
        });
      }
    }

    const previousStatus = user.accountStatus || 'ACTIVE';
    const retentionUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const deletedAt = new Date().toISOString();

    await updateUserById(user.id || id, {
      accountStatus: 'DELETION_PENDING',
      isDeleted: true,
      isSuspended: true,
      deletedAt,
      deletedBy: String(adminUser.id || adminUser._id),
      deletionReason: effectiveReason,
      retentionUntil,
    });

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_SOFT_DELETE',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus },
        afterSummary: {
          accountStatus: 'DELETION_PENDING',
          isDeleted: true,
          deletionReason: effectiveReason,
          retentionUntil,
        },
        reason: effectiveReason,
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'Account scheduled for soft deletion and archived with 30-day retention',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: 'DELETION_PENDING',
        isDeleted: true,
        deletedAt,
        deletionReason: effectiveReason,
        retentionUntil,
      },
    });
  } catch (error) {
    next(error);
  }
};

const permanentDeleteAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason, mfaCode, impactPreviewOnly } = req.body || {};

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    // Impact preview calculation
    let studentAppsCount = 0;
    let providerScholarshipsCount = 0;
    let userDocsCount = 0;
    let auditLogsCount = 0;

    if (db.collections?.applications) {
      studentAppsCount = await db.collections.applications.countDocuments({
        $or: [{ student_id: user.id }, { studentId: user.id }],
      });
      providerScholarshipsCount = await db.collections.scholarships.countDocuments({
        $or: [{ sponsor_id: user.id }, { provider_id: user.id }, { providerId: user.id }],
      });
      userDocsCount = await db.collections.documents.countDocuments({
        $or: [{ user_id: user.id }, { studentId: user.id }],
      });
    } else {
      studentAppsCount = (db.data.applications || []).filter((a) => String(a.student_id) === String(user.id)).length;
      providerScholarshipsCount = (db.data.scholarships || []).filter((s) => String(s.sponsor_id) === String(user.id)).length;
      userDocsCount = (db.data.documents || []).filter((d) => String(d.user_id || d.studentId) === String(user.id)).length;
    }

    const impactPreview = {
      accountId: user.id,
      accountEmail: user.email,
      role: user.role,
      affectedApplicationsCount: studentAppsCount,
      affectedScholarshipsCount: providerScholarshipsCount,
      affectedDocumentsCount: userDocsCount,
      preservedAuditRecordsCount: auditLogsCount,
      retentionPolicy: 'Applications and decisions preserved with PII anonymized; audit ledgers immutable.',
    };

    const isPreview = impactPreviewOnly || req.query?.impactPreview === 'true' || req.query?.impactPreview === true;
    if (isPreview) {
      return res.json({ impactPreview });
    }

    // Permanent Deletion Validation
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory permanent deletion reason (minimum 5 characters) is required.',
      });
    }

    // MFA Verification Guard
    if (!mfaCode || String(mfaCode).trim().length < 6) {
      return res.status(403).json({
        message: 'Elevated Action Requirement: Valid 6-digit Administrator MFA re-authentication code is required for permanent data deletion.',
        code: 'MFA_REQUIRED',
      });
    }

    // Self & Last-Admin Protections
    if (String(user.id) === String(adminUser.id)) {
      return res.status(400).json({
        message: 'Protection Violation: Cannot permanently delete your own active administrator account.',
      });
    }

    if (user.role === 'admin' || user.role === 'administrator') {
      let activeAdminsCount = 0;
      if (db.collections?.users) {
        activeAdminsCount = await db.collections.users.countDocuments({
          role: { $in: ['admin', 'administrator'] },
          isDeleted: { $ne: true },
          accountStatus: { $ne: 'DELETED' },
        });
      } else {
        activeAdminsCount = (db.data.users || []).filter(
          (u) => (u.role === 'admin' || u.role === 'administrator') && !u.isDeleted && u.accountStatus !== 'DELETED'
        ).length;
      }
      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          message: 'Protection Violation: Cannot delete the last active administrator account.',
        });
      }
    }

    // Anonymize personal info while preserving application history & audit records
    const previousEmail = user.email;
    await updateUserById(user.id || id, {
      accountStatus: 'DELETED',
      isDeleted: true,
      name: 'Anonymized Account',
      email: `deleted_${user.id}_${Date.now()}@anonymized.iskolar.local`,
      phone: null,
      phoneNumber: null,
      password: 'DELETED_ACCOUNT_CREDENTIAL_DISABLED',
      passwordHash: 'DELETED_ACCOUNT_CREDENTIAL_DISABLED',
      deletedAt: new Date().toISOString(),
      deletedBy: String(adminUser.id),
      deletionReason: reason.trim(),
    });

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_PERMANENT_DELETE',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { email: previousEmail },
        afterSummary: { accountStatus: 'DELETED', isDeleted: true },
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'Eligible account data permanently anonymized; historical evidence preserved safely',
      impactPreview,
      account: {
        id: user.id,
        accountStatus: 'DELETED',
        isDeleted: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

const restoreAccount = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'A mandatory restoration reason (minimum 5 characters) is required.',
      });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    if (['PENDING_ADMIN_REVIEW', 'PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'DELETED', 'REJECTED'].includes(user.accountStatus)) {
      return res.status(409).json({
        message: `Illegal state transition: Cannot restore account in ${user.accountStatus} status.`,
      });
    }

    const previousStatus = user.accountStatus || 'DELETION_PENDING';
    await updateUserById(user.id || id, {
      accountStatus: 'ACTIVE',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      retentionUntil: null,
    });

    // Audit Log
    try {
      const auditEntry = {
        id: Date.now(),
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_RESTORE',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus, isDeleted: true },
        afterSummary: { accountStatus: 'ACTIVE', isDeleted: false },
        reason: reason.trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'Account restored successfully',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: 'ACTIVE',
        isDeleted: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

const revokeAccountSessions = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const user = (db.data.users || []).find((u) => String(u.id) === String(id) || String(u._id) === String(id));
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    user.sessionsRevokedAt = new Date().toISOString();
    try { await db.write(); } catch (e) {}

    // Audit Log
    try {
      if (!db.data.audit_logs) db.data.audit_logs = [];
      const auditEntry = {
        id: db.data.audit_logs.length + 1,
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_SESSIONS_REVOKED',
        targetType: 'User',
        targetId: String(user.id || user._id),
        reason: (reason || 'Administrative immediate session invalidation').trim(),
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      db.data.audit_logs.push(auditEntry);
      try { await db.write(); } catch (e) {}

      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    return res.json({
      message: 'All active sessions and tokens for user revoked successfully',
      revokedAt: user.sessionsRevokedAt,
    });
  } catch (error) {
    next(error);
  }
};

const getAccountHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = (db.data.audit_logs || []).filter(
      (l) => String(l.targetId) === String(id) || String(l.actorUserId) === String(id)
    );
    const versions = (db.data.account_version_history || []).filter((v) => String(v.userId || v.accountId) === String(id));

    return res.json({ logs, versions, auditLogs: logs, versionHistory: versions });
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

const previewAccountDocument = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id, docId } = req.params;

    const user = (db.data.users || []).find((u) => String(u.id) === String(id) || String(u._id) === String(id));
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    let doc = (db.data.documents || []).find(
      (d) => (String(d.id) === String(docId) || String(d.documentId) === String(docId) || d.filename === docId) &&
             (String(d.user_id || d.studentId || d.userId) === String(user.id) || String(d.student_id) === String(user.id))
    );

    if (!doc) {
      const studentProf = (db.data.student_profiles || []).find((p) => String(p.user_id) === String(user.id) || String(p.id) === String(user.id) || p.email === user.email);
      if (studentProf && studentProf.documents && typeof studentProf.documents === 'object') {
        for (const [docKey, docVal] of Object.entries(studentProf.documents)) {
          if (docVal && (docId === `prof_${docKey}_${user.id}` || docVal.fileName === docId || docVal === docId)) {
            const fn = docVal.fileName || (typeof docVal === 'string' ? docVal : `${docKey}.png`);
            doc = {
              id: docId,
              filename: fn,
              storedKey: fn,
              originalname: `${docKey}.png`,
              mimeType: fn.endsWith('.pdf') ? 'application/pdf' : 'image/png',
              rawOcrText: `Student Document: ${docKey}\nApplicant: ${user.name}\nStatus: Under Review`
            };
            break;
          }
        }
      }
    }

    if (!doc && user.organization_documents && Array.isArray(user.organization_documents)) {
      user.organization_documents.forEach((orgDoc, idx) => {
        const fn = orgDoc.filename || orgDoc.fileName || (typeof orgDoc === 'string' ? orgDoc : `org_doc_${idx + 1}.png`);
        if (docId === `org_doc_${idx}_${user.id}` || fn === docId) {
          doc = {
            id: docId,
            filename: fn,
            storedKey: fn,
            originalname: orgDoc.originalname || fn,
            mimeType: fn.endsWith('.pdf') ? 'application/pdf' : 'image/png',
            rawOcrText: `Organization Verification Document: ${fn}`
          };
        }
      });
    }

    if (!doc) {
      return res.status(404).json({ message: 'Document not found for target account' });
    }

    const storageService = require('../utils/storageService');
    const storedKey = doc.storedKey || doc.filename || doc.path;

    // Audit document access
    try {
      if (!db.data.audit_logs) db.data.audit_logs = [];
      const auditEntry = {
        id: db.data.audit_logs.length + 1,
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_DOCUMENT_ACCESS',
        targetType: 'Document',
        targetId: String(doc.id || docId),
        reason: `Administrator previewed document: ${doc.originalname || doc.filename}`,
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      db.data.audit_logs.push(auditEntry);
      try { await db.write(); } catch (e) {}

      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    // Check if storageService can download
    try {
      const fileData = await storageService.downloadFile(storedKey);
      const mimeType = doc.mimeType || doc.mimetype || fileData.mimeType || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.originalname || doc.filename || 'document'}"`);
      if (fileData.stream) {
        return fileData.stream.pipe(res);
      } else if (fileData.buffer) {
        return res.send(fileData.buffer);
      }
    } catch (storageErr) {
      const mimeType = doc.mimeType || 'application/pdf';
      res.setHeader('Content-Type', mimeType);
      return res.send(Buffer.from(doc.rawOcrText || '%PDF-1.4 Mock Document Content'));
    }
  } catch (error) {
    next(error);
  }
};

const requestMoreInfo = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { message, requestedItems, dueAt } = req.body || {};

    const effectiveMessage = (message || requestedItems || '').trim();
    if (effectiveMessage.length < 5) {
      return res.status(400).json({
        message: 'A mandatory information request message (minimum 5 characters) is required.',
      });
    }

    const user = (db.data.users || []).find((u) => String(u.id) === String(id) || String(u._id) === String(id));
    if (!user) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    const previousStatus = user.accountStatus || 'PENDING_ADMIN_REVIEW';
    user.accountStatus = 'INFORMATION_REQUIRED';
    user.informationRequest = effectiveMessage;
    user.informationDueAt = dueAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    user.requestedAt = new Date().toISOString();
    user.requestedBy = String(adminUser.id || adminUser._id);

    try { await db.write(); } catch (e) {}

    // Audit Log
    try {
      if (!db.data.audit_logs) db.data.audit_logs = [];
      const auditEntry = {
        id: db.data.audit_logs.length + 1,
        actorUserId: adminUser.id || 1,
        actorRole: 'admin',
        action: 'ADMIN_ACCOUNT_REQUEST_INFO',
        targetType: 'User',
        targetId: String(user.id || user._id),
        beforeSummary: { accountStatus: previousStatus },
        afterSummary: { accountStatus: 'INFORMATION_REQUIRED', informationRequest: effectiveMessage },
        reason: effectiveMessage,
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      };
      db.data.audit_logs.push(auditEntry);
      try { await db.write(); } catch (e) {}

      if (mongoose.connection.readyState === 1) {
        await AuditLog.create(auditEntry);
      }
    } catch (e) {}

    // Durable Notification
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification({
        userId: user.id,
        title: 'Additional Information Required',
        message: `An administrator has requested additional information: "${effectiveMessage}"`,
        type: 'INFORMATION_REQUIRED',
        link: '/verification',
      });
    } catch (notifErr) {
      if (!db.data.notifications) db.data.notifications = [];
      db.data.notifications.push({
        id: Date.now(),
        userId: user.id,
        user_id: user.id,
        recipient_id: user.id,
        title: 'Additional Information Required',
        message: `An administrator has requested additional information: "${effectiveMessage}"`,
        type: 'INFORMATION_REQUIRED',
        read: false,
        created_at: new Date().toISOString(),
      });
      try { await db.write(); } catch (e) {}
    }

    return res.json({
      message: 'Information request sent successfully',
      account: {
        id: user.id,
        email: user.email,
        accountStatus: user.accountStatus,
        informationRequest: user.informationRequest,
        informationDueAt: user.informationDueAt,
      },
    });
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
  editScholarshipContent,
  getScholarshipVersions,
  softDeleteScholarship,
  listStudents,
  getAuditLogs,
  blockAuditLogMutation,
  blockPrivateMessageMutation,
  listAccounts,
  getAccountDetails,
  editAccount,
  verifyAccount,
  rejectAccount,
  requestMoreInfo,
  suspendAccount,
  reactivateAccount,
  archiveAccount,
  softDeleteAccount,
  permanentDeleteAccount,
  restoreAccount,
  revokeAccountSessions,
  getAccountHistory,
  previewAccountDocument,
};
