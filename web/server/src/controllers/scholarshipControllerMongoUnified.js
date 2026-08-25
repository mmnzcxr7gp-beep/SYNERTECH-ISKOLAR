const {
  Scholarship,
  ScholarshipRequirement,
  ScholarshipApplication,
} = require('../models');
const { db } = require('../config/db');
const mongoose = require('mongoose');

// NOTE:
// These controllers are a drop-in replacement for the existing
// scholarship-opportunity controllers, but they read/write from the
// unified Scholarship collection. We also bridge legacy JSON-backed
// scholarships stored in app_state so older listings are not lost.

const normalizeLegacyScholarshipForAdmin = (scholarship) => {
  const status = String(scholarship.status || '').trim().toLowerCase();
  const normalizedStatus = status === 'open' ? 'open' : status === 'closed' ? 'closed' : status;
  const deadline = scholarship.deadline ? new Date(scholarship.deadline).toISOString() : '';

  return {
    _id: `legacy-${scholarship.id}`,
    id: scholarship.id,
    provider_id: scholarship.sponsor_id,
    sponsor_id: scholarship.sponsor_id,
    title: scholarship.title,
    description: scholarship.description,
    slots: scholarship.slots,
    totalSlots: scholarship.slots,
    deadline,
    applicationDeadline: deadline,
    requirements: Array.isArray(scholarship.requirements)
      ? scholarship.requirements.filter((r) => typeof r === 'string' && r.trim())
      : [],
    status: normalizedStatus,
    criteria: scholarship.criteria_json ? JSON.parse(scholarship.criteria_json) : {},
    created_at: scholarship.created_at,
  };
};

const normalizeLegacyScholarshipForOpportunity = (scholarship) => {
  const legacy = normalizeLegacyScholarshipForAdmin(scholarship);
  const sponsor = db.data.users.find((user) => user.id === scholarship.sponsor_id) || {};

  return {
    _id: legacy._id,
    id: 0,
    opportunityId: legacy._id,
    title: legacy.title,
    description: legacy.description,
    totalSlots: legacy.totalSlots,
    applicationDeadline: legacy.applicationDeadline,
    applicantsCount: 0,
    requirements: legacy.requirements,
    sponsor_id: legacy.provider_id,
    sponsor_name: sponsor.name || '',
    sponsor_verified: !!sponsor.sponsor_verified,
    organization_verified: !!sponsor.organization_verified,
    slots: legacy.slots,
    deadline: legacy.deadline,
  };
};

const loadLegacyScholarships = () => {
  return Array.isArray(db.data.scholarships) ? db.data.scholarships : [];
};

const legacyScholarshipById = (id) => {
  return loadLegacyScholarships().find((scholarship) => String(scholarship.id) === String(id));
};

const legacyScholarshipsMatchingStatus = (allowedStatuses) => {
  return loadLegacyScholarships().filter((scholarship) => {
    const status = String(scholarship.status || '').trim().toLowerCase();
    return allowedStatuses.includes(status);
  });
};

const findMongoScholarshipById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Scholarship.findById(id);
};

/**
 * Provider: Create scholarship
 * POST /api/scholarships (Mongo)
 */
const normalizeScholarshipStatus = (status) => {
  // Default to 'Open' when publishing (not 'Draft')
  if (!status) return 'Open';
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'open') return 'Open';
  if (normalized === 'closed') return 'Closed';
  if (normalized === 'draft') return 'Draft';
  return 'Open';
};

const createScholarship = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      benefits,
      eligibilityRequirements,
      totalSlots,
      applicationDeadline,
      allowance,
      maxAmount,
      requirements,
    } = req.body;

    if (
      !title ||
      !description ||
      !type ||
      !benefits ||
      !eligibilityRequirements ||
      !totalSlots ||
      !applicationDeadline
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const status = normalizeScholarshipStatus(req.body?.status);

    const scholarship = new Scholarship({
      providerId: Number(req.user.id),
      title,
      description,
      type,
      benefits,
      eligibilityRequirements,
      totalSlots,
      applicationDeadline: new Date(applicationDeadline),
      allowance: allowance || 0,
      maxAmount: maxAmount || 0,
      status,
    });

    await scholarship.save();

    // Also save to legacy system for app_state collection compatibility
    const { createId } = require('../config/db');
    db.data.scholarships.push({
      id: createId('scholarships'),
      sponsor_id: Number(req.user.id),
      title,
      description,
      slots: totalSlots,
      deadline: new Date(applicationDeadline).toISOString(),
      requirements: Array.isArray(requirements)
        ? requirements.map((r) => (typeof r === 'string' ? r : (r.requirementName || r.name || '')))
            .filter(Boolean)
        : [],
      criteria_json: JSON.stringify({ gpa: 40, financialNeed: 30, achievements: 20, other: 10 }),
      status: status.toLowerCase(),
      created_at: new Date().toISOString(),
    });
    await db.write();

    if (requirements && Array.isArray(requirements)) {
      const normalized = requirements
        .map((r) => {
          if (typeof r === 'string') {
            const name = r.trim();
            if (!name) return null;
            return {
              requirementName: name,
              isRequired: true,
              description: '',
            };
          }

          if (r && typeof r === 'object') {
            const name = (r.requirementName ?? r.name ?? '').toString().trim();
            if (!name) return null;
            return {
              requirementName: name,
              isRequired: r.isRequired !== false,
              description: (r.description ?? '').toString(),
            };
          }

          return null;
        })
        .filter(Boolean);

      const requirementDocs = normalized.map((reqDoc) => ({
        scholarshipId: scholarship._id,
        requirementName: reqDoc.requirementName,
        isRequired: reqDoc.isRequired !== false,
        description: reqDoc.description || '',
      }));

      if (requirementDocs.length > 0) {
        await ScholarshipRequirement.insertMany(requirementDocs);
      }
    }

    const populatedScholarship = await Scholarship.findById(scholarship._id);

    res.status(201).json({
      message: 'Scholarship created successfully',
      scholarship: populatedScholarship,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Update scholarship
 */
const updateScholarship = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      benefits,
      eligibilityRequirements,
      totalSlots,
      applicationDeadline,
      allowance,
      maxAmount,
      status,
      requirements,
    } = req.body;

    const scholarship = await findMongoScholarshipById(id);
    if (!scholarship) {
      const legacyScholarship = legacyScholarshipById(id);
      if (!legacyScholarship) {
        return res.status(404).json({ message: 'Scholarship not found' });
      }

      if (legacyScholarship.sponsor_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this scholarship' });
      }

      legacyScholarship.title = title ?? legacyScholarship.title;
      legacyScholarship.description = description ?? legacyScholarship.description;
      legacyScholarship.slots = totalSlots ?? legacyScholarship.slots;
      legacyScholarship.deadline = applicationDeadline ?? legacyScholarship.deadline;
      if (requirements !== undefined) {
        legacyScholarship.requirements = Array.isArray(requirements)
          ? requirements.map((reqDoc) => {
              if (typeof reqDoc === 'string') return reqDoc.trim();
              return (reqDoc.requirementName || reqDoc.name || '').toString().trim();
            }).filter(Boolean)
          : legacyScholarship.requirements;
      }
      legacyScholarship.status = status ?? legacyScholarship.status;

      await db.write();
      return res.json({
        message: 'Scholarship updated successfully',
        scholarship: normalizeLegacyScholarshipForAdmin(legacyScholarship),
      });
    }

    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this scholarship' });
    }

    if (title) scholarship.title = title;
    if (description) scholarship.description = description;
    if (type) scholarship.type = type;
    if (benefits) scholarship.benefits = benefits;
    if (eligibilityRequirements) scholarship.eligibilityRequirements = eligibilityRequirements;
    if (totalSlots) scholarship.totalSlots = totalSlots;
    if (applicationDeadline) scholarship.applicationDeadline = new Date(applicationDeadline);
    if (allowance !== undefined) scholarship.allowance = allowance;
    if (maxAmount !== undefined) scholarship.maxAmount = maxAmount;
    if (status) scholarship.status = status;

    await scholarship.save();

    if (requirements && Array.isArray(requirements)) {
      await ScholarshipRequirement.deleteMany({ scholarshipId: id });

      const requirementDocs = requirements.map((reqDoc) => ({
        scholarshipId: scholarship._id,
        requirementName: reqDoc.requirementName,
        isRequired: reqDoc.isRequired !== false,
        description: reqDoc.description || '',
      }));

      if (requirementDocs.length > 0) {
        await ScholarshipRequirement.insertMany(requirementDocs);
      }
    }

    res.json({
      message: 'Scholarship updated successfully',
      scholarship,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Close/Delete scholarship (soft close)
 */
const deleteScholarship = async (req, res, next) => {
  try {
    const { id } = req.params;

    const scholarship = await findMongoScholarshipById(id);
    if (!scholarship) {
      const legacyScholarship = legacyScholarshipById(id);
      if (!legacyScholarship) {
        return res.status(404).json({ message: 'Scholarship not found' });
      }

      if (legacyScholarship.sponsor_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this scholarship' });
      }

      legacyScholarship.status = 'closed';
      await db.write();

      return res.json({
        message: 'Scholarship closed',
        scholarship: normalizeLegacyScholarshipForAdmin(legacyScholarship),
      });
    }

    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this scholarship' });
    }

    scholarship.status = 'Closed';
    await scholarship.save();

    res.json({
      message: 'Scholarship closed',
      scholarship,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: List scholarships for provider
 */
const getProviderScholarships = async (req, res, next) => {
  try {
    const { status, sort } = req.query;
    const query = { providerId: Number(req.user.id) };

    if (status) query.status = status;

    let scholarships = await Scholarship.find(query);

    if (sort === 'recent') {
      scholarships = scholarships.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'deadline') {
      scholarships = scholarships.sort((a, b) => a.applicationDeadline - b.applicationDeadline);
    } else if (sort === 'applicants') {
      scholarships = scholarships.sort((a, b) => b.applicantsCount - a.applicantsCount);
    }

    const scholarshipsWithCounts = await Promise.all(
      scholarships.map(async (s) => {
        const requirementCount = await ScholarshipRequirement.countDocuments({
          scholarshipId: s._id,
        });
        return { ...s.toObject(), requirementCount };
      })
    );

    res.json({
      message: 'Provider scholarships retrieved',
      scholarships: scholarshipsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

const getScholarships = async (req, res, next) => {
  try {
    const legacy = loadLegacyScholarships().map(normalizeLegacyScholarshipForAdmin);

    const scholarships = await Scholarship.find({}).lean();
    const mapped = await Promise.all(
      scholarships.map(async (s) => {
        const requirements = await ScholarshipRequirement.find({ scholarshipId: s._id }).lean();
        const provider = await require('../models/Provider').findOne({ userId: s.providerId }).lean();

        return {
          _id: s._id,
          id: s._id,
          provider_id: s.providerId,
          sponsor_id: s.providerId,
          title: s.title,
          description: s.description,
          slots: s.totalSlots,
          totalSlots: s.totalSlots,
          deadline: s.applicationDeadline ? s.applicationDeadline.toISOString() : '',
          applicationDeadline: s.applicationDeadline ? s.applicationDeadline.toISOString() : '',
          createdAt: s.createdAt,
          requirements: (requirements || []).map((r) => r.requirementName).filter(Boolean),
          status: String(s.status || '').toLowerCase(),
          sponsor_name: provider?.organizationName || '',
          sponsor_verified: !!provider?.isVerified,
          organization_verified: !!provider?.isVerified,
        };
      })
    );

    res.json({
      message: 'Scholarships retrieved',
      scholarships: [...legacy, ...mapped],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Browse open scholarships (matches existing mobile contract for opportunity browse)
 */
const browseScholarships = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const query = { status: { $in: ['Open', 'Draft', 'open', 'draft'] } };

    if (type) query.type = type;

    const skip = (page - 1) * limit;

    const legacyScholarships = legacyScholarshipsMatchingStatus(['open', 'draft'])
      .map((scholarship) => ({
        ...normalizeLegacyScholarshipForOpportunity(scholarship),
        createdAt: scholarship.created_at || null,
      }));

    const mongoose = require('mongoose');
    let mongoScholarships = [];
    if (mongoose.connection.readyState === 1) {
      try {
        mongoScholarships = await Scholarship.find(query).lean();
      } catch (err) {
        console.warn('⚠️ Scholarship.find query notice:', err?.message);
      }
    }
    const mappedMongo = await Promise.all(
      mongoScholarships.map(async (s) => {
        const reqDocs = await ScholarshipRequirement.find({ scholarshipId: s._id }).lean();
        const requirementNames = (reqDocs || []).map((r) => r.requirementName).filter(Boolean);

        const Provider = require('../models/Provider');
        const provider = await Provider.findOne({ userId: s.providerId }).lean();

        return {
          _id: s._id,
          id: 0,
          opportunityId: s._id,
          title: s.title,
          description: s.description,
          totalSlots: s.totalSlots,
          applicationDeadline: s.applicationDeadline ? s.applicationDeadline.toISOString() : '',
          applicantsCount: s.applicantsCount || 0,
          requirements: requirementNames,
          sponsor_id: provider?.userId ?? s.providerId,
          sponsor_name: provider?.organizationName ?? '',
          sponsor_verified: !!provider?.isVerified,
          organization_verified: !!provider?.isVerified,
          slots: s.totalSlots,
          deadline: s.applicationDeadline ? s.applicationDeadline.toISOString() : '',
          createdAt: s.createdAt,
          type: s.type,
          benefits: s.benefits,
          eligibilityRequirements: s.eligibilityRequirements,
          status: s.status,
        };
      })
    );

    const combined = [...legacyScholarships, ...mappedMongo];
    const total = combined.length;
    const pageItems = combined.slice(skip, skip + parseInt(limit));

    res.json({
      message: 'Scholarships retrieved',
      opportunities: pageItems,
      scholarships: pageItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getScholarshipById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const legacyScholarship = legacyScholarshipById(id);
    if (legacyScholarship) {
      return res.json({
        message: 'Scholarship retrieved',
        scholarship: normalizeLegacyScholarshipForAdmin(legacyScholarship),
        requirements: legacyScholarship.requirements || [],
      });
    }

    const scholarship = await findMongoScholarshipById(id);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    const requirements = await ScholarshipRequirement.find({ scholarshipId: scholarship._id });

    res.json({
      message: 'Scholarship retrieved',
      scholarship,
      requirements,
    });
  } catch (error) {
    next(error);
  }
};

const getScholarshipDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const scholarship = await findMongoScholarshipById(id);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (scholarship.status !== 'Open') {
      return res.status(400).json({ message: 'This scholarship is no longer open' });
    }

    const requirements = await ScholarshipRequirement.find({ scholarshipId: id });

    let hasApplied = false;
    if (req.user) {
      const existing = await ScholarshipApplication.findOne({
        scholarshipId: id,
        studentId: req.user.id,
      });
      hasApplied = !!existing;
    }

    res.json({
      message: 'Scholarship details retrieved',
      opportunity: scholarship, // preserve key for Flutter detail code compatibility
      requirements,
      hasApplied,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Get applications for a scholarship
 */
const getScholarshipApplications = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scholarship = await findMongoScholarshipById(id);
    if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });

    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view applications for this scholarship' });
    }

    const applications = await ScholarshipApplication.find({ scholarshipId: id }).populate('documents').lean();

    const mapped = applications.map((app) => ({
      id: app._id,
      status: app.status,
      appliedAt: app.appliedAt,
      studentId: app.studentId,
      documents: (app.documents || []).map((d) => ({
        id: d._id,
        requirement_name: d.requirementName || d.type || d.requirementField || '',
        originalname: d.originalName || d.originalname || '',
        filename: d.filename || '',
        mime_type: d.mimeType || d.mime_type || '',
        uploaded_at: d.uploadedAt || d.createdAt || null,
        url: d.fileUrl || d.url || (d.path && d.path.startsWith('/uploads/') ? d.path : null),
      })),
    }));

    res.json({ message: 'Applications retrieved', applications: mapped });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getProviderScholarships,
  getScholarships,
  browseScholarships,
  getScholarshipById,
  getScholarshipDetails,
  getScholarshipApplications,
};

