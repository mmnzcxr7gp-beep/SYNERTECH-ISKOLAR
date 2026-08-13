const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');

/* ================= ROUTE IMPORTS ================= */
const authRoutes = require('./routes/auth');
const scholarshipRoutes = require('./routes/scholarships');
const applicationRoutes = require('./routes/applications');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');
const adminVerificationRoutes = require('./routes/adminVerification');
const rankingRoutes = require('./routes/rankings');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const providerRoutes = require('./routes/providers');
const scholarshipApplicationRoutes = require('./routes/scholarshipApplications');
const scholarshipOpportunityRoutes = require('./routes/scholarshipOpportunities');
const scholarshipsMongoUnifiedRoutes = require('./routes/scholarshipsMongoUnified');
const scheduleRoutes = require('./routes/schedules');
const ocrRoutes = require('./routes/ocr');
const notificationRoutes = require('./routes/notifications');
const privacyPolicyRoutes = require('./routes/privacyPolicy');
const n8nRoutes = require('./routes/n8n');

/* ================= CORS CONFIG ================= */
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow common local dev origins (Web Admin, Flutter Web, Mobile Emulators)
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:4000',
  'http://10.0.2.2:4000',
];

const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];

/* ================= BUILD APP ================= */
const buildApp = () => {
  const app = express();

  // Phase 1: Observability — Request Context (unique request IDs + timing)
  const { requestContext } = require('./middleware/requestContext');
  app.use(requestContext);

  // Phase 8: Security Headers (beyond helmet defaults)
  const { securityHeaders } = require('./middleware/securityHeaders');
  app.use(securityHeaders);

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || origins.includes(origin)) return cb(null, true);
        // Allow any origin in development
        if (process.env.NODE_ENV !== 'production') return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Lazy serverless DB initialization middleware
  const { connectDb } = require('./config/db');
  app.use(async (_req, _res, next) => {
    try {
      await connectDb();
      if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('<db_password>')) {
        await connectMongoose();
      }
    } catch (e) {
      console.warn('⚠️ Serverless DB middleware warning:', e?.message || e);
    }
    next();
  });

  // Pillar 9: Rate Limiting
  const rateLimit = require('express-rate-limit');
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
  });
  app.use('/api/', apiLimiter);

  // P1 FIX: Rate limiting on authentication endpoints to prevent brute force
  const isDevOrTest = process.env.NODE_ENV !== 'production';

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevOrTest ? 500 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  });
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevOrTest ? 100 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many OTP requests. Please wait before trying again.' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/verify-login-otp', authLimiter);
  app.use('/api/auth/send-otp', otpLimiter);
  app.use('/api/auth/verify-otp', otpLimiter);
  app.use('/api/auth/resend-otp', otpLimiter);

  // Phase 7: Upload & Registration rate limiters
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevOrTest ? 200 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many file uploads. Please wait before uploading again.' },
  });
  const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevOrTest ? 500 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many registration attempts. Please try again later.' },
  });
  const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevOrTest ? 500 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many download requests. Please wait.' },
  });
  app.use('/api/auth/register', registrationLimiter);
  app.use('/api/ocr/extract', uploadLimiter);
  app.use('/uploads/', downloadLimiter);

  // Phase 1: Structured request logging (replaced raw console.log)
  const logger = require('./utils/logger');
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`, { requestId: req.requestId });
    next();
  });

  // P0 FIX FINDING-002: Protected document access with Object-Level Authorization.
  // Completely replace unprotected express.static for uploads directory.
  const { router: documentRoutes, handleDocumentDownload } = require('./routes/documents');
  const { authMiddleware } = require('./middleware/authMiddleware');

  // Protect /uploads/:filename with mandatory JWT auth and object-level authorization handler
  app.get('/uploads/:filename', authMiddleware, handleDocumentDownload);
  app.use('/api/documents', documentRoutes);

  const adminDir = path.join(__dirname, '..', 'admin');
  app.use('/admin', express.static(adminDir));

  // Health check (lightweight liveness)
  const healthHandler = (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Iskolar API is running',
      timestamp: new Date().toISOString(),
    });
  };
  app.get('/api', healthHandler);
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Phase 10: Deep health check (detailed system status for load balancers)
  const { deepHealthHandler } = require('./utils/healthCheck');
  app.get('/api/health/deep', deepHealthHandler);

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/scholarships', scholarshipRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/verification', adminVerificationRoutes);
  app.use('/api/rankings', rankingRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/providers', providerRoutes);
  app.use('/api/scholarship-applications', scholarshipApplicationRoutes);
  app.use('/api/scholarship-opportunities', scholarshipOpportunityRoutes);
  app.use('/api/scholarships-mongo', scholarshipsMongoUnifiedRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/ocr', ocrRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/privacy-policy', privacyPolicyRoutes);
  app.use('/api/n8n', n8nRoutes);
  app.use('/api/webhooks/n8n', n8nRoutes);

  // Versioned v1 route aliases
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/profiles', authRoutes);
  app.use('/api/v1/scholarships', scholarshipRoutes);
  app.use('/api/v1/applications', applicationRoutes);
  app.use('/api/v1/verification', verificationRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/rankings', rankingRoutes);
  app.use('/api/v1/schedules', scheduleRoutes);
  app.use('/api/v1/ocr', ocrRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/privacy-policy', privacyPolicyRoutes);
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Error handling
  const { errorHandler } = require('./middleware/errorMiddleware');
  app.use(errorHandler);

  return app;
};

/* ================= MONGOOSE ================= */
const connectMongoose = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return; // Already connected or connecting
  }

  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<db_password>')) {
    console.warn('⚠️ MONGO_URI not configured or contains placeholder. Mongoose skipped.');
    return;
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ Mongoose connected to', mongoose.connection.name);

    // Phase 6: Ensure MongoDB indexes on startup
    try {
      const { ensureIndexes } = require('./utils/ensureIndexes');
      await ensureIndexes(mongoose);
    } catch (indexErr) {
      console.warn('⚠️ Index migration warning:', indexErr?.message);
    }
  } catch (err) {
    console.error('✗ Mongoose connection failed:', err?.message || err);
    console.warn('⚠️ Continuing without Mongoose (in-memory mode)');
  }
};

/* ================= SOCKET.IO ================= */
const setupSocketIO = (server) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const { normalizeRole } = require('./config/constants');

  const io = new Server(server, {
    cors: { origin: origins, credentials: true },
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      try {
        const secret = process.env.JWT_SECRET || 'iskolar-dev-secret-key';
        const decoded = jwt.verify(token, secret);
        socket.user = {
          id: decoded.id,
          role: normalizeRole(decoded.role),
          email: decoded.email,
        };
      } catch (err) {
        console.warn('⚠️ Socket connection unverified token warning:', err.message);
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id, socket.user ? `(User: ${socket.user.id}, Role: ${socket.user.role})` : '(Unauthenticated)');

    // Automatically join authenticated rooms based on verified identity
    if (socket.user && socket.user.id) {
      const userId = socket.user.id;
      const role = socket.user.role;

      socket.join(`user_${userId}`);

      if (role === 'student') {
        socket.join(`student_room_${userId}`);
        console.log(`📡 Student ${userId} joined room student_room_${userId}`);
      } else if (role === 'sponsor') {
        socket.join(`sponsor_room_${userId}`);
        console.log(`📡 Sponsor ${userId} joined room sponsor_room_${userId}`);
      } else if (role === 'admin') {
        socket.join('admin_room');
        console.log(`📡 Admin ${userId} joined admin_room`);
      }
    }

    // Authenticated room join handlers for client explicit requests
    socket.on('join-user', (requestedUserId) => {
      const targetId = socket.user?.id || requestedUserId;
      if (targetId) {
        socket.join(`user_${targetId}`);
        if (socket.user?.role === 'student' || !socket.user) {
          socket.join(`student_room_${targetId}`);
        }
        if (socket.user?.role === 'sponsor') {
          socket.join(`sponsor_room_${targetId}`);
        }
      }
    });

    socket.on('join-admin', (requestedAdminId) => {
      if (socket.user?.role === 'admin' || !socket.user) {
        socket.join('admin_room');
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  // Store io instance for notification services
  global._io = io;

  // Initialize the notification service with the io instance
  try {
    const notificationService = require('./utils/notificationService');
    notificationService.init(io);
  } catch (e) {
    console.warn('⚠️ Could not initialize notificationService:', e?.message);
  }

  return io;
};

module.exports = { buildApp, connectMongoose, setupSocketIO };
