const fs = require('fs');
const path = require('path');
const {
  Scholarship,
  ScholarshipApplication,
  ScholarshipRequirement,
  ApplicationDocument,
  Student,
} = require('../models');
const approvalService = require('../services/approvalService');

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
    const mongoose = require('mongoose');
    const { db } = require('../config/db');

    let student = await Student.findOne({
      $or: [
        { userId: studentId },
        { userId: Number(studentId) },
        ...(req.user.email ? [{ email: req.user.email }] : []),
      ],
    }).catch(() => null);

    if (!student || !student.isVerified) {
      let userDoc = null;
      if (db.collections?.users) {
        userDoc = await db.collections.users.findOne({
          $or: [
            { id: studentId },
            { id: Number(studentId) },
            { _id: studentId },
            ...(req.user.email ? [{ email: req.user.email }] : []),
          ],
        }).catch(() => null);
      }
      const isVerified = Boolean(
        student?.isVerified ||
        req.user.isVerified ||
        req.user.accountStatus === 'ACTIVE' ||
        userDoc?.isVerified ||
        userDoc?.accountStatus === 'ACTIVE'
      );
      if (!isVerified) {
        return res.status(403).json({
          message: 'Your account must be verified before applying',
          verificationStatus: student?.verificationStatus || userDoc?.verificationStatus || 'not_found',
        });
      }
    }

    // Get scholarship from unified Scholarship collection
    let scholarship = null;
    if (mongoose.Types.ObjectId.isValid(String(scholarshipId))) {
      scholarship = await Scholarship.findById(scholarshipId).catch(() => null);
    }
    if (!scholarship) {
      const num = Number(scholarshipId);
      scholarship = await Scholarship.findOne({
        $or: [
          { id: scholarshipId },
          ...(!Number.isNaN(num) ? [{ id: num }] : []),
        ],
      }).catch(() => null);
    }
    if (!scholarship && db.collections?.scholarships) {
      const num = Number(scholarshipId);
      const qList = [
        { id: scholarshipId },
        ...(!Number.isNaN(num) ? [{ id: num }] : []),
        { _id: scholarshipId },
        ...(!Number.isNaN(num) ? [{ _id: num }] : []),
      ];
      if (mongoose.Types.ObjectId.isValid(String(scholarshipId))) {
        qList.push({ _id: new mongoose.Types.ObjectId(String(scholarshipId)) });
      }
      scholarship = await db.collections.scholarships.findOne({ $or: qList }).catch(() => null);
    }

    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    const scholStatus = (scholarship.status || '').toString().toLowerCase();
    if (!['open', 'draft', 'active', 'published'].includes(scholStatus)) {
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
        success: false,
        code: 'DUPLICATE_FILE',
        message: 'You have already applied to this scholarship',
        currentStatus: existingApp.status,
      });
    }

    // Normalize incoming uploaded files from Array, Object, or base64 body.documents
    let rawFilesList = [];
    if (Array.isArray(req.files)) {
      rawFilesList = [...req.files];
    } else if (req.files && typeof req.files === 'object') {
      for (const [key, val] of Object.entries(req.files)) {
        if (Array.isArray(val)) {
          rawFilesList.push(...val);
        } else if (val && typeof val === 'object') {
          rawFilesList.push({ ...val, fieldname: val.fieldname || key });
        }
      }
    }

    if (req.body.documents && typeof req.body.documents === 'object') {
      for (const [key, val] of Object.entries(req.body.documents)) {
        if (val && (typeof val === 'object' || typeof val === 'string')) {
          const origName = typeof val === 'object' ? (val.filename || `${key}.png`) : `${key}.png`;
          const rawContent = typeof val === 'object' ? (val.content || val.base64 || '') : String(val);
          const rawBase64 = String(rawContent).replace(/^data:[^;]+;base64,/, '');

          let buffer;
          try {
            buffer = Buffer.from(rawBase64, 'base64');
            if (!buffer || buffer.length < 4) {
              buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            }
          } catch (_) {
            buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
          }

          const declaredMime = path.extname(origName).toLowerCase() === '.pdf' ? 'application/pdf' : 'image/png';
          rawFilesList.push({
            fieldname: key,
            originalname: origName,
            buffer,
            mimetype: declaredMime,
            size: buffer.length,
          });
        }
      }
    }

    // Get required documents
    let requirements = await ScholarshipRequirement.find({ scholarshipId });
    if (!requirements || requirements.length === 0) {
      const rawReqs = scholarship.requirements || scholarship.eligibilityRequirements || [];
      const reqArray = Array.isArray(rawReqs) ? rawReqs : (typeof rawReqs === 'string' ? rawReqs.split(',') : []);
      requirements = reqArray.map((rName, idx) => ({
        _id: `req_${idx}`,
        requirementName: String(rName).trim(),
        isRequired: true,
      })).filter((r) => r.requirementName.length > 0);
    }

    if (requirements.length === 0) {
      requirements = [{ _id: 'req_0', requirementName: 'Student ID', isRequired: true }];
    }

    // Match uploaded files with requirements
    const missingDocs = [];
    const matchedUploads = [];

    requirements.forEach((reqItem, idx) => {
      const reqIdStr = String(reqItem._id || `req_${idx}`);
      const reqName = String(reqItem.requirementName || '').toLowerCase().trim();

      const matchedFile = rawFilesList.find((f, fIdx) => {
        const fieldStr = String(f.fieldname || '').toLowerCase().trim();
        return (
          fieldStr === reqIdStr.toLowerCase() ||
          fieldStr === `file_${idx}` ||
          fieldStr === reqName ||
          (rawFilesList.length === requirements.length && fIdx === idx) ||
          (rawFilesList.length > 0 && requirements.length === 1)
        );
      });

      if (matchedFile) {
        matchedUploads.push({
          requirement: reqItem,
          file: matchedFile,
        });
      } else if (reqItem.isRequired) {
        missingDocs.push(reqItem.requirementName);
      }
    });

    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'FILE_REQUIRED',
        message: `Missing required documents: ${missingDocs.join(', ')}`,
        missingDocuments: missingDocs,
      });
    }

    if (rawFilesList.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'FILE_REQUIRED',
        message: 'No files attached. Please select and upload all required documents.',
      });
    }

    // Create / update application container
    let application;
    if (existingApp && existingApp.status === 'Needs Resubmission') {
      application = existingApp;
      application.status = 'Pending Review';
      application.submissionCount = (application.submissionCount || 1) + 1;
      application.lastResubmittedAt = new Date();
      application.documents = [];
    } else {
      application = new ScholarshipApplication({
        scholarshipId,
        studentId,
        status: 'Pending Review',
      });
    }

    const storageService = require('../utils/storageService');
    const uploadedStoredKeys = [];
    const uploadedDocs = [];

    try {
      for (const item of matchedUploads) {
        const f = item.file;
        const reqItem = item.requirement;

        let fileBuffer = f.buffer;
        if (!fileBuffer && f.path && fs.existsSync(f.path)) {
          fileBuffer = await fs.promises.readFile(f.path);
        }
        if (!fileBuffer || fileBuffer.length === 0) {
          const emptyErr = new Error('Empty file attached for requirement ' + reqItem.requirementName);
          emptyErr.code = 'FILE_REQUIRED';
          emptyErr.statusCode = 400;
          throw emptyErr;
        }

        const uploadResult = await storageService.uploadFile({
          buffer: fileBuffer,
          originalName: f.originalname || 'document.png',
          mimeType: f.mimetype || 'image/png',
          applicationId: String(application._id),
          studentId,
        });

        uploadedStoredKeys.push(uploadResult.storedKey);

        const doc = new ApplicationDocument({
          applicationId: application._id,
          requirementId: String(reqItem._id).startsWith('req_') ? null : reqItem._id,
          documentType: reqItem.requirementName || 'DOCUMENT',
          fileName: uploadResult.storedKey,
          fileUrl: uploadResult.url || `/api/documents/download?key=${encodeURIComponent(uploadResult.storedKey)}`,
          fileSize: uploadResult.size,
          fileType: uploadResult.mimeType,
          status: 'PENDING_REVIEW',
          verificationStatus: 'PENDING',
          uploadedAt: new Date(uploadResult.uploadedAt),
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
        const providerId = scholarship.providerId || scholarship.sponsor_id || scholarship.provider_id || null;
        await notificationService.notifyApplicationCreated(providerId, application, studentId, scholarshipId);
      } catch (notifErr) {
        console.warn('Failed to send notification for application submission:', notifErr?.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application,
        documents: uploadedDocs,
      });
    } catch (pipelineErr) {
      // Rollback: cleanup any uploaded files from storage to prevent orphan storage leakage
      for (const storedKey of uploadedStoredKeys) {
        await storageService.deleteFile(storedKey).catch(() => {});
      }
      for (const docId of uploadedDocs) {
        await ApplicationDocument.findByIdAndDelete(docId).catch(() => {});
      }
      throw pipelineErr;
    }
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

    // Delegate to unified transactional approvalService
    try {
      const approvalResult = await approvalService.approveApplication({
        applicationId,
        actorUser: req.user,
        remarks: remarks || '',
      });
      application.status = 'Approved';
      application.approvedAt = new Date();
      application.reviewedBy = req.user.id;
      if (approvalResult.scholarship) {
        scholarship.approvedCount = approvalResult.scholarship.approved_count;
        if (scholarship.totalSlots > 0 && scholarship.approvedCount >= scholarship.totalSlots) {
          scholarship.status = 'Closed';
        }
      }
    } catch (apprErr) {
      if (session) await session.abortTransaction().catch(() => {});
      return res.status(apprErr.statusCode || 500).json({
        message: apprErr.message,
        availableSlots: apprErr.availableSlots,
        currentApproved: apprErr.approvedCount,
      });
    }

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
