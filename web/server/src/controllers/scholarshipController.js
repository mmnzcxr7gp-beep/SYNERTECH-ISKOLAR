const path = require('path');
const { db, createId } = require('../config/db');
const cacheService = require('../utils/cacheService');

const SCHOLARSHIP_CACHE_KEY = 'scholarships:open';
const SCHOLARSHIP_CACHE_TTL = 60 * 1000; // 60 seconds

const isSponsorRole = (role) => role === 'sponsor' || role === 'provider';
const { isOwnedBy } = require('../utils/ownership');

const getScholarships = async (req, res, next) => {
  try {
    // Phase 2: Cache-through for scholarship listings
    const cached = cacheService.get(SCHOLARSHIP_CACHE_KEY);
    if (cached) return res.json({ scholarships: cached });

    let rawScholarships = [];
    if (db.collections?.scholarships) {
      rawScholarships = await db.collections.scholarships.find({ status: 'open' }).toArray();
    } else {
      rawScholarships = (db.data.scholarships || []).filter((scholarship) => scholarship.status === 'open');
    }

    const scholarships = await Promise.all(
      rawScholarships.map(async (scholarship) => {
        let sponsor = null;
        if (db.collections?.users) {
          sponsor = await db.collections.users.findOne({ id: scholarship.sponsor_id });
        } else {
          sponsor = (db.data.users || []).find((u) => u.id === scholarship.sponsor_id);
        }
        return {
          ...scholarship,
          criteria: JSON.parse(scholarship.criteria_json || '{}'),
          sponsor_name: sponsor?.name || null,
          sponsor_verified: !!sponsor?.sponsor_verified,
          organization_verified: !!sponsor?.organization_verified,
        };
      })
    );

    cacheService.set(SCHOLARSHIP_CACHE_KEY, scholarships, SCHOLARSHIP_CACHE_TTL);
    return res.json({ scholarships });
  } catch (error) {
    next(error);
  }
};

const getScholarshipById = async (req, res, next) => {
  try {
    const targetIdStr = String(req.params.id);
    let scholarship = null;
    if (db.collections?.scholarships) {
      scholarship = await db.collections.scholarships.findOne({
        $or: [{ id: targetIdStr }, { id: Number(targetIdStr) }, { _id: targetIdStr }],
      });
    }
    if (!scholarship && db.data.scholarships) {
      scholarship = db.data.scholarships.find((item) => String(item.id) === targetIdStr);
    }
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }
    return res.json({ scholarship: { ...scholarship, criteria: JSON.parse(scholarship.criteria_json || '{}') } });
  } catch (error) {
    next(error);
  }
};

const createScholarship = async (req, res, next) => {
  try {
    const {
      title,
      description,
      slots,
      totalSlots,
      deadline,
      applicationDeadline,
      requirements,
      criteria,
      type,
      benefits,
      eligibilityRequirements,
      allowance,
      maxAmount,
      hasExam,
      examDetails,
      hasInterview,
      interviewDetails,
      selectionStages,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Scholarship title is required and cannot be empty' });
    }

    const rawSlots = slots !== undefined ? slots : totalSlots;
    const parsedSlots = Number(rawSlots);
    if (rawSlots !== undefined && (isNaN(parsedSlots) || parsedSlots < 1)) {
      return res.status(400).json({ message: 'Slots must be a positive integer greater than or equal to 1' });
    }
    const finalSlots = !isNaN(parsedSlots) && parsedSlots >= 1 ? parsedSlots : 1;

    const rawDeadline = deadline || applicationDeadline;
    if (rawDeadline) {
      const d = new Date(rawDeadline);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: 'Invalid deadline date format' });
      }
    }

    const requirementsArray = Array.isArray(requirements)
      ? requirements.map(r => (typeof r === 'object' && r.requirementName ? r.requirementName : String(r).trim())).filter(Boolean)
      : (typeof requirements === 'string' && requirements.trim()
          ? [requirements.trim()]
          : []);

    const scholarship = {
      id: createId('scholarships'),
      sponsor_id: req.user.id,
      title: title.trim(),
      description: description || '',
      type: type || 'Scholarship',
      benefits: benefits || '',
      eligibilityRequirements: eligibilityRequirements || '',
      slots: finalSlots,
      deadline: rawDeadline || '',
      allowance: allowance ? parseFloat(allowance) : 0,
      maxAmount: maxAmount ? parseFloat(maxAmount) : 0,
      requirements: requirementsArray,
      hasExam: !!hasExam,
      examDetails: examDetails || '',
      hasInterview: !!hasInterview,
      interviewDetails: interviewDetails || '',
      selectionStages: Array.isArray(selectionStages) && selectionStages.length > 0
        ? selectionStages
        : ['Document Review', hasExam ? 'Entrance/Qualifying Exam' : null, hasInterview ? 'Panel Interview' : null, 'Final Awarding'].filter(Boolean),
      criteria_json: JSON.stringify(criteria || { gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: 'open',
      created_at: new Date().toISOString(),
    };
    if (db.collections?.scholarships) {
      await db.collections.scholarships.insertOne({ ...scholarship });
    }
    db.data.scholarships.push(scholarship);
    await db.write();
    cacheService.invalidatePattern('scholarships:');
    return res.status(201).json({ scholarship: { ...scholarship, criteria: JSON.parse(scholarship.criteria_json) } });
  } catch (error) {
    next(error);
  }
};

const updateScholarship = async (req, res, next) => {
  try {
    const targetIdStr = String(req.params.id);
    const scholarship = db.data.scholarships.find((item) => String(item.id) === targetIdStr);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to update this scholarship' });
    }

    const fields = req.body;
    scholarship.title = fields.title ?? scholarship.title;
    scholarship.description = fields.description ?? scholarship.description;
    scholarship.slots = fields.slots ?? scholarship.slots;
    scholarship.deadline = fields.deadline ?? scholarship.deadline;
    
    // Update requirements as array if provided
    if (fields.requirements !== undefined) {
      const requirementsArray = Array.isArray(fields.requirements)
        ? fields.requirements.filter(r => typeof r === 'string' && r.trim())
        : (typeof fields.requirements === 'string' && fields.requirements.trim()
            ? [fields.requirements.trim()]
            : []);
      scholarship.requirements = requirementsArray;
    }
    
    scholarship.criteria_json = fields.criteria ? JSON.stringify(fields.criteria) : scholarship.criteria_json;
    // If sponsor/provider explicitly sets status, persist it.
    // Otherwise keep existing.
    // Default to 'open' because students browse only open scholarships.
    scholarship.status = fields.status ?? scholarship.status ?? 'open';
    // Ensure status is normalized (avoid case/whitespace issues)
    if (typeof scholarship.status === 'string') {
      scholarship.status = scholarship.status.trim().toLowerCase();
    }
    await db.write();
    cacheService.invalidatePattern('scholarships:');

    return res.json({ scholarship: { ...scholarship, criteria: JSON.parse(scholarship.criteria_json || '{}') } });
  } catch (error) {
    next(error);
  }
};

const getScholarshipApplications = (req, res, next) => {
  try {
    const targetIdStr = String(req.params.id);
    const scholarship = db.data.scholarships.find((item) => String(item.id) === targetIdStr);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to view applications for this scholarship' });
    }

    const applications = db.data.applications
      .filter((app) => String(app.scholarship_id || app.scholarshipId) === targetIdStr)
      .sort((a, b) => b.score - a.score)
      .map((application) => {
        const student = db.data.users.find((user) => user.id === application.student_id) || {};
        const profile = db.data.student_profiles.find((item) => item.user_id === application.student_id) || {};
        const docs = (db.data.documents || [])
          .filter((d) => String(d.application_id || d.applicationId || '') === String(application.id || application._id || ''))
          .map((d) => {
            const docId = d.id || d._id || d.documentId;
            const storedFilename = d.filename || (typeof d.path === 'string' ? path.basename(d.path) : null);
            const documentUrl =
              d.fileUrl ||
              (docId ? `/api/documents/${docId}/download` : (d.url || (storedFilename ? `/uploads/${storedFilename}` : null)));

            return {
              id: docId,
              documentId: String(docId),
              requirement_name: d.requirement_name || d.type || d.requirement_field || 'Certificate of Enrollment (COE)',
              originalname: d.originalname || d.originalFilename || `${d.requirement_name || 'Document'}.pdf`,
              filename: d.filename,
              mime_type: d.mime_type || d.mimeType || 'application/pdf',
              uploaded_at: d.uploaded_at || d.uploadedAt || application.applied_at || new Date().toISOString(),
              url: documentUrl,
              fileUrl: documentUrl,
              status: d.status || d.verificationStatus || 'PENDING_HUMAN_REVIEW',
              verificationStatus: d.verificationStatus || d.status || 'PENDING_HUMAN_REVIEW',
              manualReviewStatus: d.manualReviewStatus || 'PENDING',
              ocr_status: d.ocr_status || d.ocrStatus || 'PENDING_HUMAN_REVIEW',
              ocrStatus: d.ocrStatus || d.ocr_status || 'PENDING_HUMAN_REVIEW',
            };
          });
        return {
          id: application.id,
          status: application.status,
          score: application.score,
          applied_at: application.applied_at,
          student_name: student.name,
          student_email: student.email,
          gpa: profile.gpa,
          family_income: profile.family_income,
          achievements: profile.achievements,
          documents: docs,
        };
      });

    return res.json({ applications });
  } catch (error) {
    next(error);
  }
};

const browseScholarships = (req, res, next) => {
  try {
    const cacheKey = 'scholarships:browse';
    const cached = cacheService.get(cacheKey);
    if (cached) return res.json({ scholarships: cached });

    const scholarships = db.data.scholarships
      .filter((scholarship) => scholarship.status === 'open')
      .map((scholarship) => ({
        ...scholarship,
        criteria: JSON.parse(scholarship.criteria_json || '{}'),
        sponsor_name: db.data.users.find((u) => u.id === scholarship.sponsor_id)?.name || null,
        sponsor_verified: !!db.data.users.find((u) => u.id === scholarship.sponsor_id)?.sponsor_verified,
        organization_verified: !!db.data.users.find((u) => u.id === scholarship.sponsor_id)?.organization_verified,
      }));

    cacheService.set(cacheKey, scholarships, SCHOLARSHIP_CACHE_TTL);
    return res.json({ scholarships });
  } catch (error) {
    next(error);
  }
};

const deleteScholarship = async (req, res, next) => {
  try {
    const index = db.data.scholarships.findIndex((item) => item.id === Number(req.params.id));
    if (index === -1) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }
    const scholarship = db.data.scholarships[index];
    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to delete this scholarship' });
    }
    db.data.scholarships.splice(index, 1);
    await db.write();
    cacheService.invalidatePattern('scholarships:');
    return res.json({ message: 'Scholarship deleted' });
  } catch (error) {
    next(error);
  }
};

const getProviderScholarships = (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = Number(req.user?.id);
    const rawList = Array.isArray(db.data.scholarships) ? db.data.scholarships : [];

    const filtered = rawList.filter((s) => {
      if (isAdmin) return true;
      return Number(s.sponsor_id ?? s.provider_id) === userId;
    });

    const applications = Array.isArray(db.data.applications) ? db.data.applications : [];

    const mapped = filtered.map((scholarship) => {
      const schId = scholarship.id ?? scholarship._id;
      const apps = applications.filter((a) => String(a.scholarship_id || a.scholarshipId) === String(schId));
      const approvedCount = apps.filter((a) => String(a.status || '').toLowerCase() === 'approved').length;

      let criteria = {};
      try {
        criteria = typeof scholarship.criteria_json === 'string' ? JSON.parse(scholarship.criteria_json) : (scholarship.criteria || {});
      } catch (e) {}

      return {
        ...scholarship,
        _id: scholarship._id || String(scholarship.id),
        id: scholarship.id || scholarship._id,
        totalSlots: scholarship.totalSlots || scholarship.slots || 0,
        approvedCount,
        applicantsCount: apps.length,
        applicationDeadline: scholarship.applicationDeadline || scholarship.deadline || '',
        status: scholarship.status || 'open',
        criteria,
      };
    });

    return res.json({
      opportunities: mapped,
      scholarships: mapped,
    });
  } catch (error) {
    next(error);
  }
};

const getScholarshipDetails = (req, res, next) => {
  try {
    const scholarship = db.data.scholarships.find((item) => item.id === Number(req.params.id));
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }
    const applications = db.data.applications.filter((a) => a.scholarship_id === scholarship.id);
    return res.json({
      scholarship: { ...scholarship, criteria: JSON.parse(scholarship.criteria_json || '{}') },
      totalApplicants: applications.length,
      approvedCount: applications.filter((a) => String(a.status || '').toLowerCase() === 'approved').length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScholarships,
  browseScholarships,
  getScholarshipById,
  getScholarshipDetails,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getProviderScholarships,
  getScholarshipApplications,
};
