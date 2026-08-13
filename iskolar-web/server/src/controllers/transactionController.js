const mongoose = require('mongoose');
const { Student, Provider, Transaction, School } = require('../models');
const crypto = require('crypto');

// Generate transaction ID
const generateTransactionId = () => {
  return `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// Generate reference number
const generateReferenceNumber = () => {
  return `REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
};

// Create Transaction (Provider initiates) — wrapped in DB transaction
const createTransaction = async (req, res, next) => {
  // Attempt to use Mongoose session for atomicity
  let session = null;
  try {
    if (mongoose.connection.readyState === 1) {
      try { session = await mongoose.startSession(); } catch (e) {
        console.warn('[Transaction] Could not start session (replica set may not be available):', e?.message);
      }
    }

    const userId = req.user.userId || req.user.id;
    const {
      amount,
      transactionType,
      transferDirection,
      paymentMethod,
      studentId,
      schoolId,
      scholarshipId,
      programName,
      description,
    } = req.body;

    // Validate provider
    let provider = null;
    if (mongoose.connection.readyState === 1) {
      provider = await Provider.findOne({ userId });
    }
    if (!provider) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    if (!provider.isVerified) {
      return res.status(403).json({
        message: 'Provider must be verified before creating transactions',
      });
    }

    // Validate student if applicable
    let student = null;
    if (studentId) {
      if (mongoose.connection.readyState === 1) {
        student = await Student.findById(studentId);
      }
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      if (!student.isVerified && transferDirection === 'provider_to_student') {
        return res.status(403).json({
          message: 'Student must be verified to receive allowance transfers',
        });
      }
    }

    // Validate school if applicable
    let school = null;
    if (schoolId) {
      if (mongoose.connection.readyState === 1) {
        school = await School.findById(schoolId);
      }
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check provider funding
    const availableFunds = provider.totalFundingAmount - provider.totalDisbursedAmount;
    if (amount > availableFunds) {
      return res.status(400).json({
        message: 'Insufficient funds. Available: ' + availableFunds,
      });
    }

    // Validate payment methods
    const validPaymentMethods = ['gcash', 'payMaya', 'bank_transfer', 'check', 'cash'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Create transaction record
    const transaction = new Transaction({
      transactionId: generateTransactionId(),
      transactionType,
      providerId: provider._id,
      studentId: studentId ? studentId : null,
      schoolId: schoolId ? schoolId : null,
      amount,
      currency: 'PHP',
      paymentMethod,
      status: 'pending',
      transferDirection,
      referenceNumber: generateReferenceNumber(),
      scholarshipId: scholarshipId || null,
      programName,
      description,
      isStudentVerified: student ? student.isVerified : false,
      requiresStudentVerification: transferDirection === 'provider_to_student',
      initiatedAt: new Date(),
    });

    if (mongoose.connection.readyState === 1) {
      const sessionOpts = session ? { session } : {};
      if (session) session.startTransaction();

      await transaction.save(sessionOpts);

      // Update provider stats atomically
      provider.totalDisbursedAmount += amount;
      await provider.save(sessionOpts);

      if (session) await session.commitTransaction();
    }

    // Emit socket notification for transaction creation
    if (global._io) {
      // Notify provider
      global._io.to(`user_${userId}`).emit('transaction-created', {
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        timestamp: new Date().toISOString(),
      });

      // Notify student if applicable
      if (studentId && student) {
        global._io.to(`user_${student.userId}`).emit('transaction-received', {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          message: `You have a new pending transaction of ₱${amount}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: {
        transactionId: transaction.transactionId,
        referenceNumber: transaction.referenceNumber,
        status: transaction.status,
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        transferDirection: transaction.transferDirection,
      },
    });
  } catch (error) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
    }
    next(error);
  } finally {
    if (session) session.endSession();
  }
};

// Get Transactions by Provider
const getProviderTransactions = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { status, transactionType, page = 1, limit = 10 } = req.query;

    let provider = null;
    if (mongoose.connection.readyState === 1) {
      provider = await Provider.findOne({ userId });
    }
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const filter = { providerId: provider._id };
    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;

    const skip = (page - 1) * limit;

    let transactions = [];
    if (mongoose.connection.readyState === 1) {
      transactions = await Transaction.find(filter)
        .populate('studentId', 'email lrn schoolName')
        .populate('schoolId', 'schoolName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    let total = 0;
    if (mongoose.connection.readyState === 1) {
      total = await Transaction.countDocuments(filter);
    }

    res.json({
      transactions,
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

// Get Transactions by Student
const getStudentTransactions = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { status, transactionType, page = 1, limit = 10 } = req.query;

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findOne({ userId });
    }
    if (!student) {
      // A student may not have a profile yet, but the dashboard should still load.
      return res.json({
        transactions: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0,
        },
      });
    }

    const filter = {
      studentId: student._id,
      transferDirection: 'provider_to_student',
    };
    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;

    const skip = (page - 1) * limit;

    let transactions = [];
    if (mongoose.connection.readyState === 1) {
      transactions = await Transaction.find(filter)
        .populate('providerId', 'organizationName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    let total = 0;
    if (mongoose.connection.readyState === 1) {
      total = await Transaction.countDocuments(filter);
    }

    res.json({
      transactions,
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

// Get Transaction Details
const getTransactionDetails = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    let transaction = null;
    if (mongoose.connection.readyState === 1) {
      transaction = await Transaction.findOne({ transactionId })
        .populate('providerId', 'organizationName email contactNumber')
        .populate('studentId', 'email lrn')
        .populate('schoolId', 'schoolName');
    }

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check authorization
    const { userId } = req.user;
    let providerForCheck = null;
    if (mongoose.connection.readyState === 1) {
      providerForCheck = await Provider.findOne({ userId });
    }
    let studentForCheck = null;
    if (mongoose.connection.readyState === 1) {
      studentForCheck = await Student.findOne({ userId });
    }
    const isProvider =
      transaction.providerId._id.toString() ===
      providerForCheck?._id?.toString();
    const isStudent =
      transaction.studentId?._id?.toString() ===
      studentForCheck?._id?.toString();

    if (!isProvider && !isStudent && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
};

// Update Transaction Status (Admin only) — with socket notifications
const updateTransactionStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let transaction = null;
    if (mongoose.connection.readyState === 1) {
      transaction = await Transaction.findOne({ transactionId });
    }
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const previousStatus = transaction.status;
    transaction.status = status;
    if (notes) transaction.notes = notes;

    if (status === 'completed') {
      transaction.completedAt = new Date();
      transaction.adminApprovedAt = new Date();
      transaction.approvedBy = req.user.id;
    } else if (status === 'failed') {
      transaction.failureAt = new Date();
    }

    if (mongoose.connection.readyState === 1) {
      await transaction.save();
    }

    // Emit socket notification on status change
    if (global._io && previousStatus !== status) {
      // Notify student
      if (transaction.studentId) {
        try {
          const student = await Student.findById(transaction.studentId);
          if (student) {
            global._io.to(`user_${student.userId}`).emit('transaction-status-changed', {
              transactionId: transaction.transactionId,
              status,
              previousStatus,
              amount: transaction.amount,
              message: `Your transaction has been updated to ${status}`,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('[Transaction] Failed to notify student:', e?.message);
        }
      }

      // Notify provider
      if (transaction.providerId) {
        try {
          const provider = await Provider.findById(transaction.providerId);
          if (provider) {
            global._io.to(`user_${provider.userId}`).emit('transaction-status-changed', {
              transactionId: transaction.transactionId,
              status,
              previousStatus,
              amount: transaction.amount,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('[Transaction] Failed to notify provider:', e?.message);
        }
      }
    }

    res.json({
      message: 'Transaction status updated',
      transaction: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        completedAt: transaction.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Approve Allowance Transaction (Student action - marks as received)
const approveAllowanceTransaction = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { transactionId } = req.params;

    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await Student.findOne({ userId });
    }
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.isVerified) {
      return res.status(403).json({
        message: 'You must be verified to approve transactions',
      });
    }

    let transaction = null;
    if (mongoose.connection.readyState === 1) {
      transaction = await Transaction.findOne({ transactionId });
    }
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify this transaction belongs to the student
    if (transaction.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    transaction.isStudentVerified = true;
    transaction.studentApprovedAt = new Date();
    if (mongoose.connection.readyState === 1) {
      await transaction.save();
    }

    // Update student transaction count
    student.transactionCount += 1;
    student.totalTransactionAmount += transaction.amount;
    if (mongoose.connection.readyState === 1) {
      await student.save();
    }

    res.json({
      message: 'Allowance transaction approved',
      transaction: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        approvedAt: transaction.studentApprovedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Transaction Statistics
const getTransactionStatistics = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { dateRange = 'month' } = req.query;

    let provider = null;
    let student = null;

    if (req.user.role === 'provider') {
      if (mongoose.connection.readyState === 1) {
        provider = await Provider.findOne({ userId });
      }
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found' });
      }
    }

    if (req.user.role === 'student') {
      if (mongoose.connection.readyState === 1) {
        student = await Student.findOne({ userId });
      }
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
    }

    const dateFilter = {};
    const now = new Date();

    if (dateRange === 'month') {
      dateFilter.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    } else if (dateRange === 'year') {
      dateFilter.createdAt = {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lt: new Date(now.getFullYear() + 1, 0, 1),
      };
    }

    let stats = {};

    if (provider) {
      const providerTransactions = mongoose.connection.readyState === 1
        ? await Transaction.find({
            providerId: provider._id,
            ...dateFilter,
          })
        : [];

      stats = {
        totalTransactions: providerTransactions.length,
        totalAmount: providerTransactions.reduce((sum, t) => sum + t.amount, 0),
        byStatus: {},
        byType: {},
      };

      providerTransactions.forEach((t) => {
        stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
        stats.byType[t.transactionType] =
          (stats.byType[t.transactionType] || 0) + 1;
      });
    }

    if (student) {
      const studentTransactions = mongoose.connection.readyState === 1
        ? await Transaction.find({
            studentId: student._id,
            ...dateFilter,
          })
        : [];

      stats = {
        totalTransactions: studentTransactions.length,
        totalAmount: studentTransactions.reduce((sum, t) => sum + t.amount, 0),
        byStatus: {},
        byType: {},
      };

      studentTransactions.forEach((t) => {
        stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
        stats.byType[t.transactionType] =
          (stats.byType[t.transactionType] || 0) + 1;
      });
    }

    res.json({ statistics: stats, period: dateRange });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getProviderTransactions,
  getStudentTransactions,
  getTransactionDetails,
  updateTransactionStatus,
  approveAllowanceTransaction,
  getTransactionStatistics,
};
