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
const chatbotRoutes = require('./routes/chatbot');

/* ================= CORS CONFIG ================= */
const isProd = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Local dev origins (Web Admin, Flutter Web, Mobile Emulators) only allowed in non-production
const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8088',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8088',
  'http://127.0.0.1:4000',
  'http://10.0.2.2:4000',
];

const defaultProdOrigins = [
  'https://iskolar.vercel.app',
  'https://iskolar.ph',
  'https://iskolar.pages.dev',
  'https://client-gamma-hazel-97.vercel.app',
];

// Directive 6: Production must only use explicit approved web domains; omit local dev origins
const origins = isProd
  ? (allowedOrigins.length > 0 ? allowedOrigins : defaultProdOrigins)
  : [...new Set([...defaultDevOrigins, ...allowedOrigins])];

/* ================= BUILD APP ================= */
const buildApp = () => {
  const app = express();

  // Trust local reverse proxy / load balancer headers
  app.set('trust proxy', 1);

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
        if (typeof origin === 'string' && (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin) || /^https:\/\/[a-zA-Z0-9_-]+\.pages\.dev$/.test(origin))) {
          return cb(null, true);
        }
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

  // Cold-start serverless DB initialization middleware (runs once or when uninitialized with cooldown)
  const { connectDb, db } = require('./config/db');
  let lastDbInitAttempt = 0;
  const DB_INIT_COOLDOWN_MS = 5000;

  app.use(async (_req, _res, next) => {
    try {
      const now = Date.now();
      if (!db.collection && process.env.MONGO_URI && (now - lastDbInitAttempt >= DB_INIT_COOLDOWN_MS)) {
        lastDbInitAttempt = now;
        await connectDb();
      }
      if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('<db_password>') && mongoose.connection.readyState === 0) {
        await connectMongoose();
      }
    } catch (e) {
      console.warn('⚠️ Serverless DB initialization notice:', e?.message || e);
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
      instanceId: process.env.INSTANCE_ID || 'default',
      timestamp: new Date().toISOString(),
    });
  };
  // Root & Health handlers
  app.get('/', (req, res) => {
    // If request accepts HTML, render a clean status page with link to frontend
    if (req.accepts('html')) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ISKOLAR 2.0 API Server</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B0F17; color: #F1F5F9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
            h1 { font-size: 24px; margin: 0 0 8px; color: #FF6D29; }
            p { color: #94A3B8; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }
            .badge { display: inline-block; background: #064E3B; color: #34D399; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; margin-bottom: 20px; border: 1px solid #059669; }
            .btn-group { display: flex; gap: 12px; flex-direction: column; }
            .btn { display: block; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 10px; transition: all 0.2s ease; }
            .btn-primary { background: #FF6D29; color: #FFFFFF; }
            .btn-primary:hover { background: #E85B19; }
            .btn-secondary { background: #1E293B; color: #E2E8F0; border: 1px solid #334155; }
            .btn-secondary:hover { background: #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">● Backend API Online</span>
            <h1>ISKOLAR 2.0 API Server</h1>
            <p>The backend REST API and Socket.IO engine is running on port 4000. Open the web portal below:</p>
            <div class="btn-group">
              <a href="http://localhost:5173" class="btn btn-primary">Open Local Web Client (Port 5173) →</a>
              <a href="https://client-gamma-hazel-97.vercel.app" class="btn btn-secondary" target="_blank">Open Live Vercel Deployment →</a>
              <a href="/api/health/readiness" class="btn btn-secondary">Check API Readiness Status</a>
            </div>
          </div>
        </body>
        </html>
      `);
    }
    res.json({
      service: 'ISKOLAR 2.0 API',
      status: 'healthy',
      readiness: '/api/health/readiness',
      frontendUrl: 'http://localhost:5173',
      vercelDeployment: 'https://client-gamma-hazel-97.vercel.app',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api', healthHandler);
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Phase 2 / Phase 10 / Phase 13 Health probes (liveness, readiness, deep, storage)
  const { deepHealthHandler, livenessHandler, readinessHandler, storageHealthHandler } = require('./utils/healthCheck');
  app.get('/api/health/liveness', livenessHandler);
  app.get('/api/health/readiness', readinessHandler);
  app.get('/health/readiness', readinessHandler);
  app.get('/api/health/deep', deepHealthHandler);
  app.get('/api/health/storage', storageHealthHandler);

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/student', authRoutes);
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
  app.use('/api/chatbot', chatbotRoutes);

  // Versioned v1 route aliases
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/student', authRoutes);
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

  // Test-only controlled security-store outage endpoint (Directive 4)
  if (process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_OVERRIDE === 'true') {
    app.post('/api/test/induce-outage', (req, res) => {
      const { target, enabled } = req.body || {};
      global._simulatedStoreOutage = enabled ? (target || 'all') : null;
      res.json({
        status: 'ok',
        simulatedStoreOutage: global._simulatedStoreOutage,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // Error handling
  const { errorHandler } = require('./middleware/errorMiddleware');
  app.use(errorHandler);

  return app;
};

/* ================= MONGOOSE ================= */
let mongooseListenersAttached = false;
let lastMongooseAttempt = 0;
const MONGOOSE_RETRY_COOLDOWN_MS = 30000;

const connectMongoose = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return; // Already connected or connecting
  }

  const now = Date.now();
  if (now - lastMongooseAttempt < MONGOOSE_RETRY_COOLDOWN_MS) {
    return; // Within cooldown period after recent failure
  }
  lastMongooseAttempt = now;

  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<db_password>')) {
    console.warn('⚠️ MONGO_URI not configured or contains placeholder. Mongoose skipped.');
    if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
      throw new Error('FATAL: Valid MONGO_URI is required for Mongoose in production.');
    }
    return;
  }

  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    const lower = uri.toLowerCase();
    if (lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('::1')) {
      throw new Error('FATAL: Local MongoDB (localhost/127.0.0.1) is strictly forbidden in deployed configuration.');
    }
  }

  const { resolveDbName } = require('./config/db');
  const targetDbName = resolveDbName(uri);

  if (!mongooseListenersAttached) {
    mongoose.connection.on('connected', () => {
      console.log('✓ [Mongoose] connected to', mongoose.connection.name);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [Mongoose] disconnected');
      setTimeout(() => {
        connectMongoose().catch(() => {});
      }, 2000);
    });
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 [Mongoose] reconnecting / reconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('✗ [Mongoose] connection error:', err?.message || err);
    });
    mongooseListenersAttached = true;
  }

  try {
    await mongoose.connect(uri, {
      dbName: targetDbName,
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
    });
    console.log('✓ [Mongoose] connected to', mongoose.connection.name);

    // Ensure MongoDB indexes on startup
    try {
      const { ensureIndexes } = require('./utils/ensureIndexes');
      await ensureIndexes(mongoose);
    } catch (indexErr) {
      if (indexErr.name === 'MandatoryUniqueIndexError' && (process.env.NODE_ENV === 'production' || process.env.FAIL_ON_INDEX_ERROR === 'true')) {
        console.error('CRITICAL: Mandatory unique index failed during startup:', indexErr);
        throw indexErr;
      }
      console.warn('⚠️ Index migration notice:', indexErr?.message);
    }
  } catch (err) {
    console.error('✗ Mongoose connection failed:', err?.message || err);
    if (process.env.NODE_ENV === 'production') {
      throw err; // Fail closed in production if MongoDB connection fails
    }
    console.warn('⚠️ Continuing with fallback mode');
  }
};

/* ================= SOCKET.IO ================= */
const setupSocketIO = (server) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const { normalizeRole } = require('./config/constants');

  if (!process.env.REDIS_URL) {
    console.warn('⚠️ [REALTIME DEPLOYMENT RESTRICTION]: Redis adapter is not configured (REDIS_URL missing). Socket.IO is strictly restricted to ONE realtime backend instance. Horizontal scaling beyond 1 instance without Redis adapter will cause non-delivery of cross-instance websocket events.');
  }

  const io = new Server(server, {
    cors: { origin: origins, credentials: true },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      try {
        const { isTokenRevoked } = require('./middleware/authMiddleware');
        if (await isTokenRevoked(token)) {
          return next(new Error('Authentication error: Token revoked'));
        }
        const secret = process.env.JWT_SECRET || 'iskolar-dev-secret-key';
        const decoded = jwt.verify(token, secret);
        if (decoded && decoded.purpose === 'mfa') {
          return next(new Error('Authentication error: MFA incomplete'));
        }
        socket.token = token;
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
      } else if (role === 'sponsor' || role === 'provider') {
        socket.join(`sponsor_room_${userId}`);
        console.log(`📡 Sponsor ${userId} joined room sponsor_room_${userId}`);
      } else if (role === 'admin') {
        socket.join('admin_room');
        console.log(`📡 Admin ${userId} joined admin_room`);
      }
    }

    // Authenticated room join handlers for client explicit requests (strictly authorized)
    socket.on('join-user', () => {
      if (socket.user && socket.user.id) {
        const targetId = socket.user.id;
        socket.join(`user_${targetId}`);
        if (socket.user.role === 'student') {
          socket.join(`student_room_${targetId}`);
        }
        if (socket.user.role === 'sponsor' || socket.user.role === 'provider') {
          socket.join(`sponsor_room_${targetId}`);
        }
      }
    });

    socket.on('join-admin', () => {
      if (socket.user && socket.user.role === 'admin') {
        socket.join('admin_room');
      }
    });

    // Intercept every socket event to enforce token revocation across distributed instances
    socket.use(async ([event, ...args], next) => {
      if (socket.token) {
        try {
          const { isTokenRevoked } = require('./middleware/authMiddleware');
          if (await isTokenRevoked(socket.token)) {
            socket.emit('session_revoked', { reason: 'Token revoked' });
            socket.disconnect(true);
            return next(new Error('Authentication error: Token revoked'));
          }
        } catch (_) {}
      }
      next();
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  // Cross-Instance Revocation Watcher: Disconnect sockets on this instance when token is revoked in MongoDB
  try {
    const { RevokedToken } = require('./models');
    if (RevokedToken && typeof RevokedToken.watch === 'function') {
      const watcher = RevokedToken.watch();
      watcher.on('change', (change) => {
        const doc = change.fullDocument;
        if (doc) {
          for (const [id, s] of io.of('/').sockets) {
            const matchToken = s.token && s.token === doc.token;
            const matchUser = doc.userId && s.user && String(s.user.id) === String(doc.userId);
            if (matchToken || matchUser) {
              s.emit('session_revoked', { reason: doc.reason || 'revoked' });
              s.disconnect(true);
            }
          }
        }
      });
      watcher.on('error', () => {}); // Fallback to interval sweep
    }
  } catch (_) {}

  // Periodic active socket verification sweep for cross-instance revocation
  const sweepInterval = setInterval(async () => {
    try {
      const { isTokenRevoked } = require('./middleware/authMiddleware');
      for (const [id, s] of io.of('/').sockets) {
        if (s.token && (await isTokenRevoked(s.token))) {
          s.emit('session_revoked', { reason: 'Token revoked' });
          s.disconnect(true);
        }
      }
    } catch (_) {}
  }, 2500);
  if (sweepInterval.unref) sweepInterval.unref();

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
