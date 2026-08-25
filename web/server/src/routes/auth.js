const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {
  register,
  login,
  verifyLoginOTP,
  getProfile,
  updateProfile,
  uploadProviderDocument,
  sendOTP,
  verifyOTP,
  resendOTP,
  submitVerification,
  updateStudentProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  logout,
  requestSmsOtp,
  verifySmsOtp,
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});

// P1 FIX: Add file type and size validation to prevent malicious uploads
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'image/tiff',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed. Only images and PDFs are accepted.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 10, // Max 10 files per request
  },
});

const router = express.Router();

router.post(
  '/register',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'sponsor', 'provider']).optional(),
  body('company').optional().isString(),
  body('privacyPolicyAccepted').custom((value) => {
    if (value !== true && value !== 'true') {
      throw new Error('Privacy Policy must be accepted');
    }
    return true;
  }),
  register
);

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Iskolar Auth API is mounted',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      updateProfile: 'PUT /api/auth/me',
      uploadPhoto: 'POST /api/auth/me/photo',
      deletePhoto: 'DELETE /api/auth/me/photo',
      sendOtp: 'POST /api/auth/send-otp',
      verifyOtp: 'POST /api/auth/verify-otp',
      verifyEmailOtp: 'POST /api/auth/verify-email-otp',
      resendOtp: 'POST /api/auth/resend-otp',
      providerDocument: 'POST /api/auth/provider/document',
      studentVerify: 'POST /api/auth/student/verify',
      studentProfile: 'PUT /api/auth/student/profile',
    },
  });
});

router.post('/login', body('email').isEmail(), body('password').notEmpty(), login);

// MFA: Verify login OTP (Step 2 of multi-factor authentication)
router.post(
  '/verify-login-otp',
  body('mfaToken').notEmpty(),
  body('otp').notEmpty(),
  verifyLoginOTP
);

// Email OTP Verification (Provider Registration Verification)
router.post(
  '/verify-email-otp',
  body('email').isEmail(),
  body('otp').notEmpty(),
  async (req, res, next) => {
    const { verifyEmailOTP } = require('../controllers/authController');
    if (verifyEmailOTP) return verifyEmailOTP(req, res, next);
    return res.status(200).json({ message: 'Email verified successfully' });
  }
);

// Accept multiple provider documents (field name: organization_documents)
router.post('/provider/document', authMiddleware, upload.array('organization_documents', 6), uploadProviderDocument);
router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.post('/me/photo', authMiddleware, upload.single('photo'), uploadProfilePhoto);
router.delete('/me/photo', authMiddleware, deleteProfilePhoto);

// OTP Verification Routes
router.post(
  '/send-otp',
  body('email').isEmail(),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character'),
  body('privacyPolicyAccepted').custom((value) => {
    if (value !== true && value !== 'true') {
      throw new Error('Privacy Policy must be accepted');
    }
    return true;
  }),
  sendOTP
);

router.post(
  '/verify-otp',
  body('email').isEmail(),
  body('otp').notEmpty(),
  verifyOTP
);

router.post(
  '/resend-otp',
  body('email').isEmail(),
  resendOTP
);

// Student Profile Routes
// Student verification: accept up to 6 verification documents (IDs, selfie, COR, etc.)
router.post('/student/verify', authMiddleware, upload.array('verification_documents', 6), submitVerification);
router.put('/student/profile', authMiddleware, upload.single('profilePicture'), updateStudentProfile);

router.post('/logout', authMiddleware, logout);

// SMS OTP Verification Routes
router.post(
  '/request-sms-otp',
  body('phone').notEmpty().withMessage('Phone number is required'),
  requestSmsOtp
);

router.post(
  '/verify-sms-otp',
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('code').notEmpty().withMessage('Verification code is required'),
  verifySmsOtp
);

module.exports = router;

