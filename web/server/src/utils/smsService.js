/**
 * SMS OTP Service Abstraction for ISKOLAR
 * 
 * Supports Twilio Verify when credentials are provided, with strict security controls:
 * - E.164 Phone Normalization
 * - Explicit SMS Consent Validation
 * - Masked Destination in Responses
 * - Single-use OTP Lifecycle
 * - Resend Cooldown (60s)
 * - Expiration (5 minutes)
 * - Attempt Limits (max 3 attempts)
 * - Safe Fallback when SMS_ENABLED=false (SMS_NOT_CONFIGURED)
 * - Zero OTP leakage in logs or responses
 */

const crypto = require('crypto');

// In-memory tracking for cooldowns, attempts, and verification state
const phoneRateLimits = new Map(); // phone -> { lastSentAt, sendCount }
const activeSmsOtps = new Map();   // phone -> { otpHash, expiresAt, attempts, verified, consentAt, idempotencyKey }

const COOLDOWN_MS = 60 * 1000;         // 60 seconds
const EXPIRATION_MS = 5 * 60 * 1000;   // 5 minutes
const MAX_ATTEMPTS = 3;

/**
 * Normalizes phone numbers to standard E.164 format.
 * Defaults to Philippines (+63) for local 10/11-digit numbers starting with 09 or 9.
 */
function normalizeToE164(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Remove spaces, dashes, parentheses
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Philippine format: +639XXXXXXXXX
  if (/^\+639\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Philippine format: 09XXXXXXXXX (11 digits)
  if (/^09\d{9}$/.test(cleaned)) {
    return `+63${cleaned.substring(1)}`;
  }

  // Philippine format without leading zero: 9XXXXXXXXX (10 digits)
  if (/^9\d{9}$/.test(cleaned)) {
    return `+63${cleaned}`;
  }

  // Standard International format with leading +
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned;
  }

  // International format without leading + (11 to 15 digits)
  if (/^[1-9]\d{10,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}

/**
 * Masks destination phone for safe client display
 * e.g. +639171234567 -> +63 ••• ••• 4567
 */
function maskPhoneNumber(e164Phone) {
  if (!e164Phone || typeof e164Phone !== 'string') return '';
  const len = e164Phone.length;
  if (len <= 4) return '••••';
  const lastFour = e164Phone.slice(-4);
  const countryCode = e164Phone.slice(0, Math.min(3, len - 4));
  return `${countryCode} ••• ••• ${lastFour}`;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 */
function generateSecureOtp() {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Hashes OTP for secure in-memory or DB storage
 */
function hashOtp(otp, salt) {
  return crypto.createHmac('sha256', salt || 'iskolar_sms_salt').update(otp).digest('hex');
}

/**
 * Checks if SMS is enabled in environment configuration
 */
function isSmsEnabled() {
  return (
    process.env.SMS_ENABLED === 'true' &&
    Boolean(process.env.TWILIO_ACCOUNT_SID) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN) &&
    Boolean(process.env.TWILIO_VERIFY_SERVICE_SID)
  );
}

/**
 * Requests an SMS OTP with consent and rate limiting
 */
async function requestSmsOtp({ phone, smsConsent, idempotencyKey }) {
  // 1. Consent Validation
  if (smsConsent !== true && smsConsent !== 'true') {
    return {
      success: false,
      statusCode: 400,
      code: 'CONSENT_REQUIRED',
      message: 'Explicit consent to receive SMS notifications and verification codes is required.',
    };
  }

  // 2. Format Validation & Normalization
  const normalizedPhone = normalizeToE164(phone);
  if (!normalizedPhone) {
    return {
      success: false,
      statusCode: 400,
      code: 'INVALID_PHONE_FORMAT',
      message: 'Please provide a valid mobile phone number in E.164 format (e.g. +639171234567 or 09171234567).',
    };
  }

  const now = Date.now();

  // 3. Idempotency Check
  const existingOtp = activeSmsOtps.get(normalizedPhone);
  if (
    idempotencyKey &&
    existingOtp &&
    existingOtp.idempotencyKey === idempotencyKey &&
    existingOtp.expiresAt > now &&
    now - (existingOtp.lastSentAt || 0) < COOLDOWN_MS
  ) {
    return {
      success: true,
      statusCode: 200,
      code: 'OTP_SENT_IDEMPOTENT',
      message: 'Verification code already sent. Please check your mobile messages.',
      maskedPhone: maskPhoneNumber(normalizedPhone),
      expiresIn: Math.round((existingOtp.expiresAt - now) / 1000),
      smsConfigured: isSmsEnabled(),
    };
  }

  // 4. Cooldown Check
  const rateLimit = phoneRateLimits.get(normalizedPhone);
  if (rateLimit && now - rateLimit.lastSentAt < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - rateLimit.lastSentAt)) / 1000);
    return {
      success: false,
      statusCode: 429,
      code: 'RESEND_COOLDOWN_ACTIVE',
      message: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
      retryAfter: remainingSeconds,
    };
  }

  // 5. Provider Execution or Safe Fallback
  const isConfigured = isSmsEnabled();

  if (isConfigured) {
    try {
      // Real Twilio Verify API dispatch
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      const twilio = require('twilio')(accountSid, authToken);
      await twilio.verify.v2.services(serviceSid)
        .verifications
        .create({ to: normalizedPhone, channel: 'sms' });

      // Record rate limit & active session (Twilio manages the actual OTP code)
      phoneRateLimits.set(normalizedPhone, { lastSentAt: now, sendCount: (rateLimit?.sendCount || 0) + 1 });
      activeSmsOtps.set(normalizedPhone, {
        isTwilioVerify: true,
        expiresAt: now + EXPIRATION_MS,
        attempts: 0,
        consentAt: new Date().toISOString(),
        idempotencyKey,
        lastSentAt: now,
      });

      return {
        success: true,
        statusCode: 200,
        code: 'OTP_SENT',
        message: 'SMS verification code sent successfully.',
        maskedPhone: maskPhoneNumber(normalizedPhone),
        expiresIn: Math.round(EXPIRATION_MS / 1000),
        smsConfigured: true,
      };
    } catch (twilioError) {
      console.error('Twilio Verify Dispatch Error:', twilioError?.message || 'Provider failure');
      return {
        success: false,
        statusCode: 502,
        code: 'SMS_PROVIDER_ERROR',
        message: 'Unable to deliver SMS verification code at this time. Please try again or use email verification.',
      };
    }
  }

  // Unconfigured / Sandbox fallback
  // Generate local secure OTP for test assertion verification
  const generatedCode = generateSecureOtp();
  const expiresAt = now + EXPIRATION_MS;

  phoneRateLimits.set(normalizedPhone, { lastSentAt: now, sendCount: (rateLimit?.sendCount || 0) + 1 });
  activeSmsOtps.set(normalizedPhone, {
    isTwilioVerify: false,
    otpHash: hashOtp(generatedCode, normalizedPhone),
    // Expose in memory for unit test fixtures ONLY when ALLOW_TEST_OVERRIDE is true
    _testCode: process.env.ALLOW_TEST_OVERRIDE === 'true' || process.env.NODE_ENV === 'test' ? generatedCode : undefined,
    expiresAt,
    attempts: 0,
    consentAt: new Date().toISOString(),
    idempotencyKey,
    lastSentAt: now,
  });

  return {
    success: true,
    statusCode: 200,
    code: 'SMS_NOT_CONFIGURED',
    message: 'SMS provider is currently disabled or unconfigured in this environment. Verification code generated internally.',
    maskedPhone: maskPhoneNumber(normalizedPhone),
    expiresIn: Math.round(EXPIRATION_MS / 1000),
    smsConfigured: false,
    deliveryStatus: 'REAL SMS DELIVERY NOT VERIFIED',
  };
}

/**
 * Verifies the submitted SMS OTP
 */
async function verifySmsOtp({ phone, code }) {
  if (!code || typeof code !== 'string' || code.trim().length < 4) {
    return {
      success: false,
      statusCode: 400,
      code: 'INVALID_CODE',
      message: 'Please provide a valid verification code.',
    };
  }

  const normalizedPhone = normalizeToE164(phone);
  if (!normalizedPhone) {
    return {
      success: false,
      statusCode: 400,
      code: 'INVALID_PHONE_FORMAT',
      message: 'Invalid phone number format.',
    };
  }

  const record = activeSmsOtps.get(normalizedPhone);
  if (!record) {
    return {
      success: false,
      statusCode: 400,
      code: 'NO_ACTIVE_OTP',
      message: 'No active verification code found for this phone number. Please request a new code.',
    };
  }

  const now = Date.now();

  // 1. Expiration check
  if (record.expiresAt < now) {
    activeSmsOtps.delete(normalizedPhone);
    return {
      success: false,
      statusCode: 400,
      code: 'OTP_EXPIRED',
      message: 'Verification code has expired. Please request a new one.',
    };
  }

  // 2. Attempt limit check
  if (record.attempts >= MAX_ATTEMPTS) {
    activeSmsOtps.delete(normalizedPhone);
    return {
      success: false,
      statusCode: 429,
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Maximum verification attempts exceeded. Please request a new verification code.',
    };
  }

  record.attempts += 1;

  // 3. Real Twilio Verify check or Local Hash check
  if (record.isTwilioVerify && isSmsEnabled()) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      const twilio = require('twilio')(accountSid, authToken);
      const verificationCheck = await twilio.verify.v2.services(serviceSid)
        .verificationChecks
        .create({ to: normalizedPhone, code: code.trim() });

      if (verificationCheck.status === 'approved') {
        // Single use - consume record
        activeSmsOtps.delete(normalizedPhone);
        return {
          success: true,
          statusCode: 200,
          code: 'PHONE_VERIFIED',
          message: 'Phone number verified successfully.',
          normalizedPhone,
          verifiedAt: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          statusCode: 400,
          code: 'INCORRECT_CODE',
          message: 'Incorrect verification code. Please check and try again.',
          attemptsRemaining: Math.max(0, MAX_ATTEMPTS - record.attempts),
        };
      }
    } catch (err) {
      console.error('Twilio Verify Check Error:', err.message);
      return {
        success: false,
        statusCode: 502,
        code: 'PROVIDER_ERROR',
        message: 'Verification provider error. Please try again.',
      };
    }
  }

  // Local Hash comparison
  const submittedHash = hashOtp(code.trim(), normalizedPhone);
  if (record.otpHash === submittedHash) {
    // Single use - consume record
    activeSmsOtps.delete(normalizedPhone);
    return {
      success: true,
      statusCode: 200,
      code: 'PHONE_VERIFIED',
      message: 'Phone number verified successfully.',
      normalizedPhone,
      verifiedAt: new Date().toISOString(),
    };
  }

  return {
    success: false,
    statusCode: 400,
    code: 'INCORRECT_CODE',
    message: 'Incorrect verification code. Please check and try again.',
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - record.attempts),
  };
}

/**
 * Clears in-memory test states for clean test runs
 */
function resetSmsState() {
  phoneRateLimits.clear();
  activeSmsOtps.clear();
}

/**
 * Retrieves internal test code for automated testing suite only
 */
function getTestOtpForPhone(phone) {
  const normalized = normalizeToE164(phone);
  return activeSmsOtps.get(normalized)?._testCode || null;
}

module.exports = {
  normalizeToE164,
  maskPhoneNumber,
  isSmsEnabled,
  requestSmsOtp,
  verifySmsOtp,
  resetSmsState,
  getTestOtpForPhone,
};
