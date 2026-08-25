const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

// Backward-compat alias
const authenticate = authMiddleware;

const { roleMiddleware } = require('../middleware/roleMiddleware');

// adminOnly is missing in roleMiddleware.js; use roleMiddleware(['admin']) instead
const adminOnly = roleMiddleware(['admin']);

const {
  getPendingVerifications,
  getVerificationDetails,
  approveStudentVerification,
  rejectStudentVerification,
  approveProviderVerification,
  rejectProviderVerification,
  getVerificationStatistics,
} = require('../controllers/adminVerificationController');

const router = express.Router();

// All admin verification routes require authentication and admin role
router.use(authenticate, adminOnly);

// Get pending verifications for review
router.get('/pending', getPendingVerifications);

// Get specific verification details
router.get('/:verificationId', getVerificationDetails);

// Approve/Reject student verification
router.post('/:verificationId/approve-student', approveStudentVerification);
router.post('/:verificationId/reject-student', rejectStudentVerification);

// Approve/Reject provider verification
router.post('/:verificationId/approve-provider', approveProviderVerification);
router.post('/:verificationId/reject-provider', rejectProviderVerification);

// Statistics
router.get('/stats/overview', getVerificationStatistics);

module.exports = router;

