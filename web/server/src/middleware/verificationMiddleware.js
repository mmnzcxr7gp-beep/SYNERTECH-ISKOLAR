const { Student, Provider } = require('../models');

// Middleware to check if student is verified
const requireStudentVerification = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        message: 'This endpoint is for students only',
      });
    }

    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({
        message: 'Student profile not found',
      });
    }

    if (!student.isVerified) {
      return res.status(403).json({
        message:
          'Your account is pending verification by admin. You cannot access this feature yet.',
        verificationStatus: student.verificationStatus,
      });
    }

    // Attach student to request for use in controller
    req.student = student;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if provider is verified
const requireProviderVerification = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        message: 'This endpoint is for providers only',
      });
    }

    const provider = await Provider.findOne({ userId: req.user.id });

    if (!provider) {
      return res.status(404).json({
        message: 'Provider profile not found',
      });
    }

    if (!provider.isVerified) {
      return res.status(403).json({
        message:
          'Your organization is pending verification by admin. You cannot create transactions yet.',
        verificationStatus: provider.verificationStatus,
      });
    }

    // Attach provider to request for use in controller
    req.provider = provider;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check verification status (returns status but doesn't block)
const checkVerificationStatus = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.id });
      if (student) {
        req.verificationStatus = {
          role: 'student',
          isVerified: student.isVerified,
          status: student.verificationStatus,
          submittedAt: student.verificationSubmittedAt,
          approvedAt: student.verificationApprovedAt,
          rejectionReason: student.verificationRejectionReason,
        };
      }
    } else if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ userId: req.user.id });
      if (provider) {
        req.verificationStatus = {
          role: 'provider',
          isVerified: provider.isVerified,
          status: provider.verificationStatus,
          submittedAt: provider.verificationSubmittedAt,
          approvedAt: provider.verificationApprovedAt,
          rejectionReason: provider.verificationRejectionReason,
        };
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireStudentVerification,
  requireProviderVerification,
  checkVerificationStatus,
};
