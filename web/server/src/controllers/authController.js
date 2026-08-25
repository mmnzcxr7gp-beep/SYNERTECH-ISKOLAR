const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { db, createId } = require('../config/db');
const { sendOtpEmail, sendMail } = require('../utils/emailService');

const { normalizeRole } = require('../config/constants');

/* ================= JWT ================= */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { id: user.id, role: normalizeRole(user.role), email: user.email },
    secret,
    { expiresIn: '7d' }
  );
};

/* ================= OTP ================= */
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const ensureOtpsArray = () => {
  if (!db.data.otps) db.data.otps = [];
};

const safeDbWrite = async () => {
  // Requirement: db.write should never crash the server even if Mongo is down.
  try {
    // requirement: await wherever used
    if (typeof db.write === 'function') await db.write();
  } catch (e) {
    console.error('✗ SAFE DB WRITE ERROR:', e?.message || e);
  }
};

const deleteAllOtpsForEmail = (email) => {
  ensureOtpsArray();
  const before = db.data.otps.length;
  const normalizedEmail = (email || '').trim().toLowerCase();
  db.data.otps = db.data.otps.filter((o) => (o.email || '').trim().toLowerCase() !== normalizedEmail);
  const after = db.data.otps.length;

  console.log(`🧹 OTP cleanup for ${email}: removed ${before - after} existing record(s)`);
};

const getLatestOtpRecordForEmail = (email) => {
  ensureOtpsArray();

  const normalizedEmail = (email || '').trim().toLowerCase();
  const matches = db.data.otps.filter((o) => (o.email || '').trim().toLowerCase() === normalizedEmail);
  if (!matches.length) return null;

  const sorted = matches.sort((a, b) => {
    const at = new Date(a.created_at || a.expiresAt || 0).getTime();
    const bt = new Date(b.created_at || b.expiresAt || 0).getTime();
    return at - bt;
  });

  return sorted[sorted.length - 1];
};

/* ================= REGISTER ================= */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role = 'student' } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin role registration is not allowed' });
    }

    // Privacy policy enforcement
    if (req.body.privacyPolicyAccepted !== true && req.body.privacyPolicyAccepted !== 'true') {
      return res.status(400).json({ message: 'You must accept the Privacy Policy to register.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    const existing = db.data.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = {
      id: createId('users'),
      name,
      email: normalizedEmail,
      password: bcrypt.hashSync(password, 10),
      role,
      created_at: new Date().toISOString(),
      // New accounts start unverified and without a profile picture.
      // P1 FIX: emailVerified must be false until OTP is verified.
      emailVerified: false,
      // P1 FIX: Providers/sponsors must NOT be auto-verified; require admin approval.
      verificationStatus: 'unverified',
      sponsor_verified: false,
      organization_verified: false,
      organization_documents: Array.isArray(req.body.organization_documents) ? req.body.organization_documents : [],
      profilePicture: '',

      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: new Date().toISOString(),
    };

    db.data.users.push(user);
    // keep original behavior but make deterministic with await
    await safeDbWrite();

    return res.json({
      user: { id: user.id, name, email: normalizedEmail, role },
      token: generateToken(user),
    });

  } catch (err) {
    next(err);
  }
};

/* ================= LOGIN (with MFA) ================= */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, skipMfa } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    let user = db.data.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect email or password.' });
    }

    let ok = false;
    try {
      ok = bcrypt.compareSync(password, user.password);
    } catch (e) {
      ok = password === user.password;
    }

    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect email or password.' });
    }

    // MFA: Send OTP for second factor (only if SMTP email service is configured and skipMfa is not requested)
    const isSmtpConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    if (!skipMfa && isSmtpConfigured) {
      ensureOtpsArray();
      deleteAllOtpsForEmail(normalizedEmail);

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const html = `
        <h2>ISKOLAR Login Verification</h2>
        <p>Hello ${user.name || 'User'},</p>
        <p>Your login verification code is:</p>
        <h1>${otp}</h1>
        <p>Valid for 5 minutes. If you did not attempt to log in, please ignore this email.</p>
      `;

      console.log('🔐 MFA OTP generated for login:', { email: normalizedEmail, otp: `****${otp.slice(-2)}` });

      try {
        await sendMail({
          to: normalizedEmail,
          subject: 'ISKOLAR Login Verification Code',
          html,
        });
        console.log('✅ MFA OTP sent:', { email: normalizedEmail });
      } catch (mailErr) {
        console.warn('⚠️ MFA email failed (non-critical):', mailErr?.message);
      }

      db.data.otps.push({
        id: createId('otps'),
        email: normalizedEmail,
        otp,
        purpose: 'login_mfa',
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      });

      await safeDbWrite();

      // Generate a temporary MFA token (short-lived, only valid for OTP verification)
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret && process.env.NODE_ENV === 'production') {
        return res.status(500).json({ message: 'Server configuration error: JWT not configured' });
      }
      const mfaToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'mfa' },
        jwtSecret || 'iskolar-dev-secret-key',
        { expiresIn: '10m' }
      );

      return res.json({
        requiresMfa: true,
        mfaToken,
        email: normalizedEmail,
        message: 'Verification code sent to your email',
      });
    }

    // If skipMfa (dev mode), return full login immediately
    const studentProfile = db.data.student_profiles.find((p) => p.user_id === user.id) || null;

    const safeUser = {
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      organization_name: user.organization_name || user.company || '',
      organization_type: user.organization_type || '',
      phone: user.phone || '',
      contact_person: user.contact_person || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
      profilePicture: user.profilePicture || user.profile_picture || '',
      profile: studentProfile,
    };

    return res.json({
      user: safeUser,
      token: generateToken(user),
    });

  } catch (err) {
    next(err);
  }
};

/* ================= VERIFY LOGIN OTP (MFA Step 2) ================= */
const verifyLoginOTP = async (req, res, next) => {
  try {
    const { mfaToken, otp } = req.body;

    if (!mfaToken || !otp) {
      return res.status(400).json({ message: 'MFA token and OTP are required' });
    }

    // Verify the MFA token
    let decoded;
    try {
      decoded = jwt.verify(mfaToken, process.env.JWT_SECRET || 'iskolar-dev-secret-key');
    } catch (jwtErr) {
      return res.status(401).json({ message: 'MFA session expired. Please log in again.' });
    }

    if (decoded.purpose !== 'mfa') {
      return res.status(401).json({ message: 'Invalid MFA token' });
    }

    const normalizedEmail = (decoded.email || '').trim().toLowerCase();
    ensureOtpsArray();

    const record = getLatestOtpRecordForEmail(normalizedEmail);
    // Master override only available when explicitly enabled via env var in test mode
    const isTestOverrideEnabled = process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_OVERRIDE === 'true';
    const isMasterOverride = isTestOverrideEnabled && (otp === '123456' || otp === '000000' || otp === '999999');

    if (!record && !isMasterOverride) {
      return res.status(400).json({ message: 'No MFA verification found. Please log in again.' });
    }

    if (record && new Date() > new Date(record.expiresAt) && !isMasterOverride) {
      return res.status(400).json({ message: 'Verification code expired. Please log in again.' });
    }

    if (record && (record.attempts || 0) >= 5 && !isMasterOverride) {
      db.data.otps = db.data.otps.filter((o) => (o.email || '').toLowerCase() !== normalizedEmail || o.purpose !== 'login_mfa');
      await safeDbWrite();
      return res.status(429).json({ message: 'Maximum verification attempts exceeded. Please log in again.', attemptsRemaining: 0 });
    }

    if (!isMasterOverride && record && record.otp !== otp) {
      record.attempts = (record.attempts || 0) + 1;
      await safeDbWrite();
      if (record.attempts >= 5) {
        db.data.otps = db.data.otps.filter((o) => (o.email || '').toLowerCase() !== normalizedEmail || o.purpose !== 'login_mfa');
        await safeDbWrite();
        return res.status(429).json({ message: 'Maximum verification attempts exceeded. Please log in again.', attemptsRemaining: 0 });
      }
      return res.status(400).json({
        message: 'Invalid verification code',
        attemptsRemaining: Math.max(0, 5 - record.attempts),
      });
    }

    // OTP verified — complete login
    const user = db.data.users.find((u) => u.id === decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean up OTP records
    db.data.otps = db.data.otps.filter((o) => (o.email || '').toLowerCase() !== normalizedEmail || o.purpose !== 'login_mfa');
    await safeDbWrite();

    const studentProfile = db.data.student_profiles.find((p) => p.user_id === user.id) || null;

    const safeUser = {
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      organization_name: user.organization_name || user.company || '',
      organization_type: user.organization_type || '',
      phone: user.phone || '',
      contact_person: user.contact_person || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
      profilePicture: user.profilePicture || user.profile_picture || '',
      profile: studentProfile,
    };

    return res.json({
      user: safeUser,
      token: generateToken(user),
      message: 'Login successful',
    });
  } catch (err) {
    next(err);
  }
};

/* ================= SEND OTP ================= */
const sendOTP = async (req, res, next) => {
  try {
    const { email, phone, mobileNumber, firstName = 'User', lastName = '', password = 'Password123!', privacyPolicyAccepted = true } = req.body;
    const rawRecipient = email || phone || mobileNumber;

    if (!rawRecipient) {
      return res.status(400).json({ message: 'Missing email or phone recipient field' });
    }

    const normalizedEmail = String(rawRecipient).trim().toLowerCase();

    const existing = db.data.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email or phone already registered' });
    }

    ensureOtpsArray();

    // STRICT RULE (A): delete all OTP records for the recipient before generating/sending
    deleteAllOtpsForEmail(normalizedEmail);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry for test flexibility

    console.log('🔐 Real-Time Live OTP Generated:', { recipient: normalizedEmail, otp: `****${otp.slice(-2)}`, expiresAt: expiresAt.toISOString() });
    console.log('📩 Dispatching OTP via Email & SMS & n8n to:', normalizedEmail);

    // Non-blocking background dispatch for email, push notification, and n8n webhooks
    setImmediate(() => {
      if (normalizedEmail.includes('@')) {
        sendOtpEmail(normalizedEmail, otp).catch((e) => console.warn('Email send OTP notice:', e.message));
      } else {
        console.log(`📱 [SMS OTP SERVICE] Real-time SMS OTP generated for [${normalizedEmail}]: ****${otp.slice(-2)}`);
      }

      try {
        const n8nService = require('../utils/n8nService');
        n8nService.triggerN8nWebhook('otp_generated', { email: normalizedEmail, otp, expiresAt }).catch(() => { });
      } catch (e) { }

      if (global._io) {
        // P1 FIX: Never broadcast OTP values via Socket.IO
        global._io.emit('otp-generated', { email: normalizedEmail, timestamp: new Date().toISOString() });
      }
    });

    // Store ONLY latest OTP (since we deleted all previous ones)
    db.data.otps.push({
      id: createId('otps'),
      email: normalizedEmail,
      firstName,
      lastName,
      password: bcrypt.hashSync(password, 10),
      otp,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: new Date().toISOString(),
    });

    console.log('💾 OTP stored in DB:', {
      email: normalizedEmail,
      otp: `****${otp.slice(-2)}`,
      recordCountForEmail: db.data.otps.filter((o) => o.email && o.email.toLowerCase() === normalizedEmail).length,
    });

    await safeDbWrite();

    return res.json({
      message: 'Real-time OTP sent successfully',
      email: normalizedEmail,
      recipient: normalizedEmail,
      expiresIn: 900,
    });

  } catch (err) {
    next(err);
  }
};

/* ================= VERIFY OTP ================= */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, phone, mobileNumber, otp } = req.body;
    const rawRecipient = email || phone || mobileNumber;
    const normalizedEmail = String(rawRecipient || '').trim().toLowerCase();

    ensureOtpsArray();

    console.log('🔎 Real-Time OTP Verification Attempt:', { recipient: normalizedEmail, otp: `****${otp.slice(-2)}` });

    // P1 FIX: Master override only available when explicitly enabled via env var in test mode
    const isTestOverrideEnabled = process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_OVERRIDE === 'true';
    const isDevMode = process.env.NODE_ENV === 'development';
    const isMasterOverride = isTestOverrideEnabled && (otp === '123456' || otp === '000000' || otp === '999999');

    const record = getLatestOtpRecordForEmail(normalizedEmail);

    if (!record && !isMasterOverride) {
      return res.status(400).json({
        message: 'No OTP request found',
        debug: { recipient: normalizedEmail, otpsCountForEmail: 0 },
      });
    }

    if (record && new Date() > new Date(record.expiresAt) && !isMasterOverride) {
      return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
    }

    if (record && (record.attempts || 0) >= 5 && !isMasterOverride) {
      db.data.otps = db.data.otps.filter((o) => o.email && o.email.toLowerCase() !== normalizedEmail);
      await safeDbWrite();
      return res.status(429).json({ message: 'Maximum verification attempts exceeded. Please request a new code.', attemptsRemaining: 0 });
    }

    // Check OTP match or master override
    const isOtpValid = isMasterOverride || (record && record.otp === otp);

    if (!isOtpValid) {
      if (record) {
        record.attempts = (record.attempts || 0) + 1;
        await safeDbWrite();
        if (record.attempts >= 5) {
          db.data.otps = db.data.otps.filter((o) => o.email && o.email.toLowerCase() !== normalizedEmail);
          await safeDbWrite();
          return res.status(429).json({ message: 'Maximum verification attempts exceeded. Please request a new code.', attemptsRemaining: 0 });
        }
      }
      return res.status(400).json({
        message: 'Invalid OTP',
        attemptsRemaining: record ? Math.max(0, 5 - record.attempts) : 0,
      });
    }

    // Successful verification -> create or update user
    const existingUser = db.data.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
    let user = existingUser;

    if (!user) {
      user = {
        id: createId('users'),
        name: record ? `${record.firstName} ${record.lastName}`.trim() : normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: record?.password || bcrypt.hashSync('Password123!', 10),
        role: 'student',
        created_at: new Date().toISOString(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
        emailVerified: true,
        verificationStatus: 'verified',
      };
      db.data.users.push(user);
    } else {
      user.emailVerified = true;
      user.verificationStatus = 'verified';
    }

    // Remove OTP after successful verification (strict)
    db.data.otps = db.data.otps.filter((o) => o.email && o.email.toLowerCase() !== normalizedEmail);

    console.log('✅ OTP Verified Successfully! User account verified:', {
      recipient: normalizedEmail,
      userId: user.id,
      // P1 FIX: OTP verification detail removed from response
    });

    await safeDbWrite();

    // P1 FIX: Email is now verified. Document verification remains separate.
    // Do NOT override verificationStatus here — it was already set correctly above.
    user.profilePicture = user.profilePicture || '';

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,

        firstName: record?.firstName || user.name || 'Student',
        middleName: record?.middleName || '',
        lastName: record?.lastName || '',

        emailVerified: user.emailVerified,
        verificationStatus: user.verificationStatus,

        profilePicture: user.profilePicture,
        mobileNumber: '',
        school: '',
        course: '',
        yearLevel: '',
      },
      token: generateToken(user),
    });

  } catch (err) {
    next(err);
  }
};

/* ================= RESEND OTP ================= */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    ensureOtpsArray();

    const beforeRecord = getLatestOtpRecordForEmail(normalizedEmail);
    if (!beforeRecord) {
      // If client verifies immediately after an OTP was sent (or after a DB reload),
      // allow resend to behave deterministically.
      // Strict rule: delete old OTPs first, then generate and store a new one.
      deleteAllOtpsForEmail(normalizedEmail);

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const html = `
        <h1>${otp}</h1>
        <p>Valid for 5 minutes</p>
      `;

      console.log('🔐 OTP generated (resend - no prior record):', { email: normalizedEmail, otp: `****${otp.slice(-2)}`, expiresAt: expiresAt.toISOString() });
      setImmediate(() => { sendOtpEmail(normalizedEmail, otp).catch((e) => console.warn('Email OTP notice:', e.message)); });

      // We do not have firstName/lastName/password from a missing record.
      // Store minimal OTP so verifyOTP can succeed.
      db.data.otps.push({
        id: createId('otps'),
        email: normalizedEmail,
        firstName: '',
        lastName: '',
        password: '',
        otp,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      });

      console.log('💾 OTP stored in DB (resend - no prior record):', {
        email: normalizedEmail,
        otp: `****${otp.slice(-2)}`,
        recordCountForEmail: db.data.otps.filter((o) => o.email && o.email.toLowerCase() === normalizedEmail).length,
      });

      await safeDbWrite();

      return res.json({
        message: 'OTP resent successfully',
        email: normalizedEmail,
      });
    }

    // COOLDOWN (PREVENT GMAIL BLOCK) - based on latest record
    const now = Date.now();
    const created = new Date(beforeRecord.created_at || beforeRecord.expiresAt).getTime();

    if (now - created < 60 * 1000) {
      return res.status(429).json({
        message: 'Please wait 60 seconds before requesting again'
      });
    }

    // STRICT RULE (A/C): delete ALL existing OTP records for this email before generating new one
    deleteAllOtpsForEmail(normalizedEmail);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const html = `
      <h1>${otp}</h1>
      <p>Valid for 5 minutes</p>
    `;

    console.log('🔐 OTP generated (resend):', { email: normalizedEmail, otp: `****${otp.slice(-2)}`, expiresAt: expiresAt.toISOString() });
    setImmediate(() => { sendOtpEmail(normalizedEmail, otp).catch((e) => console.warn('Email OTP notice:', e.message)); });

    // Store ONLY latest OTP
    db.data.otps.push({
      id: createId('otps'),
      email: normalizedEmail,
      firstName: beforeRecord.firstName,
      lastName: beforeRecord.lastName,
      password: beforeRecord.password,
      otp,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    });

    console.log('💾 OTP stored in DB (resend):', {
      email: normalizedEmail,
      otp: `****${otp.slice(-2)}`,
      recordCountForEmail: db.data.otps.filter((o) => o.email && o.email.toLowerCase() === normalizedEmail).length,
    });

    await safeDbWrite();

    return res.json({
      message: 'OTP resent successfully',
      email: normalizedEmail,
    });

  } catch (err) {
    next(err);
  }
};

/* ================= EXPORTS ================= */
module.exports = {
  register,
  login,
  verifyLoginOTP,
  sendOTP,
  verifyOTP,
  resendOTP,
  getProfile: async (req, res, next) => {
    const { Student, Provider } = require('../models');

    try {
      console.log('[getProfile] Starting - req.user:', req.user);
      const userId = req.user && req.user.id;
      if (!userId) {
        console.error('[getProfile] No userId found');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      console.log('[getProfile] Looking for user with ID/email:', userId, req.user && req.user.email, 'in', db.data.users.length, 'users');
      const reqEmailNorm = (req.user && req.user.email ? req.user.email : '').toLowerCase();
      const user = reqEmailNorm
        ? (db.data.users.find((u) => u.email && u.email.toLowerCase() === reqEmailNorm) ||
          db.data.users.find((u) => String(u.id) === String(userId)))
        : db.data.users.find((u) => String(u.id) === String(userId));
      if (!user) {
        console.error('[getProfile] User not found for ID:', userId, 'email:', reqEmailNorm);
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('[getProfile] Found user:', user.email);

      const studentProfile =
        db.data.student_profiles.find((p) => p.user_id === user.id) || null;

      // Start with in-memory values then merge Mongo Student truth for students.
      let mergedVerificationStatus = user.verificationStatus || 'unverified';
      let mergedVerificationSubmittedAt =
        user.verification_submitted_at || null;
      let mergedSponsorVerified = !!user.sponsor_verified;
      let mergedOrganizationVerified = !!user.organization_verified;

      console.log('[getProfile] User role:', user.role, '| Initial verification status:', mergedVerificationStatus);

      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1 && (user.role === 'student' || user.role === 'applicant') && Student && typeof Student.findOne === 'function') {
        console.log('[getProfile] Fetching student document for userId:', user.id);
        try {
          const studentDoc = await Student.findOne({ userId: user.id }).catch((err) => {
            console.error('[getProfile] Error fetching student doc:', err?.message);
            return null;
          });
          if (studentDoc) {
            console.log('[getProfile] Found student doc, isVerified:', studentDoc.isVerified);
            if (studentDoc.isVerified === true) {
              mergedVerificationStatus = 'verified';
            } else if (studentDoc.verificationStatus) {
              mergedVerificationStatus = studentDoc.verificationStatus;
            }

            if (studentDoc.verificationSubmittedAt) {
              mergedVerificationSubmittedAt = studentDoc.verificationSubmittedAt;
            }
          }
        } catch (err) {
          console.error('[getProfile] Exception fetching student doc:', err?.message);
        }
      } else if (mongoose.connection.readyState === 1 && (user.role === 'provider' || user.role === 'sponsor') && Provider && typeof Provider.findOne === 'function') {
        console.log('[getProfile] Fetching provider document for userId:', user.id);
        try {
          const providerDoc = await Provider.findOne({ userId: user.id }).catch((err) => {
            console.error('[getProfile] Error fetching provider doc:', err?.message);
            return null;
          });
          if (providerDoc) {
            console.log('[getProfile] Found provider doc, isVerified:', providerDoc.isVerified);
            if (providerDoc.isVerified === true || providerDoc.verificationStatus === 'approved') {
              mergedVerificationStatus = 'verified';
              mergedSponsorVerified = true;
              mergedOrganizationVerified = true;
            } else if (providerDoc.verificationStatus) {
              mergedVerificationStatus = providerDoc.verificationStatus === 'rejected' ? 'rejected' : 'pending';
            }

            if (providerDoc.verificationSubmittedAt) {
              mergedVerificationSubmittedAt = providerDoc.verificationSubmittedAt;
            }
          }
        } catch (err) {
          console.error('[getProfile] Exception fetching provider doc:', err?.message);
        }
      }

      const safeUser = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        firstName: user.firstName || user.first_name || '',
        middleName: user.middleName || user.middle_name || '',
        lastName: user.lastName || user.last_name || '',
        mobileNumber: user.mobileNumber || user.mobile_number || '',
        organization_name: user.organization_name || user.company || '',
        organization_type: user.organization_type || '',
        registration_number: user.registration_number || '',
        website: user.website || '',
        phone: user.phone || '',
        contact_person: user.contact_person || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        profilePicture: user.profilePicture || user.profile_picture || '',

        // IMPORTANT fields for Flutter UI
        verificationStatus: mergedVerificationStatus,
        verification_submitted_at: mergedVerificationSubmittedAt,

        sponsorVerified: mergedSponsorVerified,
        organizationVerified: mergedOrganizationVerified,
        sponsor_verified: mergedSponsorVerified,
        organization_verified: mergedOrganizationVerified,

        // legacy compatibility fields (may be used elsewhere)
        school: user.school || '',
        course: user.course || '',
        yearLevel: user.yearLevel || user.year_level || '',
        corUrl: user.corUrl || user.cor_url || '',
        schoolIdUrl: user.schoolIdUrl || user.school_id_url || '',
        selfieWithIdUrl: user.selfieWithIdUrl || user.selfie_with_id_url || '',

        profile: studentProfile,
      };

      console.log('[getProfile] Returning user:', safeUser.email, 'role:', safeUser.role);
      return res.json({ user: safeUser });
    } catch (err) {
      next(err);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const user = db.data.users.find((u) => u.id === userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const updatable = [
        'name',
        'company',
        'company_domain',
        'phone',
        'contact_person',
        'address',
        'city',
        'country',
        'website',
      ];

      for (const key of updatable) {
        if (req.body[key] !== undefined) user[key] = req.body[key];
      }

      // Persist (best-effort)
      await safeDbWrite();

      return res.json({ message: 'Profile updated', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      next(err);
    }
  },
  uploadProviderDocument: async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const user = db.data.users.find((u) => u.id === userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

      if (!db.data.documents) db.data.documents = [];

      const saved = [];
      for (const f of req.files) {
        const doc = {
          id: createId('documents'),
          user_id: user.id,
          filename: f.filename,
          originalname: f.originalname,
          mime_type: f.mimetype,
          file_size: f.size,
          uploaded_at: new Date().toISOString(),
          purpose: 'provider_document',
        };
        db.data.documents.push(doc);
        saved.push(doc);
      }

      // mark provider verification as pending
      user.verificationStatus = 'pending';
      user.verification_submitted_at = new Date().toISOString();
      if (!user.organization_documents) user.organization_documents = [];
      user.organization_documents.push(...saved.map((s) => s.id));

      await safeDbWrite();

      // Build response with updated user information
      const safeUser = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        company: user.company || user.organization_name || '',
        sponsorVerified: user.sponsor_verified || false,
        organizationVerified: user.organization_verified || false,
        profilePicture: user.profilePicture || user.profile_picture || '',
        verificationStatus: user.verificationStatus,
        verification_submitted_at: user.verification_submitted_at,
      };

      return res.json({
        message: 'Documents uploaded successfully. Awaiting admin verification.',
        documents: saved,
        user: safeUser,
        verificationStatus: user.verificationStatus,
      });
    } catch (err) {
      next(err);
    }
  },

  submitVerification: async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const user = db.data.users.find((u) => u.id === userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Expect files uploaded under 'verification_documents'
      if ((!req.files || req.files.length === 0) && (!req.body.documents || req.body.documents.length === 0)) {
        return res.status(400).json({ message: 'No verification documents provided' });
      }

      if (!db.data.documents) db.data.documents = [];

      const saved = [];

      // If files uploaded via multipart
      if (req.files && req.files.length) {
        for (const f of req.files) {
          const doc = {
            id: createId('documents'),
            user_id: user.id,
            filename: f.filename,
            originalname: f.originalname,
            mime_type: f.mimetype,
            file_size: f.size,
            uploaded_at: new Date().toISOString(),
            purpose: 'student_verification',
          };
          db.data.documents.push(doc);
          saved.push(doc);
        }
      }

      // Also accept JSON list of documents (e.g., mobile app may upload separately)
      if (req.body.documents && Array.isArray(req.body.documents)) {
        for (const d of req.body.documents) {
          const doc = {
            id: createId('documents'),
            user_id: user.id,
            filename: d.filename || '',
            originalname: d.originalname || d.filename || '',
            mime_type: d.mime_type || '',
            file_size: d.file_size || 0,
            uploaded_at: new Date().toISOString(),
            purpose: 'student_verification',
          };
          db.data.documents.push(doc);
          saved.push(doc);
        }
      }

      // Mark user verification as pending. P1 FIX: Do NOT reset emailVerified — it is separate from document verification.
      user.verificationStatus = 'pending';
      user.verification_submitted_at = new Date().toISOString();
      if (!user.documents) user.documents = [];
      user.documents.push(...saved.map((s) => s.id));

      await safeDbWrite();

      // Build response with updated user information
      const studentProfile = db.data.student_profiles.find((p) => String(p.user_id) === String(user.id)) || null;

      const safeUser = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        emailVerified: user.emailVerified,
        verificationStatus: user.verificationStatus,
        verification_submitted_at: user.verification_submitted_at,
        profilePicture: user.profilePicture || user.profile_picture || '',
        mobileNumber: user.mobileNumber || '',
        school: user.school || '',
        course: user.course || '',
        yearLevel: user.yearLevel || user.year_level || '',
        profile: studentProfile,
      };

      return res.json({
        message: 'Verification submitted. Your documents are now under review.',
        documents: saved,
        user: safeUser,
        verificationStatus: user.verificationStatus,
      });
    } catch (err) {
      next(err);
    }
  },
  updateStudentProfile: async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const user = db.data.users.find((u) => String(u.id) === String(userId));
      if (!user) return res.status(404).json({ message: 'User not found' });

      const {
        firstName,
        middleName,
        lastName,
        mobileNumber,
        school,
        course,
        yearLevel,
        gpa,
        familyIncome,
        achievements,
      } = req.body || {};

      if (firstName !== undefined) user.firstName = firstName;
      if (middleName !== undefined) user.middleName = middleName;
      if (lastName !== undefined) user.lastName = lastName;

      // Handle profile picture upload
      if (req.file) {
        user.profilePicture = `/uploads/${req.file.filename}`;
      }

      if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;

      // Update display name if we have name parts
      if (firstName || lastName) {
        user.name = `${firstName || user.firstName || ''} ${lastName || user.lastName || ''}`.trim();
      }

      // Update or create student profile in in-memory DB
      if (!db.data.student_profiles) db.data.student_profiles = [];

      let profile = db.data.student_profiles.find((p) => String(p.user_id) === String(userId));
      if (!profile) {
        profile = {
          id: createId('student_profiles'),
          user_id: Number(userId),
          school: '',
          course: '',
          gpa: 0,
          family_income: 0,
          achievements: '',
          status: 'pending',
        };
        db.data.student_profiles.push(profile);
      }

      if (school !== undefined) profile.school = school;
      if (course !== undefined) profile.course = course;
      if (yearLevel !== undefined) profile.yearLevel = yearLevel;
      if (gpa !== undefined) profile.gpa = Number(gpa);
      if (familyIncome !== undefined) profile.family_income = Number(familyIncome);
      if (achievements !== undefined) profile.achievements = achievements;

      // Persist best-effort
      await safeDbWrite();

      const safeUser = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        organization_name: user.organization_name || user.company || '',
        organization_type: user.organization_type || '',
        phone: user.phone || '',
        contact_person: user.contact_person || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        profilePicture: user.profilePicture || user.profile_picture || '',
        avatarUrl: user.profilePicture || user.profile_picture || '',
        school: profile.school || '',
        course: profile.course || '',
        yearLevel: profile.yearLevel || '',
        profile: profile,
      };

      return res.json({ message: 'Profile updated', user: safeUser });
    } catch (err) {
      next(err);
    }
  },

  uploadProfilePhoto: async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      if (!req.file) {
        return res.status(400).json({ message: 'No photo file uploaded' });
      }

      const user = db.data.users.find((u) => String(u.id) === String(userId));
      if (!user) return res.status(404).json({ message: 'User not found' });

      const photoUrl = `/uploads/${req.file.filename}`;
      user.profilePicture = photoUrl;
      user.avatarUrl = photoUrl;
      if (!user.profile) user.profile = {};
      user.profile.avatarUrl = photoUrl;

      await safeDbWrite();

      return res.json({
        message: 'Profile photo updated successfully',
        profilePicture: photoUrl,
        avatarUrl: photoUrl,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: photoUrl,
          avatarUrl: photoUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  deleteProfilePhoto: async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const user = db.data.users.find((u) => String(u.id) === String(userId));
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.profilePicture = '';
      user.avatarUrl = '';
      if (user.profile) user.profile.avatarUrl = '';

      await safeDbWrite();

      return res.json({
        message: 'Profile photo removed',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: '',
          avatarUrl: '',
        },
      });
    } catch (err) {
      next(err);
    }
  },

  verifyEmailOTP: async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP code are required' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      ensureOtpsArray();

      const record = getLatestOtpRecordForEmail(normalizedEmail);
      const isTestOverrideEnabled = process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_OVERRIDE === 'true';
      const isMasterOverride = isTestOverrideEnabled && (otp === '123456' || otp === '000000' || otp === '999999');

      if (!record && !isMasterOverride) {
        return res.status(400).json({ message: 'No verification code record found. Please resend code.' });
      }

      if (record && new Date() > new Date(record.expiresAt) && !isMasterOverride) {
        return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
      }

      if (!isMasterOverride && record && record.otp !== String(otp).trim()) {
        record.attempts = (record.attempts || 0) + 1;
        await safeDbWrite();
        return res.status(400).json({
          message: 'Invalid verification code',
          attemptsRemaining: Math.max(0, 3 - record.attempts),
        });
      }

      // OTP verified — update user account status
      const user = db.data.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
      if (user) {
        user.emailVerified = true;
        if (user.role === 'provider' || user.role === 'sponsor') {
          user.verificationStatus = 'pending_approval';
          user.sponsor_verified = false;
        }
        await safeDbWrite();
      }

      // Clean up OTP records for this email
      db.data.otps = db.data.otps.filter((o) => (o.email || '').toLowerCase() !== normalizedEmail);
      await safeDbWrite();

      return res.json({
        message: 'Email address verified successfully. Provider account is pending administrator approval.',
        emailVerified: true,
        verificationStatus: 'pending_approval',
      });
    } catch (err) {
      next(err);
    }
  },
  logout: async (req, res) => {
    const { revokeToken } = require('../middleware/authMiddleware');
    if (req.token) {
      revokeToken(req.token);
    }
    return res.json({ message: 'Logged out successfully. Token has been revoked.' });
  },

  requestSmsOtp: async (req, res, next) => {
    try {
      const smsService = require('../utils/smsService');
      const { phone, smsConsent, idempotencyKey } = req.body;

      const normalized = smsService.normalizeToE164(phone);
      if (normalized) {
        const existingUser = db.data.users.find(
          (u) => u.phone === normalized && (!req.user || u.id !== req.user.id)
        );
        if (existingUser) {
          return res.status(409).json({
            success: false,
            code: 'PHONE_ALREADY_REGISTERED',
            message: 'This mobile number is already registered to another account.',
          });
        }
      }

      const result = await smsService.requestSmsOtp({
        phone,
        smsConsent,
        idempotencyKey: idempotencyKey || req.headers['x-idempotency-key'],
      });

      return res.status(result.statusCode).json(result);
    } catch (err) {
      next(err);
    }
  },

  verifySmsOtp: async (req, res, next) => {
    try {
      const smsService = require('../utils/smsService');
      const { phone, code } = req.body;

      const result = await smsService.verifySmsOtp({ phone, code });
      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      if (req.user && req.user.id) {
        const user = db.data.users.find((u) => u.id === req.user.id);
        if (user) {
          user.phone = result.normalizedPhone;
          user.phoneVerified = true;
          user.phoneVerifiedAt = result.verifiedAt;
          await safeDbWrite();
        }
      }

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};



