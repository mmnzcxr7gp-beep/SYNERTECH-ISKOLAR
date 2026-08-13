const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/authMiddleware');


// Backward-compat alias (some routes expect `authenticate`)
const authenticate = authMiddleware;

const {
  submitStudentVerification,
  submitProviderVerification,
  getStudentVerificationStatus,
  getProviderVerificationStatus,
} = require('../controllers/verificationController');


const router = express.Router();


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads/documents');

    // Ensure destination directory exists (prevents ENOENT during upload)
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      return cb(err, null);
    }

    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});


const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only JPEG, PNG, and PDF are allowed'
        )
      );
    }
  },
});

// Student Verification Routes
router.post(
  '/student/submit',
  authenticate,
  upload.fields([
    { name: 'governmentId', maxCount: 1 },
    { name: 'selfieWithId', maxCount: 1 },
    { name: 'certificateOfRegistration', maxCount: 1 },
  ]),
  (req, res, next) => {
    if (typeof submitStudentVerification !== 'function') {
      return res.status(500).json({ message: 'submitStudentVerification handler missing' });
    }
    return submitStudentVerification(req, res, next);
  }
);



// Debug: ensure handler exists (will show in console if route crashes)
console.log('[verification routes] submitStudentVerification:', typeof submitStudentVerification);


// Student upload route
// NOTE: ensure getStudentVerificationStatus exists.
router.get(
  '/student/status',
  authenticate,
  (req, res, next) => {
    if (typeof getStudentVerificationStatus !== 'function') {
      return res.status(500).json({ message: 'getStudentVerificationStatus handler missing' });
    }
    return getStudentVerificationStatus(req, res, next);
  }
);

router.get(
  '/status',
  authenticate,
  (req, res, next) => {
    if (typeof getStudentVerificationStatus !== 'function') {
      return res.status(500).json({ message: 'getStudentVerificationStatus handler missing' });
    }
    return getStudentVerificationStatus(req, res, next);
  }
);


// Provider Verification Routes
router.post(
  '/provider/submit',
  authenticate,
  upload.fields([
    { name: 'businessRegistration', maxCount: 1 },
    { name: 'businessPermit', maxCount: 1 },
    { name: 'taxIdentificationNumber', maxCount: 1 },
  ]),
  (req, res, next) => {
    if (typeof submitProviderVerification !== 'function') {
      return res
        .status(500)
        .json({ message: 'submitProviderVerification handler missing' });
    }
    return submitProviderVerification(req, res, next);
  }
);


router.get(
  '/provider/status',
  authenticate,
  (req, res, next) => {
    if (typeof getProviderVerificationStatus !== 'function') {
      return res.status(500).json({ message: 'getProviderVerificationStatus handler missing' });
    }
    return getProviderVerificationStatus(req, res, next);
  }
);


module.exports = router;
