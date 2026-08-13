const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  submitApplication,
  getStudentApplication,
  getStudentApplications,
  getApplicants,
  getApplicationDetails,
  approveApplication,
  rejectApplication,
  requestResubmission,
  addRemarks,
} = require('../controllers/scholarshipApplicationController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads/documents');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  },
});

// ===== STUDENT ROUTES =====

/**
 * POST /api/scholarship-applications/:scholarshipId/submit
 * Submit scholarship application with documents
 */
router.post(
  '/:scholarshipId/submit',
  authMiddleware,
  roleMiddleware(['student']),
  upload.any(),
  submitApplication
);

/**
 * GET /api/scholarship-applications/:scholarshipId/my-application
 * Get student's application for a scholarship
 */
router.get(
  '/:scholarshipId/my-application',
  authMiddleware,
  roleMiddleware(['student']),
  getStudentApplication
);

/**
 * GET /api/scholarship-applications/student/list
 * Get all student applications
 */
router.get(
  '/student/list',
  authMiddleware,
  roleMiddleware(['student']),
  getStudentApplications
);

// ===== PROVIDER ROUTES =====

/**
 * GET /api/scholarship-applications/scholarship/:scholarshipId/applicants
 * Get applicants for a scholarship
 */
router.get(
  '/scholarship/:scholarshipId/applicants',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  getApplicants
);

/**
 * GET /api/scholarship-applications/:applicationId/details
 * Get application details
 */
router.get('/:applicationId/details', authMiddleware, getApplicationDetails);

/**
 * POST /api/scholarship-applications/:applicationId/approve
 * Approve application
 */
router.post(
  '/:applicationId/approve',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  [body('remarks').optional().trim()],
  approveApplication
);

/**
 * POST /api/scholarship-applications/:applicationId/reject
 * Reject application
 */
router.post(
  '/:applicationId/reject',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  [body('remarks').notEmpty().trim().withMessage('Rejection remarks are required')],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  rejectApplication
);

/**
 * POST /api/scholarship-applications/:applicationId/request-resubmission
 * Request resubmission
 */
router.post(
  '/:applicationId/request-resubmission',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  [body('remarks').notEmpty().trim().withMessage('Resubmission remarks are required')],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  requestResubmission
);

/**
 * POST /api/scholarship-applications/:applicationId/remarks
 * Add remarks to application
 */
router.post(
  '/:applicationId/remarks',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  [body('remarks').notEmpty().trim().withMessage('Remarks are required')],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  addRemarks
);

module.exports = router;
