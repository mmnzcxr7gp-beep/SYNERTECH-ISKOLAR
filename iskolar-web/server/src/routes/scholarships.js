const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const sponsorVerification = require('../middleware/sponsorVerification');
const { createScholarship, getScholarships, browseScholarships, getScholarshipById, updateScholarship, deleteScholarship, getScholarshipApplications } = require('../controllers/scholarshipController');

const router = express.Router();

router.get('/', optionalAuthMiddleware, getScholarships);
router.get('/:id', optionalAuthMiddleware, getScholarshipById);
router.get('/:id/applications', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), getScholarshipApplications);

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['sponsor', 'provider', 'admin']),
  sponsorVerification,
  createScholarship
);

router.put('/:id', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), sponsorVerification, updateScholarship);
router.delete('/:id', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), sponsorVerification, deleteScholarship);

module.exports = router;
