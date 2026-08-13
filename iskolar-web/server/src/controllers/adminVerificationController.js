const mongoose = require('mongoose');
const { Student, Provider, Verification } = require('../models');
const { db } = require('../config/db');
const emailService = require('../utils/emailService');

// Get Pending Verifications (for admin review)
const getPendingVerifications = async (req, res, next) => {
  try {
    const { userType, page = 1, limit = 10 } = req.query;

    const filter = { status: { $in: ['pending', 'under_review'] } };
    if (userType) filter.userType = userType;

    const skip = (page - 1) * limit;

    let verifications = [];
    if (mongoose.connection.readyState === 1) {
      verifications = await Verification.find(filter)
        .populate('studentId', 'email lrn schoolName userId')
        .populate('providerId', 'organizationName email userId')
        .sort({ submittedAt: 1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    // Attach legacy user info (users are stored in the in-memory DB)
    verifications = verifications.map((v) => {
      const obj = v.toObject();
      const userInfo = db.data.users.find((u) => u.id === obj.userId);
      obj.user = userInfo
        ? { id: userInfo.id, name: userInfo.name, email: userInfo.email, role: userInfo.role }
        : null;
      return obj;
    });

    let total = 0;
    if (mongoose.connection.readyState === 1) {
      total = await Verification.countDocuments(filter);
    }

    res.json({
      verifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Verification Details
const getVerificationDetails = async (req, res, next) => {
  try {
    const { verificationId } = req.params;

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findById(verificationId)
        .populate('studentId')
        .populate('providerId');
    }

    if (verification) {
      verification = verification.toObject();
      const userInfo = db.data.users.find((u) => u.id === verification.userId);
      verification.user = userInfo ? { id: userInfo.id, name: userInfo.name, email: userInfo.email, role: userInfo.role } : null;
      if (verification.reviewedBy) {
        const reviewer = db.data.users.find((u) => u.id === verification.reviewedBy);
        verification.reviewedBy = reviewer ? { id: reviewer.id, name: reviewer.name, email: reviewer.email } : verification.reviewedBy;
      }
    }

    if (!verification) {
      return res.status(404).json({ message: 'Verification record not found' });
    }

    // Attach uploaded student document file URLs from Student model.
    // Uploaded files are stored under Student.documents.*.fileUrl.
    // Verification model only stores review flags/notes.
    if (verification.userType === 'student' && verification.studentId) {
      let student = null;
      if (mongoose.connection.readyState === 1) {
        student = await Student.findById(verification.studentId).select('documents');
      }

      const docs = student?.documents;

      verification.studentDocuments = {
        governmentId: docs?.governmentId?.fileUrl
          ? {
              fileUrl: docs.governmentId.fileUrl,
              fileName: docs.governmentId.fileName || null,
              uploadedAt: docs.governmentId.uploadedAt || null,
              verified: docs.governmentId.verified || false,
            }
          : null,
        selfieWithId: docs?.selfieWithId?.fileUrl
          ? {
              fileUrl: docs.selfieWithId.fileUrl,
              fileName: docs.selfieWithId.fileName || null,
              uploadedAt: docs.selfieWithId.uploadedAt || null,
              verified: docs.selfieWithId.verified || false,
            }
          : null,
        certificateOfRegistration: docs?.certificateOfRegistration?.fileUrl
          ? {
              fileUrl: docs.certificateOfRegistration.fileUrl,
              fileName: docs.certificateOfRegistration.fileName || null,
              uploadedAt: docs.certificateOfRegistration.uploadedAt || null,
              verified: docs.certificateOfRegistration.verified || false,
            }
          : null,
      };
      // Backwards-compatible convenience fields expected by older admin UI
      verification.documents = {
        governmentId: verification.studentDocuments.governmentId?.fileUrl || null,
        selfieWithId: verification.studentDocuments.selfieWithId?.fileUrl || null,
        certificateOfRegistration: verification.studentDocuments.certificateOfRegistration?.fileUrl || null,
      };
    }

    res.json({ verification });
  } catch (error) {
    next(error);
  }
};

// Approve Student Verification
const approveStudentVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { adminNotes } = req.body;

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findById(verificationId);
    }
    if (!verification) {
      return res.status(404).json({ message: 'Verification record not found' });
    }

    if (verification.userType !== 'student') {
      return res.status(400).json({ message: 'This is not a student verification' });
    }

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findById(verification.studentId);
    }
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update verification record
    verification.status = 'approved';
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user.id || req.user.userId;
    if (adminNotes) verification.adminNotes = adminNotes;

    if (mongoose.connection.readyState === 1) {
      await verification.save();
    }

    // Update student record
    student.verificationStatus = 'approved';
    student.isVerified = true;
    student.verificationApprovedAt = new Date();
    if (mongoose.connection.readyState === 1) {
      await student.save();
    }

    // Send approval email to student
    try {
      await emailService.sendStudentVerificationStatusEmail(
        student.email,
        student.email || student.lrn || 'Student',
        'approved',
        'Your verification has been approved. You can now access scholarship and allowance features.'
      );
    } catch (emailError) {
      console.error('Failed to send student approval email:', emailError.message);
    }

    res.json({
      message: 'Student verification approved successfully',
      student: {
        id: student._id,
        email: student.email,
        name: student.email || student.lrn || 'Student',
        isVerified: student.isVerified,
        approvedAt: student.verificationApprovedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reject Student Verification
const rejectStudentVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { rejectionReason, flags = [], adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findById(verificationId);
    }
    if (!verification) {
      return res.status(404).json({ message: 'Verification record not found' });
    }

    if (verification.userType !== 'student') {
      return res.status(400).json({ message: 'This is not a student verification' });
    }

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findById(verification.studentId);
    }
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update verification record
    verification.status = 'rejected';
    verification.rejectionReason = rejectionReason;
    verification.flags = flags;
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user.id || req.user.userId;
    if (adminNotes) verification.adminNotes = adminNotes;

    if (mongoose.connection.readyState === 1) {
      await verification.save();
    }

    // Update student record
    student.verificationStatus = 'rejected';
    student.verificationRejectionReason = rejectionReason;
    student.verificationRejectedAt = new Date();
    if (mongoose.connection.readyState === 1) {
      await student.save();
    }

    // Send rejection email to student
    try {
      await emailService.sendStudentVerificationStatusEmail(
        student.email,
        student.email || student.lrn || 'Student',
        'rejected',
        rejectionReason
      );
    } catch (emailError) {
      console.error('Failed to send student rejection email:', emailError.message);
    }

    res.json({
      message: 'Student verification rejected',
      student: {
        id: student._id,
        email: student.email,
        name: student.email || student.lrn || 'Student',
        rejectionReason: student.verificationRejectionReason,
        rejectedAt: student.verificationRejectedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Approve Provider Verification
const approveProviderVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { adminNotes } = req.body;

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findById(verificationId);
    }
    if (!verification) {
      return res.status(404).json({ message: 'Verification record not found' });
    }

    if (verification.userType !== 'provider') {
      return res.status(400).json({ message: 'This is not a provider verification' });
    }

    let provider = null;
    if (mongoose.connection.readyState === 1) {
      provider = await Provider.findById(verification.providerId);
    }
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Update verification record
    verification.status = 'approved';
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user.id || req.user.userId;
    if (adminNotes) verification.adminNotes = adminNotes;

    if (mongoose.connection.readyState === 1) {
      await verification.save();
    }

    // Update provider record
    provider.verificationStatus = 'approved';
    provider.isVerified = true;
    provider.verificationApprovedAt = new Date();
    if (mongoose.connection.readyState === 1) {
      await provider.save();
    }

    // Send approval email to provider
    try {
      await emailService.sendProviderVerificationStatusEmail(
        provider.email,
        provider.organizationName,
        'approved',
        'Your business verification has been approved. You can now create transactions and fund scholarships.'
      );
    } catch (emailError) {
      console.error('Failed to send provider approval email:', emailError.message);
    }

    res.json({
      message: 'Provider verification approved successfully',
      provider: {
        id: provider._id,
        email: provider.email,
        organizationName: provider.organizationName,
        isVerified: provider.isVerified,
        approvedAt: provider.verificationApprovedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reject Provider Verification
const rejectProviderVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { rejectionReason, flags = [], adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    let verification = null;
    if (mongoose.connection.readyState === 1) {
      verification = await Verification.findById(verificationId);
    }
    if (!verification) {
      return res.status(404).json({ message: 'Verification record not found' });
    }

    if (verification.userType !== 'provider') {
      return res.status(400).json({ message: 'This is not a provider verification' });
    }

    let provider = null;
    if (mongoose.connection.readyState === 1) {
      provider = await Provider.findById(verification.providerId);
    }
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Update verification record
    verification.status = 'rejected';
    verification.rejectionReason = rejectionReason;
    verification.flags = flags;
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user.id || req.user.userId;
    if (adminNotes) verification.adminNotes = adminNotes;

    if (mongoose.connection.readyState === 1) {
      await verification.save();
    }

    // Update provider record
    provider.verificationStatus = 'rejected';
    provider.verificationRejectionReason = rejectionReason;
    provider.verificationRejectedAt = new Date();
    if (mongoose.connection.readyState === 1) {
      await provider.save();
    }

    // Send rejection email to provider
    try {
      await emailService.sendProviderVerificationStatusEmail(
        provider.email,
        provider.organizationName,
        'rejected',
        rejectionReason
      );
    } catch (emailError) {
      console.error('Failed to send provider rejection email:', emailError.message);
    }

    res.json({
      message: 'Provider verification rejected',
      provider: {
        id: provider._id,
        email: provider.email,
        organizationName: provider.organizationName,
        rejectionReason: provider.verificationRejectionReason,
        rejectedAt: provider.verificationRejectedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Verification Statistics (for admin dashboard)
const getVerificationStatistics = async (req, res, next) => {
  try {
    const stats = {};

    // Count by status
    const statusCounts = mongoose.connection.readyState === 1
      ? await Verification.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ])
      : [];

    stats.byStatus = {};
    statusCounts.forEach((item) => {
      stats.byStatus[item._id] = item.count;
    });

    // Count by user type
    const userTypeCounts = mongoose.connection.readyState === 1
      ? await Verification.aggregate([
          {
            $group: {
              _id: '$userType',
              count: { $sum: 1 },
            },
          },
        ])
      : [];

    stats.byUserType = {};
    userTypeCounts.forEach((item) => {
      stats.byUserType[item._id] = item.count;
    });

    // Total pending
    stats.totalPending = mongoose.connection.readyState === 1
      ? await Verification.countDocuments({
          status: { $in: ['pending', 'under_review'] },
        })
      : 0;

    // Average review time (for approved verifications)
    const avgReviewTime = mongoose.connection.readyState === 1
      ? await Verification.aggregate([
          {
            $match: { status: 'approved', reviewedAt: { $exists: true } },
          },
          {
            $group: {
              _id: null,
              avgTime: {
                $avg: {
                  $subtract: ['$reviewedAt', '$submittedAt'],
                },
              },
            },
          },
        ])
      : [];

    stats.averageReviewTimeMs =
      avgReviewTime.length > 0 ? Math.round(avgReviewTime[0].avgTime) : 0;
    stats.averageReviewTimeHours = Math.round(
      stats.averageReviewTimeMs / (1000 * 60 * 60)
    );

    res.json({ statistics: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingVerifications,
  getVerificationDetails,
  approveStudentVerification,
  rejectStudentVerification,
  approveProviderVerification,
  rejectProviderVerification,
  getVerificationStatistics,
};
