#!/usr/bin/env node
/**
 * Gmail OTP Sender & Transport Verification Script
 * Validates Nodemailer SMTP authentication using iskolar.official@gmail.com
 * and tests OTP email dispatch across registration, login, and verification flows.
 */

require('dotenv').config();
const assert = require('assert');
const { sendOtpEmail, sendMail } = require('../src/utils/emailService');

async function verifyGmailSender() {
  console.log('========================================================');
  console.log('📧 VERIFYING GMAIL OTP SENDER CONFIGURATION');
  console.log('========================================================\n');

  console.log(`Configured EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`Configured EMAIL_FROM: ${process.env.EMAIL_FROM}`);

  assert.strictEqual(process.env.EMAIL_USER, 'iskolar.official@gmail.com', 'EMAIL_USER must be set to iskolar.official@gmail.com');
  assert.ok(process.env.EMAIL_PASSWORD, 'EMAIL_PASSWORD must be configured in environment');

  // Test 1: Send Student Registration OTP
  console.log('\n--- 1. Testing Student Registration OTP Email ---');
  const otpResult = await sendOtpEmail('iskolar.official@gmail.com', '654321');
  assert.ok(otpResult, 'OTP Email dispatch returned true');
  console.log('✓ Student registration OTP email dispatched successfully');

  // Test 2: Send Student Login MFA OTP
  console.log('\n--- 2. Testing Student Login MFA OTP Email ---');
  const mfaResult = await sendOtpEmail('iskolar.official@gmail.com', '987654');
  assert.ok(mfaResult, 'MFA OTP Email dispatch returned true');
  console.log('✓ Student login MFA OTP email dispatched successfully');

  // Test 3: Send Password Reset OTP
  console.log('\n--- 3. Testing Password Reset OTP Email ---');
  const resetResult = await sendMail({
    to: 'iskolar.official@gmail.com',
    subject: 'Your ISKOLAR Password Reset Verification Code: 112233',
    html: '<h3>Password Reset Request</h3><p>Your verification code is: <strong>112233</strong></p>',
  });
  assert.ok(resetResult, 'Password Reset Email dispatch returned true');
  console.log('✓ Password reset OTP email dispatched successfully');

  console.log('\n========================================================');
  console.log('✅ GMAIL OTP SENDER CONFIGURATION VERIFIED SUCCESSFULLY!');
  console.log('========================================================\n');
}

verifyGmailSender().catch((err) => {
  console.error('❌ Gmail OTP Sender Verification Failed:', err);
  process.exit(1);
});
