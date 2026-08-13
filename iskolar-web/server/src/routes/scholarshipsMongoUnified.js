const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getProviderScholarships,
  browseScholarships,
  getScholarshipById,
  getScholarshipDetails,
} = require('../controllers/scholarshipControllerMongoUnified');

const router = express.Router();

// Validation middleware
const validateScholarshipMongo = [
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
      if (typeof value !== 'string') return false;
      const datetimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      if (datetimeLocalPattern.test(value)) return true;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return true;
    })
    .withMessage('Valid deadline date is required'),
];

// ===== PROVIDER ROUTES (Mongo) =====

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor']),
  validateScholarshipMongo,
  (req, res, next) => next(),
  createScholarship
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  updateScholarship
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor', 'admin']),
  deleteScholarship
);

router.get(
  '/provider/list',
  authMiddleware,
  roleMiddleware(['provider', 'sponsor']),
  getProviderScholarships
);

// ===== STUDENT BROWSE ROUTES (Mongo) =====

router.get('/browse', browseScholarships);
router.get('/:id', getScholarshipById);
router.get('/:id/details', authMiddleware, getScholarshipDetails);

module.exports = router;

