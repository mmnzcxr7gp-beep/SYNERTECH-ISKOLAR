const mongoose = require('mongoose');

const {
  ScholarshipOpportunity,
  ScholarshipRequirement,
  ScholarshipApplication,
  ApplicationDocument,
} = require('../models');

/**
 * Provider: Create scholarship opportunity
 * POST /api/scholarship-opportunities
 */
const createOpportunity = async (req, res, next) => {
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

    // Validate required fields
    if (
      !title ||
      !description ||
      !type ||
      !benefits ||
      !eligibilityRequirements ||
      !totalSlots ||
      !applicationDeadline
    ) {
      return res.status(400).json({
        message: 'Missing required fields',
      });
    }

    // Create opportunity
    const opportunity = new ScholarshipOpportunity({
      providerId: req.user.id,
      title,
      description,
      type,
      benefits,
      eligibilityRequirements,
      totalSlots,
      applicationDeadline: new Date(applicationDeadline),
      allowance: allowance || 0,
      maxAmount: maxAmount || 0,
      status: req.body?.status || 'Draft',
    });

    if (mongoose.connection.readyState === 1) {
      await opportunity.save();
    }

    // Add requirements if provided (supports both legacy string[] and object[] shapes)
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

      const requirementDocs = normalized.map((req) => ({
        scholarshipId: opportunity._id,
        requirementName: req.requirementName,
        isRequired: req.isRequired !== false,
        description: req.description || '',
      }));

      if (requirementDocs.length > 0 && mongoose.connection.readyState === 1) {
        await ScholarshipRequirement.insertMany(requirementDocs);
      }
    }

    // Populate requirements
    let populatedOpportunity = null;
    if (mongoose.connection.readyState === 1) {
      populatedOpportunity = await ScholarshipOpportunity.findById(opportunity._id);
    }

    res.status(201).json({
      message: 'Scholarship opportunity created successfully',
      opportunity: populatedOpportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Update scholarship opportunity
 * PUT /api/scholarship-opportunities/:id
 */
const updateOpportunity = async (req, res, next) => {
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

    let opportunity = null;
    if (mongoose.connection.readyState === 1) {
      opportunity = await ScholarshipOpportunity.findById(id);
    }
    if (!opportunity) {
      return res.status(404).json({ message: 'Scholarship opportunity not found' });
    }

    // Verify ownership
    if (opportunity.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this opportunity' });
    }

    // Update fields
    if (title) opportunity.title = title;
    if (description) opportunity.description = description;
    if (type) opportunity.type = type;
    if (benefits) opportunity.benefits = benefits;
    if (eligibilityRequirements) opportunity.eligibilityRequirements = eligibilityRequirements;
    if (totalSlots) opportunity.totalSlots = totalSlots;
    if (applicationDeadline) opportunity.applicationDeadline = new Date(applicationDeadline);
    if (allowance !== undefined) opportunity.allowance = allowance;
    if (maxAmount !== undefined) opportunity.maxAmount = maxAmount;
    if (status) opportunity.status = status;

    if (mongoose.connection.readyState === 1) {
      await opportunity.save();
    }

    // Update requirements if provided
    if (requirements && Array.isArray(requirements)) {
      // Delete existing requirements
      if (mongoose.connection.readyState === 1) {
        await ScholarshipRequirement.deleteMany({ scholarshipId: id });
      }
      // Add new requirements
      const requirementDocs = requirements.map((req) => ({
        scholarshipId: opportunity._id,
        requirementName: req.requirementName,
        isRequired: req.isRequired !== false,
        description: req.description || '',
      }));
      if (requirementDocs.length > 0 && mongoose.connection.readyState === 1) {
        await ScholarshipRequirement.insertMany(requirementDocs);
      }
    }

    res.json({
      message: 'Scholarship opportunity updated successfully',
      opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Delete scholarship opportunity
 * DELETE /api/scholarship-opportunities/:id
 */
const deleteOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;

    let opportunity = null;
    if (mongoose.connection.readyState === 1) {
      opportunity = await ScholarshipOpportunity.findById(id);
    }
    if (!opportunity) {
      return res.status(404).json({ message: 'Scholarship opportunity not found' });
    }

    // Verify ownership
    if (opportunity.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this opportunity' });
    }

    // Soft delete by changing status to Closed
    opportunity.status = 'Closed';
    if (mongoose.connection.readyState === 1) {
      await opportunity.save();
    }

    res.json({
      message: 'Scholarship opportunity closed',
      opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Get all opportunities for provider
 * GET /api/scholarship-opportunities/provider/list
 */
const getProviderOpportunities = async (req, res, next) => {
  try {
    const { status, sort } = req.query;
    const query = { providerId: req.user.id };

    if (status) {
      query.status = status;
    }

    let opportunities = [];
    if (mongoose.connection.readyState === 1) {
      opportunities = await ScholarshipOpportunity.find(query);
    }

    // Sort options
    if (sort === 'recent') {
      opportunities = opportunities.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'deadline') {
      opportunities = opportunities.sort((a, b) => a.applicationDeadline - b.applicationDeadline);
    } else if (sort === 'applicants') {
      opportunities = opportunities.sort((a, b) => b.applicantsCount - a.applicantsCount);
    }

    // Add requirements count
    const opportunitiesWithCounts = await Promise.all(
      opportunities.map(async (opp) => {
        const requirementCount = mongoose.connection.readyState === 1
          ? await ScholarshipRequirement.countDocuments({
              scholarshipId: opp._id,
            })
          : 0;
        return {
          ...opp.toObject(),
          requirementCount,
        };
      })
    );

    res.json({
      message: 'Provider opportunities retrieved',
      opportunities: opportunitiesWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Browse all open opportunities
 * GET /api/scholarship-opportunities/browse
 */
const browseOpportunities = async (req, res, next) => {
  try {
    const { type, sort, page = 1, limit = 10 } = req.query;
    // Temporarily include Draft opportunities so providers can be seen in student browse.
    // Once verified, we can switch this back to Open-only.
    const query = { status: { $in: ['Open', 'Draft'] } };

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;
    let opportunities = [];
    if (mongoose.connection.readyState === 1) {
      opportunities = await ScholarshipOpportunity.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    let total = 0;
    if (mongoose.connection.readyState === 1) {
      total = await ScholarshipOpportunity.countDocuments(query);
    }

    // Map to the JSON shape expected by the Flutter app's Scholarship.fromJson
    const mapped = await Promise.all(
      opportunities.map(async (opp) => {
        // requirements
        const reqs = mongoose.connection.readyState === 1
          ? await ScholarshipRequirement.find({ scholarshipId: opp._id }).lean()
          : [];
        const requirementNames = (reqs || [])
          .map((r) => r.requirementName)
          .filter(Boolean);

        // Sponsor/provider verification + name
        // Flutter expects: sponsor_name, sponsor_verified, organization_verified
        // In this backend, provider verification is stored on Provider.isVerified.
        // organizationVerified is treated as the same flag for now because the app doesn't have a separate schema.
        const Provider = require('../models/Provider');
        let provider = null;
        if (mongoose.connection.readyState === 1) {
          provider = await Provider.findOne({ userId: opp.providerId }).lean();
        }

        // Shape aligned with Flutter UI keys in opportunities_browse_screen.dart
        // Flutter expects: _id, applicationDeadline, totalSlots, applicantsCount
        // plus the scholarship_detail_screen.dart expects id/title/description/requirements/sponsor fields.
        return {
          // Used by Flutter browse card navigation: opp['_id']
          _id: opp._id,

          // Used by Flutter scholarship models (int). Keep a stable numeric fallback.
          id: 0,

          // Used by apply/details endpoints in your codebase.
          opportunityId: opp._id,

          title: opp.title,
          description: opp.description,

          // Flutter browse UI expects these names
          totalSlots: opp.totalSlots,
          applicationDeadline: opp.applicationDeadline ? opp.applicationDeadline.toISOString() : '',
          applicantsCount: 0,

          // Flutter expects list of strings for requirements
          requirements: requirementNames,

          // Sponsor/provider verification and name fields (used by Flutter detail screen)
          sponsor_id: provider?.userId ?? opp.providerId,
          sponsor_name: provider?.organizationName ?? '',
          sponsor_verified: !!provider?.isVerified,
          organization_verified: !!provider?.isVerified,

          // Backwards compatible aliases (in case other screens use them)
          slots: opp.totalSlots,
          deadline: opp.applicationDeadline ? opp.applicationDeadline.toISOString() : '',
        };
      })
    );

    res.json({
      message: 'Open opportunities retrieved',
      opportunities: mapped,
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

/**
 * Get scholarship opportunity by ID
 * GET /api/scholarship-opportunities/:id
 */
const getOpportunityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let opportunity = null;
    if (mongoose.connection.readyState === 1) {
      opportunity = await ScholarshipOpportunity.findById(id);
    }
    if (!opportunity) {
      return res.status(404).json({ message: 'Scholarship opportunity not found' });
    }

    // Get requirements
    let requirements = [];
    if (mongoose.connection.readyState === 1) {
      requirements = await ScholarshipRequirement.find({ scholarshipId: id });
    }

    res.json({
      message: 'Scholarship opportunity retrieved',
      opportunity,
      requirements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get scholarship opportunity details for students
 * GET /api/scholarship-opportunities/:id/details
 */
const getOpportunityDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    let opportunity = null;
    if (mongoose.connection.readyState === 1) {
      opportunity = await ScholarshipOpportunity.findById(id);
    }
    if (!opportunity) {
      return res.status(404).json({ message: 'Scholarship opportunity not found' });
    }

    if (opportunity.status !== 'Open') {
      return res.status(400).json({ message: 'This opportunity is no longer open' });
    }

    // Get requirements
    let requirements = [];
    if (mongoose.connection.readyState === 1) {
      requirements = await ScholarshipRequirement.find({ scholarshipId: id });
    }

    // Check if student already applied
    let hasApplied = false;
    if (req.user && mongoose.connection.readyState === 1) {
      const existing = await ScholarshipApplication.findOne({
        scholarshipId: id,
        studentId: req.user.id,
      });
      hasApplied = !!existing;
    }

    res.json({
      message: 'Scholarship opportunity details retrieved',
      opportunity,
      requirements,
      hasApplied,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getProviderOpportunities,
  browseOpportunities,
  getOpportunityById,
  getOpportunityDetails,
};
