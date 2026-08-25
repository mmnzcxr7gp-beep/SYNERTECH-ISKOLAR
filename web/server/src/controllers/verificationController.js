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

    // ==============================
    // VALIDATE FILES
    // ==============================

    validateFileUpload(files.governmentId[0]);
    validateFileUpload(files.selfieWithId[0]);
    validateFileUpload(files.certificateOfRegistration[0]);

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
        governmentId: {
          fileName: files.governmentId[0].filename,
          fileUrl: `/uploads/documents/${files.governmentId[0].filename}`,
          uploadedAt: new Date(),
        },
        selfieWithId: {
          fileName: files.selfieWithId[0].filename,
          fileUrl: `/uploads/documents/${files.selfieWithId[0].filename}`,
          uploadedAt: new Date(),
        },
        certificateOfRegistration: {
          fileName: files.certificateOfRegistration[0].filename,
          fileUrl: `/uploads/documents/${files.certificateOfRegistration[0].filename}`,
          uploadedAt: new Date(),
        },
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
      verification.resubmissionCount += 1;
      verification.lastResubmissionAt = new Date();
    }

    if (mongoose.connection.readyState === 1) {
      await verification.save();
    }

    // ==============================
    // EMAIL
    // ==============================

    try {
      await emailService.sendStudentVerificationStatusEmail(
        student.email,
        student.email || 'Student',
        'submitted',
        'Your verification documents have been received and are under review.'
      );
    } catch (emailError) {
      console.error(
        'Failed to send verification confirmation email:',
        emailError.message
      );
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
      message: 'Verification documents submitted successfully. Your documents are now under review.',

      verification: {
        status: student.verificationStatus,

        submittedAt: student.verificationSubmittedAt,

        documentsReceived: {
          governmentId: !!student.documents.governmentId,

          selfieWithId: !!student.documents.selfieWithId,

          certificateOfRegistration:
            !!student.documents.certificateOfRegistration,
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

    // Business Registration
    if (files?.businessRegistration?.[0]) {
      validateFileUpload(files.businessRegistration[0]);

      const regFile = files.businessRegistration[0];
      updateData.documents.businessRegistration = {
        fileName: regFile.filename,
        fileUrl: `/uploads/documents/${regFile.filename}`,
        uploadedAt: new Date(),
      };
    }

    // Business Permit
    if (files?.businessPermit?.[0]) {
      validateFileUpload(files.businessPermit[0]);

      const permitFile = files.businessPermit[0];
      updateData.documents.businessPermit = {
        fileName: permitFile.filename,
        fileUrl: `/uploads/documents/${permitFile.filename}`,
        uploadedAt: new Date(),
      };
    }

    // TIN
    if (files?.taxIdentificationNumber?.[0]) {
      validateFileUpload(files.taxIdentificationNumber[0]);

      const tinFile = files.taxIdentificationNumber[0];
      updateData.documents.taxIdentificationNumber = {
        fileName: tinFile.filename,
        fileUrl: `/uploads/documents/${tinFile.filename}`,
        uploadedAt: new Date(),
      };
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

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findOne({ userId });
    }

    if (!student) {
      return res.json({
        success: true,
        verificationStatus: {
          status: 'pending',
          isVerified: false,
          submittedAt: null,
          approvedAt: null,
          rejectionReason: null,
        },
        documentsStatus: {
          governmentId: {
            submitted: false,
            verified: false,
          },
          selfieWithId: {
            submitted: false,
            verified: false,
          },
          certificateOfRegistration: {
            submitted: false,
            verified: false,
          },
        },
        paymentMethods: {
          gcash: false,
          payMaya: false,
          bankAccount: false,
        },
      });
    }

    res.json({
      success: true,
      verificationStatus: {
        status: student.verificationStatus,
        isVerified: student.isVerified,
        submittedAt: student.verificationSubmittedAt,
        approvedAt: student.verificationApprovedAt,
        rejectionReason: student.verificationRejectionReason,
      },
      documentsStatus: {
        governmentId: {
          submitted:
            !!student.documents?.governmentId?.fileUrl,
          verified:
            student.documents?.governmentId?.verified,
        },
        selfieWithId: {
          submitted:
            !!student.documents?.selfieWithId?.fileUrl,
          verified:
            student.documents?.selfieWithId?.verified,
        },
        certificateOfRegistration: {
          submitted:
            !!student.documents
              ?.certificateOfRegistration?.fileUrl,
          verified:
            student.documents
              ?.certificateOfRegistration?.verified,
        },
      },
      paymentMethods: {
        gcash:
          !!student.paymentMethods?.gcash?.number,
        payMaya:
          !!student.paymentMethods?.payMaya?.number,
        bankAccount:
          !!student.paymentMethods?.bankAccount
            ?.accountNumber,
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

module.exports = {
  submitStudentVerification,
  submitProviderVerification,
  getStudentVerificationStatus,
  getProviderVerificationStatus,
};