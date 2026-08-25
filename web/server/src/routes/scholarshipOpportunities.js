const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
// Legacy route path kept for mobile compatibility, but controller is now unified.
const {
  createScholarship: createOpportunity,
  updateScholarship: updateOpportunity,
  deleteScholarship: deleteOpportunity,
  getProviderScholarships: getProviderOpportunities,
  browseScholarships: browseOpportunities,
  getScholarshipById: getOpportunityById,
  getScholarshipDetails: getOpportunityDetails,
} = require('../controllers/scholarshipController');


const router = express.Router();

// Validation middleware
const validateOpportunity = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('type')
    .isIn(['Scholarship', 'Allowance', 'Scholarship + Allowance'])
    .withMessage('Invalid scholarship type'),
  body('benefits').notEmpty().trim().withMessage('Benefits are required'),
  body('eligibilityRequirements')
    .notEmpty()
    .trim()
    .withMessage('Eligibility requirements are required'),
  body('totalSlots').isInt({ min: 1 }).withMessage('Total slots must be at least 1'),
  body('applicationDeadline')
    .notEmpty()
    .custom((value) => {
      // Frontend uses <input type="datetime-local"> which sends: YYYY-MM-DDTHH:mm
      // Accept both datetime-local and full ISO strings.
      if (typeof value !== 'string') return false;
      const datetimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      if (datetimeLocalPattern.test(value)) return true;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return true;
    })
    .withMessage('Valid deadline date is required'),
];

// ===== PROVIDER ROUTES =====

/**
 * POST /api/scholarship-opportunities
 * Create new scholarship opportunity
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  validateOpportunity,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  createOpportunity
);

/**
 * PUT /api/scholarship-opportunities/:id
 * Update scholarship opportunity
 */
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  updateOpportunity
);

/**
 * DELETE /api/scholarship-opportunities/:id
 * Delete scholarship opportunity
 */
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  deleteOpportunity
);

/**
 * GET /api/scholarship-opportunities/provider/list
 * Get provider's opportunities
 */
router.get(
  '/provider/list',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  getProviderOpportunities
);

// ===== STUDENT BROWSE ROUTES =====

/**
 * GET /api/scholarship-opportunities/browse
 * Browse all open opportunities
 */
router.get('/browse', browseOpportunities);

/**
 * GET /api/scholarship-opportunities/:id
 * Get opportunity by ID
 */
router.get('/:id', getOpportunityById);

/**
 * GET /api/scholarship-opportunities/:id/details
 * Get opportunity details for students
 */
router.get('/:id/details', authMiddleware, getOpportunityDetails);

module.exports = router;

