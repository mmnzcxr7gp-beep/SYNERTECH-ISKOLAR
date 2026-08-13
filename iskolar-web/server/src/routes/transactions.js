const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

// Backward-compat alias
const authenticate = authMiddleware;

const {
  roleMiddleware,
} = require('../middleware/roleMiddleware');
const {
  requireProviderVerification,
  requireStudentVerification,
} = require('../middleware/verificationMiddleware');
const {
  createTransaction,
  getProviderTransactions,
  getStudentTransactions,
  getTransactionDetails,
  updateTransactionStatus,
  approveAllowanceTransaction,
  getTransactionStatistics,
} = require('../controllers/transactionController');

const router = express.Router();

// Provider Routes
router.post(
  '/create',
  authenticate,
  requireProviderVerification,
  createTransaction
);

router.get('/provider/list', authenticate, getProviderTransactions);

router.get('/provider/statistics', authenticate, getTransactionStatistics);

// Student Routes
router.get('/student/list', authenticate, getStudentTransactions);

router.get('/student/statistics', authenticate, getTransactionStatistics);

router.post(
  '/:transactionId/approve',
  authenticate,
  requireStudentVerification,
  approveAllowanceTransaction
);

// General Routes
router.get('/:transactionId', authenticate, getTransactionDetails);

// Admin Routes (admin.js should handle admin-only routes)
router.patch(
  '/:transactionId/status',
  authenticate,
  roleMiddleware(['admin']),
  updateTransactionStatus
);

module.exports = router;
