const fs = require('fs');
const path = require('path');
const {
  Scholarship,
  ScholarshipApplication,
  ScholarshipRequirement,
  ApplicationDocument,
  Student,
} = require('../models');

/**
 * Student: Submit scholarship application with documents
 * POST /api/scholarship-applications/:scholarshipId/submit
 */
const submitApplication = async (req, res, next) => {
  try {
    const { scholarshipId } = req.params;
    const studentId = req.user.id;
    const files = req.files || {};

    // Verify student is verified
    const student = await Student.findOne({ userId: studentId });
    if (!student || !student.isVerified) {
      return res.status(403).json({
        message: 'Your account must be verified before applying',
        verificationStatus: student?.verificationStatus || 'not_found',
      });
    }

    // Get scholarship from unified Scholarship collection
    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (scholarship.status !== 'Open') {
      return res.status(400).json({ message: 'Scholarship is not open for applications' });
    }

    // If this is an allowance-type scholarship, require student payment method details
    // (bank or e-wallet in the Philippines)
    const isAllowanceProgram =
      scholarship.type === 'Allowance' ||
      scholarship.type === 'Scholarship + Allowance';

    if (isAllowanceProgram) {
      const hasGcash = !!student?.paymentMethods?.gcash?.number && !!student?.paymentMethods?.gcash?.accountName;
      const hasPayMaya = !!student?.paymentMethods?.payMaya?.number && !!student?.paymentMethods?.payMaya?.accountName;
      const hasBank =
        !!student?.paymentMethods?.bankAccount?.accountNumber &&
        !!student?.paymentMethods?.bankAccount?.accountName &&
        !!student?.paymentMethods?.bankAccount?.bankName;

      if (!hasGcash && !hasPayMaya && !hasBank) {
        return res.status(400).json({
          message: 'Please fill in your bank/e-wallet payment details before applying.',
          paymentMethodsNeeded: true,
        });
      }
    }


    // Check if already applied
    const existingApp = await ScholarshipApplication.findOne({
      scholarshipId,
      studentId,
    });

    if (existingApp && existingApp.status !== 'Needs Resubmission') {
      return res.status(409).json({
        message: 'You have already applied to this scholarship',
        currentStatus: existingApp.status,
      });
    }

    // Get required documents
    const requirements = await ScholarshipRequirement.find({ scholarshipId });

    // Validate all required documents are provided
    const missingDocs = requirements
      .filter((req) => req.isRequired)
      .filter((req) => !files[req._id.toString()]);

    if (missingDocs.length > 0) {
      return res.status(400).json({
        message: 'Missing required documents',
        missingDocuments: missingDocs.map((d) => d.requirementName),
      });
    }

    // Create application
    let application;
    if (existingApp && existingApp.status === 'Needs Resubmission') {
      // Update existing application
      application = existingApp;
      application.status = 'Pending Review';
      application.submissionCount = (application.submissionCount || 1) + 1;
      application.lastResubmittedAt = new Date();
      application.documents = [];
    } else {
      // Create new application
      application = new ScholarshipApplication({
        scholarshipId,
        studentId,
        status: 'Pending Review',
      });
    }

    // Process uploaded documents
    const uploadedDocs = [];
    for (const [requirementId, fileArray] of Object.entries(files)) {
      if (!fileArray || fileArray.length === 0) continue;

      const file = fileArray[0];
      const requirement = await ScholarshipRequirement.findById(requirementId);

      if (!requirement) {
        continue;
      }

      // Create document record
      const doc = new ApplicationDocument({
        applicationId: application._id,
        requirementId,
        fileName: file.filename,
        fileUrl: `/uploads/documents/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype.split('/')[1],
        status: 'pending_review',
      });

      await doc.save();
      uploadedDocs.push(doc._id);
    }

    application.documents = uploadedDocs;
    await application.save();

    // Update scholarship applicant count
    if (!existingApp) {
      scholarship.applicantsCount = (scholarship.applicantsCount || 0) + 1;
      await scholarship.save();
    }

    try {
      const notificationService = require('../utils/notificationService');
      await notificationService.notifyApplicationCreated(studentId, scholarship.title);
    } catch (err) {
      console.error('Failed to send notification for application submission:', err?.message);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Get their application for a scholarship
 * GET /api/scholarship-applications/:scholarshipId/my-application
 */
const getStudentApplication = async (req, res, next) => {
  try {
    const { scholarshipId } = req.params;
    const studentId = req.user.id;

    const application = await ScholarshipApplication.findOne({
      scholarshipId,
      studentId,
    }).populate('documents');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({
      message: 'Application retrieved',
      application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student: Get all their applications
 * GET /api/scholarship-applications/student/list
 */
const getStudentApplications = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { status } = req.query;

    const query = { studentId };
    if (status) {
      query.status = status;
    }

    const applications = await ScholarshipApplication.find(query)
      .populate('scholarshipId', 'title type allowance applicationDeadline')
      .populate('documents')
      .sort({ appliedAt: -1 });

    res.json({
      message: 'Student applications retrieved',
      applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Get applicants for a scholarship
 * GET /api/scholarship-applications/scholarship/:scholarshipId/applicants
 */
const getApplicants = async (req, res, next) => {
  try {
    const { scholarshipId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Verify scholarship belongs to provider
    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these applicants' });
    }

    const query = { scholarshipId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const applications = await ScholarshipApplication.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('documents')
      .sort({ appliedAt: -1 });

    const total = await ScholarshipApplication.countDocuments(query);

    // Get student info for each application
    const applicantsWithStudentInfo = await Promise.all(
      applications.map(async (app) => {
        const student = await Student.findOne({ userId: app.studentId }).select(
          'email schoolName gradeLevel'
        );
        return {
          ...app.toObject(),
          studentEmail: student?.email || 'N/A',
          studentSchool: student?.schoolName || 'N/A',
          studentGrade: student?.gradeLevel || 'N/A',
        };
      })
    );

    res.json({
      message: 'Applicants retrieved',
      applicants: applicantsWithStudentInfo,
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
 * Provider: Get application details
 * GET /api/scholarship-applications/:applicationId/details
 */
const getApplicationDetails = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await ScholarshipApplication.findById(applicationId)
      .populate('scholarshipId')
      .populate('documents');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify authorization
    const scholarship = await Scholarship.findById(application.scholarshipId);
    if (
      scholarship.providerId !== req.user.id &&
      req.user.role !== 'admin' &&
      application.studentId !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    // Get student info
    const student = await Student.findOne({ userId: application.studentId });

    res.json({
      message: 'Application details retrieved',
      application,
      studentInfo: {
        email: student?.email,
        schoolName: student?.schoolName,
        gradeLevel: student?.gradeLevel,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider: Approve application
 * POST /api/scholarship-applications/:applicationId/approve
 */
const approveApplication = async (req, res, next) => {
  const mongoose = require('mongoose');
  let session = null;
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
      } catch (e) {
        console.warn('[Application] Could not start Mongoose session for approval:', e?.message);
      }
    }

    const { applicationId } = req.params;
    const { remarks } = req.body;

    const application = await ScholarshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify authorization
    const scholarship = await Scholarship.findById(application.scholarshipId);
    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to review this application' });
    }

    // Check if approved count hasn't exceeded total slots
    const approvedCount = await ScholarshipApplication.countDocuments({
      scholarshipId: application.scholarshipId,
      status: 'Approved',
    });

    if (approvedCount >= scholarship.totalSlots) {
      return res.status(400).json({
        message: 'All available slots have been filled',
        availableSlots: scholarship.totalSlots,
        currentApproved: approvedCount,
      });
    }

    if (session) session.startTransaction();
    const sessionOpts = session ? { session } : {};

    application.status = 'Approved';
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    application.providerRemarks = remarks || '';
    application.approvedAt = new Date();

    await application.save(sessionOpts);

    // Update scholarship approved count
    scholarship.approvedCount = (scholarship.approvedCount || 0) + 1;
    if (scholarship.approvedCount >= scholarship.totalSlots) {
      scholarship.status = 'Closed';
    }
    await scholarship.save(sessionOpts);

    if (session) await session.commitTransaction();

    // Trigger Notification & Socket Events
    try {
      const { createNotification } = require('./notificationController');
      await createNotification(
        application.studentId,
        'Application Approved!',
        `Congratulations! Your application for "${scholarship.title}" has been approved.`,
        'application_approved',
        { scholarshipId: scholarship._id }
      );

      if (global._io) {
        global._io.to(`user_${application.studentId}`).emit('application-status-changed', {
          status: 'APPROVED',
          scholarshipTitle: scholarship.title,
          message: `Your application for "${scholarship.title}" has been approved.`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify application approval:', notifErr?.message);
    }

    res.json({
      message: 'Application approved',
      application,
    });
  } catch (error) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
    }
    next(error);
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Provider: Reject application
 * POST /api/scholarship-applications/:applicationId/reject
 */
const rejectApplication = async (req, res, next) => {
  const mongoose = require('mongoose');
  let session = null;
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
      } catch (e) {
        console.warn('[Application] Could not start Mongoose session for rejection:', e?.message);
      }
    }

    const { applicationId } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        message: 'Rejection remarks are required',
      });
    }

    const application = await ScholarshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify authorization
    const scholarship = await Scholarship.findById(application.scholarshipId);
    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to review this application' });
    }

    if (session) session.startTransaction();
    const sessionOpts = session ? { session } : {};

    application.status = 'Rejected';
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    application.providerRemarks = remarks;

    await application.save(sessionOpts);

    if (session) await session.commitTransaction();

    // Trigger Notification & Socket Events
    try {
      const { createNotification } = require('./notificationController');
      await createNotification(
        application.studentId,
        'Application Rejected',
        `We regret to inform you that your application for "${scholarship.title}" was not approved. Remarks: ${remarks}`,
        'application_rejected',
        { scholarshipId: scholarship._id }
      );

      if (global._io) {
        global._io.to(`user_${application.studentId}`).emit('application-status-changed', {
          status: 'DENIED',
          scholarshipTitle: scholarship.title,
          message: `Your application for "${scholarship.title}" has been rejected.`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify application rejection:', notifErr?.message);
    }

    res.json({
      message: 'Application rejected',
      application,
    });
  } catch (error) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
    }
    next(error);
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Provider: Request resubmission
 * POST /api/scholarship-applications/:applicationId/request-resubmission
 */
const requestResubmission = async (req, res, next) => {
  const mongoose = require('mongoose');
  let session = null;
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
      } catch (e) {
        console.warn('[Application] Could not start Mongoose session for resubmission request:', e?.message);
      }
    }

    const { applicationId } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        message: 'Resubmission remarks are required',
      });
    }

    const application = await ScholarshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify authorization
    const scholarship = await Scholarship.findById(application.scholarshipId);
    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to review this application' });
    }

    if (session) session.startTransaction();
    const sessionOpts = session ? { session } : {};

    application.status = 'Needs Resubmission';
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    application.providerRemarks = remarks;

    await application.save(sessionOpts);

    if (session) await session.commitTransaction();

    // Trigger Notification & Socket Events
    try {
      const { createNotification } = require('./notificationController');
      await createNotification(
        application.studentId,
        'Resubmission Required',
        `Your application for "${scholarship.title}" requires document resubmission. Remarks: ${remarks}`,
        'application_resubmission_required',
        { scholarshipId: scholarship._id }
      );

      if (global._io) {
        global._io.to(`user_${application.studentId}`).emit('application-status-changed', {
          status: 'NEEDS_RESUBMISSION',
          scholarshipTitle: scholarship.title,
          message: `Your application for "${scholarship.title}" requires resubmission.`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify application resubmission request:', notifErr?.message);
    }

    res.json({
      message: 'Resubmission requested',
      application,
    });
  } catch (error) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
    }
    next(error);
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Provider: Add remarks to application
 * POST /api/scholarship-applications/:applicationId/remarks
 */
const addRemarks = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({ message: 'Remarks are required' });
    }

    const application = await ScholarshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify authorization
    const scholarship = await Scholarship.findById(application.scholarshipId);
    if (scholarship.providerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this application' });
    }

    application.providerRemarks = remarks;
    await application.save();

    res.json({
      message: 'Remarks added',
      application,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitApplication,
  getStudentApplication,
  getStudentApplications,
  getApplicants,
  getApplicationDetails,
  approveApplication,
  rejectApplication,
  requestResubmission,
  addRemarks,
};
