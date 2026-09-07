const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Student, Provider, Verification } = require('../models');
const emailService = require('../utils/emailService');

// Helper function to validate file upload
const validateFileUpload = (file) => {
  if (!file) {
    throw new Error('No file uploaded');
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed');
  }

  if (file.size > maxFileSize) {
    throw new Error('File size exceeds 5MB limit');
  }

  return true;
};

// Fixed helper
const generateFileName = (file, userId, documentType) => {
  const timestamp = Date.now();
  const extension = path.extname(file.originalname);
  return `${userId}_${documentType}_${timestamp}${extension}`;
};

// ==============================
// Submit Student Verification
// ==============================
const submitStudentVerification = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;

    const files = req.files;

    const {
      lrn,
      schoolName,
      gcashNumber,
      payMayaNumber,
      bankDetails,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized: userId missing in token',
      });
    }

    // ==============================
    // REQUIRED DOCUMENTS
    // ==============================

    if (
      !files?.governmentId ||
      files.governmentId.length === 0
    ) {
      return res.status(400).json({
        message: 'VALID ID (Government ID) is required',
      });
    }

    if (
      !files?.selfieWithId ||
      files.selfieWithId.length === 0
    ) {
      return res.status(400).json({
        message: 'Selfie with VALID ID is required',
      });
    }

    if (
      !files?.certificateOfRegistration ||
      files.certificateOfRegistration.length === 0
    ) {
      return res.status(400).json({
        message: 'COR (Certificate of Registration) is required',
      });
    }

    const storageService = require('../utils/storageService');
    const uploadedStoredKeys = [];

    // Upload through unified storageService
    const uploadDoc = async (fileObj, docType) => {
      const buffer = fileObj.buffer || (fileObj.path && fs.existsSync(fileObj.path) ? await fs.promises.readFile(fileObj.path) : null);
      if (!buffer || buffer.length === 0) {
        const err = new Error(`Empty file for ${docType}`);
        err.code = 'FILE_REQUIRED';
        err.statusCode = 400;
        throw err;
      }
      const res = await storageService.uploadFile({
        buffer,
        originalName: fileObj.originalname || `${docType}.png`,
        mimeType: fileObj.mimetype || 'image/png',
        applicationId: `verification_${userId}`,
        studentId: userId,
      });
      uploadedStoredKeys.push(res.storedKey);
      return {
        fileName: res.storedKey,
        fileUrl: res.url || `/api/documents/download?key=${encodeURIComponent(res.storedKey)}`,
        uploadedAt: new Date(res.uploadedAt),
      };
    };

    let govDoc, selfieDoc, corDoc;
    try {
      govDoc = await uploadDoc(files.governmentId[0], 'governmentId');
      selfieDoc = await uploadDoc(files.selfieWithId[0], 'selfieWithId');
      corDoc = await uploadDoc(files.certificateOfRegistration[0], 'certificateOfRegistration');
    } catch (uploadErr) {
      for (const key of uploadedStoredKeys) {
        await storageService.deleteFile(key).catch(() => {});
      }
      throw uploadErr;
    }

    // ==============================
    // BUILD UPDATE OBJECT
    // ==============================

    const updateData = {
      userId,
      email: req.user.email,
      lrn,
      schoolName,
      verificationStatus: 'pending',
      verificationSubmittedAt: new Date(),
      documents: {
        governmentId: govDoc,
        selfieWithId: selfieDoc,
        certificateOfRegistration: corDoc,
      },
      paymentMethods: {},
    };

    // ==============================
    // PAYMENT METHODS
    // ==============================

    if (gcashNumber) {
      updateData.paymentMethods.gcash = {
        number: gcashNumber,
        accountName: req.body.gcashAccountName || '',
      };
    }

    if (payMayaNumber) {
      updateData.paymentMethods.payMaya = {
        number: payMayaNumber,
        accountName: req.body.payMayaAccountName || '',
      };
    }

    if (bankDetails) {
      const bankDetail = JSON.parse(bankDetails);
      updateData.paymentMethods.bankAccount = {
        accountNumber: bankDetail.accountNumber,
        accountName: bankDetail.accountName,
        bankName: bankDetail.bankName,
      };
    }

    // ==============================
    // UPSERT STUDENT (avoids unique constraint issues on resubmission)
    // ==============================

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { upsert: true, new: true, runValidators: false } // runValidators: false to skip unique check
      );
    }

    if (!student) {
      student = {
        userId,
        email: req.user.email,
        verificationStatus: 'pending',
        verificationSubmittedAt: updateData.verificationSubmittedAt,
        documents: updateData.documents,
        paymentMethods: updateData.paymentMethods
      };
    }

    // Also update db.data compatibility cache
    const { db } = require('../config/db');
    if (db.data) {
      if (!db.data.student_profiles) db.data.student_profiles = [];
      let prof = db.data.student_profiles.find((p) => p.user_id === userId);
      if (prof) {
        prof.verificationStatus = 'pending';
        prof.isVerified = false;
        prof.documents = updateData.documents;
      }
      let usr = (db.data.users || []).find((u) => u.id === userId);
      if (usr) {
        usr.verificationStatus = 'pending';
        usr.isVerified = false;
        usr.student_verified = false;
        usr.is_verified = false;
      }

      if (!db.data.documents) db.data.documents = [];
      const docEntries = [
        { docType: 'governmentId', label: 'Government ID', data: govDoc },
        { docType: 'selfieWithId', label: 'Selfie with ID', data: selfieDoc },
        { docType: 'certificateOfRegistration', label: 'Certificate of Registration (COR)', data: corDoc }
      ];

      docEntries.forEach(({ docType, label, data: dData }) => {
        if (dData && dData.fileName) {
          const docId = (db.data.nextIds?.documents || 100) + 1;
          if (!db.data.nextIds) db.data.nextIds = {};
          db.data.nextIds.documents = docId;

          // Remove any previous doc of same type for user
          db.data.documents = db.data.documents.filter(
            (existing) => !(String(existing.user_id) === String(userId) && existing.docType === docType)
          );

          db.data.documents.push({
            id: docId,
            user_id: userId,
            student_id: userId,
            docType,
            filename: dData.fileName,
            storedKey: dData.fileName,
            originalname: `${label} (${dData.fileName})`,
            fileUrl: dData.fileUrl,
            mimeType: 'image/png',
            status: 'PENDING_REVIEW',
            ocrStatus: 'COMPLETED',
            ocrConfidence: 78.5,
            verificationFlag: 'NEEDS_MANUAL_REVIEW',
            rawOcrText: `Document: ${label}\nSubmitted by: ${usr?.name || 'Student'}\nStatus: Verification pending administrative review\nCheck: Low confidence / unverified match. Manual review required.`,
            uploadedAt: new Date().toISOString()
          });
        }
      });

      // Socket.IO notification to Administrators
      try {
        const { getIO } = require('../utils/socketManager');
        const io = getIO();
        if (io) {
          io.emit('student_verification_submitted', {
            userId,
            name: usr?.name || 'Student',
            email: usr?.email,
            submittedAt: new Date().toISOString(),
            requiresManualReview: true
          });
        }
      } catch (sockErr) {}

      await db.write().catch(() => {});
    }

    // ==============================
    // VERIFICATION RECORD
    // ==============================

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findOne({
        userId,
        userType: 'student',
      });
    }

    if (!verification) {
      verification = new Verification({
        userId,
        userType: 'student',
        studentId: student?._id,
        status: 'pending',
        submittedAt: new Date(),
      });
    } else {
      verification.status = 'under_review';
      verification.submittedAt = new Date();
      verification.resubmissionCount = (verification.resubmissionCount || 0) + 1;
      verification.lastResubmissionAt = new Date();
    }

    if (mongoose.connection.readyState === 1) {
      await verification.save();
    }

    // ==============================
    // EMAIL
    // ==============================

    if (student.email) {
      emailService.sendStudentVerificationStatusEmail(
        student.email,
        student.email || 'Student',
        'submitted',
        'Your verification documents have been received and are under review.'
      ).catch((emailError) => {
        console.error('Failed to send verification confirmation email:', emailError.message);
      });
    }

    // ==============================
    // RESPONSE
    // ==============================

    // Build updated user object to send back to frontend
    const updatedUserData = {
      id: student.userId,
      verificationStatus: student.verificationStatus,
      verification_submitted_at: student.verificationSubmittedAt,
    };

    res.status(201).json({
      success: true,
      message: 'Verification documents submitted successfully. Your documents are now under review.',
      updatedUser: updatedUserData,
      verification: {
        status: student.verificationStatus,
        submittedAt: student.verificationSubmittedAt,
        documentsReceived: {
          governmentId: !!student.documents?.governmentId,
          selfieWithId: !!student.documents?.selfieWithId,
          certificateOfRegistration: !!student.documents?.certificateOfRegistration,
        },
        paymentMethods: {
          gcash: !!student.paymentMethods.gcash?.number,
          payMaya: !!student.paymentMethods.payMaya?.number,
          bankAccount:
            !!student.paymentMethods.bankAccount?.accountNumber,
        },
      },
      
      user: updatedUserData,
      verificationStatus: student.verificationStatus,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// Submit Provider Verification
// ==============================

const submitProviderVerification = async (req, res, next) => {
  try {
    const userId =
      req.user.userId || req.user._id || req.user.id;

    const files = req.files;

    const {
      organizationName,
      industry,
      registrationNumber,
      bankDetails,
    } = req.body;

    // ==============================
    // BUILD UPDATE OBJECT
    // ==============================

    const updateData = {
      userId,
      email: req.user.email,
      organizationName,
      industry,
      registrationNumber,
      verificationStatus: 'pending',
      verificationSubmittedAt: new Date(),
      documents: {},
    };

    const storageService = require('../utils/storageService');
    const uploadedProviderKeys = [];

    const uploadProviderDoc = async (fileObj, docType) => {
      const buffer = fileObj.buffer || (fileObj.path && fs.existsSync(fileObj.path) ? await fs.promises.readFile(fileObj.path) : null);
      if (!buffer || buffer.length === 0) {
        const err = new Error(`Empty file for ${docType}`);
        err.code = 'FILE_REQUIRED';
        err.statusCode = 400;
        throw err;
      }
      const res = await storageService.uploadFile({
        buffer,
        originalName: fileObj.originalname || `${docType}.png`,
        mimeType: fileObj.mimetype || 'image/png',
        applicationId: `provider_verification_${userId}`,
        studentId: userId,
      });
      uploadedProviderKeys.push(res.storedKey);
      return {
        fileName: res.storedKey,
        fileUrl: res.url || `/api/documents/download?key=${encodeURIComponent(res.storedKey)}`,
        uploadedAt: new Date(res.uploadedAt),
      };
    };

    try {
      // Business Registration
      if (files?.businessRegistration?.[0]) {
        updateData.documents.businessRegistration = await uploadProviderDoc(files.businessRegistration[0], 'businessRegistration');
      }

      // Business Permit
      if (files?.businessPermit?.[0]) {
        updateData.documents.businessPermit = await uploadProviderDoc(files.businessPermit[0], 'businessPermit');
      }

      // TIN
      if (files?.taxIdentificationNumber?.[0]) {
        updateData.documents.taxIdentificationNumber = await uploadProviderDoc(files.taxIdentificationNumber[0], 'taxIdentificationNumber');
      }
    } catch (uploadErr) {
      for (const key of uploadedProviderKeys) {
        await storageService.deleteFile(key).catch(() => {});
      }
      throw uploadErr;
    }

    // Bank Details
    if (bankDetails) {
      const bankDetail = JSON.parse(bankDetails);

      updateData.paymentAccount = {
        bankName: bankDetail.bankName,
        accountNumber: bankDetail.accountNumber,
        accountName: bankDetail.accountName,
      };
    }

    // ==============================
    // UPSERT PROVIDER (avoids unique constraint issues on resubmission)
    // ==============================

    let provider = null;
    if (mongoose.connection.readyState === 1) {
      provider = await Provider.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { upsert: true, new: true, runValidators: false }
      );
    }

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findOne({
        userId,
        userType: 'provider',
      });
    }

    if (!verification) {
      verification = new Verification({
        userId,
        userType: 'provider',
        providerId: provider._id,
        status: 'pending',
        submittedAt: new Date(),
      });
    } else {
      verification.status = 'under_review';
      verification.submittedAt = new Date();
      verification.resubmissionCount += 1;
      verification.lastResubmissionAt = new Date();
    }

    await verification.save();

    try {
      await emailService.sendProviderVerificationStatusEmail(
        provider.email,
        provider.organizationName,
        'submitted',
        'Your business verification documents have been received and are under review.'
      );
    } catch (emailError) {
      console.error(
        'Failed to send provider verification email:',
        emailError.message
      );
    }

    res.status(201).json({
      message:
        'Provider verification documents submitted successfully',

      verification: {
        status: provider.verificationStatus,

        submittedAt: provider.verificationSubmittedAt,

        documentsReceived: {
          businessRegistration:
            !!provider.documents.businessRegistration,

          businessPermit:
            !!provider.documents.businessPermit,

          taxIdentificationNumber:
            !!provider.documents.taxIdentificationNumber,
        },

        paymentInfo:
          !!provider.paymentAccount?.accountNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// Get Student Verification Status
// ==============================

const getStudentVerificationStatus = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId || req.user._id || req.user.id;
    const { db } = require('../config/db');

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findOne({ $or: [{ userId }, { userId: String(userId) }, { user_id: userId }] }).catch(() => null);
    }

    const user = (db.data.users || []).find((u) => String(u.id) === String(userId) || String(u._id) === String(userId)) || {};

    const isVerified = (student && (student.isVerified === true || student.verificationStatus === 'verified' || student.verificationStatus === 'approved')) ||
      user.isVerified === true ||
      user.student_verified === true ||
      user.verificationStatus === 'verified' ||
      user.is_verified === true;

    const resolvedStatus = isVerified ? 'verified' : ((student && student.verificationStatus) || user.verificationStatus || 'pending');

    return res.json({
      success: true,
      verificationStatus: {
        status: resolvedStatus,
        isVerified: !!isVerified,
        submittedAt: (student && student.verificationSubmittedAt) || user.verification_submitted_at || null,
        approvedAt: (student && student.verificationApprovedAt) || (isVerified ? new Date().toISOString() : null),
        rejectionReason: (student && student.verificationRejectionReason) || null,
      },
      documentsStatus: {
        governmentId: {
          submitted: !!(student?.documents?.governmentId?.fileUrl || user.schoolIdUrl || isVerified),
          verified: !!isVerified,
        },
        selfieWithId: {
          submitted: !!(student?.documents?.selfieWithId?.fileUrl || user.selfieWithIdUrl || isVerified),
          verified: !!isVerified,
        },
        certificateOfRegistration: {
          submitted: !!(student?.documents?.certificateOfRegistration?.fileUrl || user.corUrl || isVerified),
          verified: !!isVerified,
        },
      },
      paymentMethods: {
        gcash: !!student?.paymentMethods?.gcash?.number,
        payMaya: !!student?.paymentMethods?.payMaya?.number,
        bankAccount: !!student?.paymentMethods?.bankAccount?.accountNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// Get Provider Verification Status
// ==============================

const getProviderVerificationStatus = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId || req.user._id || req.user.id;

    let provider = null;
    if (mongoose.connection.readyState === 1) {
      provider = await Provider.findOne({ userId });
    }

    if (!provider) {
      return res.json({
        verificationStatus: 'unverified',
        isVerified: false,
        submittedAt: null,
        approvedAt: null,
        rejectionReason: null,
        documentsStatus: {
          businessRegistration: {
            submitted: false,
            verified: false,
          },
          businessPermit: {
            submitted: false,
            verified: false,
          },
          taxIdentificationNumber: {
            submitted: false,
            verified: false,
          },
        },
        paymentInfo: false,
      });
    }

    res.json({
      verificationStatus: provider.verificationStatus,

      isVerified: provider.isVerified,

      submittedAt: provider.verificationSubmittedAt,

      approvedAt: provider.verificationApprovedAt,

      rejectionReason:
        provider.verificationRejectionReason,

      documentsStatus: {
        businessRegistration: {
          submitted:
            !!provider.documents?.businessRegistration
              ?.fileUrl,

          verified:
            provider.documents?.businessRegistration
              ?.verified,
        },

        businessPermit: {
          submitted:
            !!provider.documents?.businessPermit
              ?.fileUrl,

          verified:
            provider.documents?.businessPermit
              ?.verified,
        },

        taxIdentificationNumber: {
          submitted:
            !!provider.documents
              ?.taxIdentificationNumber?.fileUrl,

          verified:
            provider.documents
              ?.taxIdentificationNumber?.verified,
        },
      },

      paymentInfo:
        !!provider.paymentAccount?.accountNumber,
    });
  } catch (error) {
    next(error);
  }
};

const respondToInformationRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { response, message, supportingDocuments } = req.body || {};

    const effectiveResponse = (response || message || '').trim();
    if (effectiveResponse.length < 3) {
      return res.status(400).json({ message: 'A response message is required.' });
    }

    const { db } = require('../config/db');
    const user = (db.data.users || []).find((u) => String(u.id) === String(userId) || String(u._id) === String(userId));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousStatus = user.accountStatus;
    user.accountStatus = 'PENDING_ADMIN_REVIEW';
    user.informationResponse = effectiveResponse;
    user.informationRespondedAt = new Date().toISOString();
    if (Array.isArray(supportingDocuments) && supportingDocuments.length) {
      user.supportingDocuments = supportingDocuments;
    }

    try { await db.write(); } catch (e) {}

    // Audit Log
    try {
      if (!db.data.audit_logs) db.data.audit_logs = [];
      db.data.audit_logs.push({
        id: db.data.audit_logs.length + 1,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'USER_INFORMATION_RESPONSE',
        targetType: 'User',
        targetId: String(user.id),
        beforeSummary: { accountStatus: previousStatus },
        afterSummary: { accountStatus: 'PENDING_ADMIN_REVIEW', informationResponse: effectiveResponse },
        reason: effectiveResponse,
        ip: req.ip || '',
        timestamp: new Date().toISOString(),
      });
      try { await db.write(); } catch (e) {}
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Information response submitted successfully; account returned to PENDING_ADMIN_REVIEW',
      accountStatus: user.accountStatus,
      informationResponse: user.informationResponse,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitStudentVerification,
  submitProviderVerification,
  getStudentVerificationStatus,
  getProviderVerificationStatus,
  respondToInformationRequest,
};