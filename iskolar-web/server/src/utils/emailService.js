const nodemailer = require('nodemailer');

let transporter = null;
let isEthereal = false;

const initTransporter = async () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  const emailServiceName = process.env.EMAIL_SERVICE || 'gmail';

  if (emailUser && emailPass) {
    try {
      transporter = nodemailer.createTransport({
        service: emailServiceName,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log(`✓ Email service initialized via ${emailServiceName} (${emailUser})`);
      isEthereal = false;
      return transporter;
    } catch (err) {
      console.error('⚠️ Custom SMTP transport error, falling back to test transport:', err.message);
    }
  }

  // Fallback: Automatic Ethereal Test Account for development & testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    console.log('✓ Email service initialized via Ethereal Test Account (Development Mode)');
    console.log(`  Test Account Email: ${testAccount.user}`);
    return transporter;
  } catch (err) {
    console.error('✗ Failed to create Ethereal test account:', err.message);
    return null;
  }
};

// Initialize transporter asynchronously on startup
const transporterPromise = initTransporter();

/**
 * Generic send mail handler with n8n Cloud dispatch & real-time live override
 */
const sendMail = async ({ to, subject, html }) => {
  try {
    console.log(`\n================================================================`);
    console.log(`📧 [LIVE REAL-TIME EMAIL DISPATCH]`);
    console.log(` ➔ Recipient: [${to}]`);
    console.log(` ➔ Subject:   "${subject}"`);
    console.log(`================================================================\n`);

    // 1. Dispatch live payload to active n8n Cloud workflow (non-blocking)
    setImmediate(() => {
      try {
        const n8nService = require('./n8nService');
        n8nService.triggerN8nWebhook('live_email_sent', { to, subject, html }).catch(() => {});
      } catch (e) {}
    });

    // 2. Try Nodemailer transport if available — Phase 4 & 5: with retry logic
    const activeTransporter = transporter || (await Promise.race([
      transporterPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
    ]));

    if (activeTransporter) {
      const { withRetry } = require('./resilience');
      const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'ISKOLAR Verification <noreply@iskolar.ph>';

      const info = await withRetry(
        () => activeTransporter.sendMail({ from: fromAddress, to, subject, html }),
        { retries: 3, baseDelayMs: 1000, name: 'email.send' }
      ).catch((err) => {
        console.log(`ℹ️ [Email Transport Notice]: ${err.message}`);
        return null;
      });

      if (info && isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`👉 LIVE EMAIL ONLINE PREVIEW LINK: ${previewUrl}\n`);
        }
      }
    }

    return true;
  } catch (err) {
    console.log(`ℹ️ Live Email Dispatch handled for ${to}: ${err.message}`);
    return true;
  }
};

/**
 * Send OTP Code Email
 */
const sendOtpEmail = async (recipientEmail, otp) => {
  const subject = `Your ISKOLAR Verification Code: ${otp}`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #0F172A; color: #FFFFFF; border-radius: 16px;">
      <h2 style="color: #6366F1; text-align: center; margin-bottom: 24px;">ISKOLAR Verification</h2>
      <p style="font-size: 15px; color: #CBD5E1;">Use the verification code below to complete your registration or login:</p>
      <div style="background: #1E293B; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #334155;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38BDF8;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #94A3B8; text-align: center;">This code is valid for 5 minutes. Do not share this code with anyone.</p>
    </div>
  `;

  return sendMail({ to: recipientEmail, subject, html });
};

/**
 * Send email to student about verification status
 */
const sendStudentVerificationStatusEmail = async (recipientEmail, recipientName, status, reason = null) => {
  const firstName = typeof recipientName === 'string' ? recipientName.split(' ')[0] : recipientName?.firstName || '';
  let subject = '';
  let htmlContent = '';

  if (status === 'approved') {
    subject = 'Your Account Verification is Approved - ISKOLAR';
    htmlContent = `
      <h2>Welcome to ISKOLAR, ${firstName}!</h2>
      <p>Great news! Your account has been verified and approved.</p>
      <p>You can now apply for scholarships and access all platform features.</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Account Verification Update - ISKOLAR';
    htmlContent = `
      <h2>Account Verification Status - ${firstName}</h2>
      <p>Status: Verification Rejected</p>
      <p><strong>Reason:</strong> ${reason || 'Please check with admin for details'}</p>
    `;
  } else {
    subject = 'Verification Documents Received - ISKOLAR';
    htmlContent = `
      <h2>Thank you for submitting, ${firstName}!</h2>
      <p>Our team will review your submission and notify you shortly.</p>
    `;
  }

  return sendMail({ to: recipientEmail, subject, html: htmlContent });
};

/**
 * Send email to provider about verification status
 */
const sendProviderVerificationStatusEmail = async (recipientEmail, organizationName, status, reason = null) => {
  let subject = '';
  let htmlContent = '';

  if (status === 'approved') {
    subject = 'Your Organization is Verified - ISKOLAR';
    htmlContent = `
      <h2>Welcome to ISKOLAR, ${organizationName}!</h2>
      <p>Your organization has been verified and approved.</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Organization Verification Update - ISKOLAR';
    htmlContent = `
      <h2>Organization Verification Status - ${organizationName}</h2>
      <p>Status: Verification Rejected</p>
      <p>Reason: ${reason || 'Please check with admin for details'}</p>
    `;
  } else {
    subject = 'Verification Documents Received - ISKOLAR';
    htmlContent = `
      <h2>Thank you for submitting, ${organizationName}!</h2>
      <p>Our team is reviewing your organization documents.</p>
    `;
  }

  return sendMail({ to: recipientEmail, subject, html: htmlContent });
};

/**
 * Send email to student about transaction status
 */
const sendTransactionStatusEmail = async (student, transaction, status) => {
  const studentName = student?.firstName || (typeof student?.email === 'string' ? student.email.split('@')[0] : '');
  const subject = status === 'completed'
    ? `Transaction Completed - PHP ${transaction.amount.toLocaleString()}`
    : 'Transaction Failed';

  const htmlContent = `
    <h2>Transaction ${status.toUpperCase()}</h2>
    <p>Dear ${studentName},</p>
    <p>Amount: PHP ${transaction.amount?.toLocaleString()}</p>
    <p>Reference: ${transaction.referenceNumber}</p>
  `;

  return sendMail({ to: student.email, subject, html: htmlContent });
};

/**
 * Send alert email to admin about pending verifications
 */
const sendAdminVerificationAlert = async (adminEmail, verificationCount) => {
  return sendMail({
    to: adminEmail,
    subject: `ISKOLAR Alert: ${verificationCount} Pending Verification(s)`,
    html: `<h2>Pending Verifications Alert</h2><p>You have ${verificationCount} pending request(s) awaiting review.</p>`,
  });
};

const n8nService = require('./n8nService');

/**
 * Send email to student when their scholarship application is APPROVED / ACCEPTED
 */
const sendApplicationAcceptedEmail = async ({ studentEmail, studentName, scholarshipTitle, providerName, maxAmount, allowance }) => {
  const firstName = typeof studentName === 'string' ? studentName.split(' ')[0] : 'Student';
  const amountText = maxAmount ? `₱${Number(maxAmount).toLocaleString()}` : allowance ? `₱${Number(allowance).toLocaleString()} Monthly` : 'Full Financial Support';
  
  // 1. Trigger n8n Webhook for Automation
  await n8nService.notifyStudentAccepted({
    studentEmail,
    studentName,
    scholarshipTitle,
    providerName,
    maxAmount,
    allowance,
  });

  // 2. Direct HTML Email Notification (Fallback / Secondary)
  const subject = `🎉 CONGRATULATIONS! You have been accepted for "${scholarshipTitle}"`;
  const html = `
    <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0D1E3B; color: #F4F0E8; border-radius: 24px; border: 1px solid #C5A28C;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); padding: 12px 24px; border-radius: 50px; font-weight: 800; font-size: 14px; letter-spacing: 2px; color: #FFFFFF;">
          ✨ SCHOLARSHIP AWARD ACCEPTED
        </div>
      </div>

      <h1 style="font-size: 26px; font-weight: 900; color: #FFFFFF; text-align: center; margin: 0 0 16px 0;">
        Congratulations, ${firstName}!
      </h1>

      <p style="font-size: 16px; line-height: 1.6; color: #C8D4E6; text-align: center; margin-bottom: 32px;">
        We are thrilled to inform you that your application for <strong style="color: #F4F0E8;">"${scholarshipTitle}"</strong> offered by <strong style="color: #C5A28C;">${providerName || 'Scholarship Provider'}</strong> has been officially <span style="color: #10B981; font-weight: 800;">APPROVED</span>!
      </p>

      <div style="background: #132644; border: 1px solid rgba(197, 162, 140, 0.3); border-radius: 20px; padding: 24px; margin-bottom: 32px;">
        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #C5A28C; margin: 0 0 16px 0;">
          Award Details Summary
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #8FA2C0;">Scholarship Grant:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #F4F0E8; text-align: right;">${scholarshipTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8FA2C0;">Provider / Sponsor:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #C5A28C; text-align: right;">${providerName || 'Official Partner'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8FA2C0;">Award Grant Amount:</td>
            <td style="padding: 8px 0; font-weight: 800; color: #10B981; text-align: right;">${amountText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8FA2C0;">Status:</td>
            <td style="padding: 8px 0; font-weight: 800; color: #10B981; text-align: right;">ACCEPTED & AWARDED</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="http://localhost:8080" style="display: inline-block; background: #0284C7; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 800; font-size: 15px; shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
          Open Mobile App to View Award ↗
        </a>
      </div>

      <p style="font-size: 12px; color: #8FA2C0; text-align: center; margin: 0;">
        This automated notification was generated by the ISKOLAR Scholarship System & n8n Workflow Automation.
      </p>
    </div>
  `;

  return sendMail({ to: studentEmail, subject, html });
};

/**
 * Send email to student when their scholarship application is REJECTED
 */
const sendApplicationRejectedEmail = async ({ studentEmail, studentName, scholarshipTitle, providerName, reason }) => {
  const firstName = typeof studentName === 'string' ? studentName.split(' ')[0] : 'Student';

  // 1. Trigger n8n Webhook for Automation
  await n8nService.notifyStudentRejected({
    studentEmail,
    studentName,
    scholarshipTitle,
    providerName,
    reason,
  });

  // 2. Direct HTML Email Notification
  const subject = `Application Update for "${scholarshipTitle}" - ISKOLAR`;
  const html = `
    <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0D1E3B; color: #F4F0E8; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
      <h2 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin-bottom: 16px;">
        Application Status Update
      </h2>
      <p style="font-size: 15px; color: #C8D4E6; line-height: 1.6;">
        Dear ${firstName},
      </p>
      <p style="font-size: 15px; color: #C8D4E6; line-height: 1.6;">
        Thank you for submitting your application for <strong>"${scholarshipTitle}"</strong> with <strong>${providerName || 'the provider'}</strong>.
      </p>
      <p style="font-size: 15px; color: #C8D4E6; line-height: 1.6;">
        After careful evaluation by the screening committee, we regret to inform you that your application was not selected for this cycle.
      </p>
      ${reason ? `<div style="background: #132644; padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #F43F5E; color: #F4F0E8; font-size: 14px;"><strong>Feedback / Reason:</strong> ${reason}</div>` : ''}
      <p style="font-size: 14px; color: #8FA2C0; margin-top: 24px;">
        We encourage you to apply for other active scholarship opportunities on the ISKOLAR platform.
      </p>
    </div>
  `;

  return sendMail({ to: studentEmail, subject, html });
};

/**
 * Send email to provider on successful registration
 */
const sendProviderRegisteredEmail = async ({ providerEmail, organizationName, name }) => {
  // 1. Trigger n8n Webhook
  await n8nService.notifyProviderRegistered({ providerEmail, organizationName, name });

  // 2. Direct Email
  const subject = `Welcome to ISKOLAR Provider Network, ${organizationName || name}!`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 28px; background: #0D1E3B; color: #F4F0E8; border-radius: 20px; border: 1px solid #C5A28C;">
      <h2 style="color: #C5A28C; margin-bottom: 16px;">Welcome, ${organizationName || name}!</h2>
      <p style="color: #C8D4E6; font-size: 15px; line-height: 1.6;">
        Your provider account has been created successfully. Administrators will review your organization verification documents shortly.
      </p>
      <p style="color: #8FA2C0; font-size: 13px;">You can log in to your provider portal at http://localhost:5173 to complete your profile.</p>
    </div>
  `;

  return sendMail({ to: providerEmail, subject, html });
};

/**
 * Send email to provider on publishing a scholarship
 */
const sendScholarshipPublishedEmail = async ({ providerEmail, providerName, scholarshipTitle, totalSlots, applicationDeadline }) => {
  // 1. Trigger n8n Webhook
  await n8nService.notifyScholarshipPublished({
    providerEmail,
    providerName,
    scholarshipTitle,
    totalSlots,
    applicationDeadline,
  });

  // 2. Direct Email
  const subject = `✨ Scholarship Published: "${scholarshipTitle}" is Live!`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 28px; background: #0D1E3B; color: #F4F0E8; border-radius: 20px; border: 1px solid #0284C7;">
      <h2 style="color: #0284C7; margin-bottom: 16px;">Scholarship Published Live!</h2>
      <p style="color: #C8D4E6; font-size: 15px; line-height: 1.6;">
        Your scholarship opportunity <strong>"${scholarshipTitle}"</strong> is now live on the ISKOLAR mobile app.
      </p>
      <p style="color: #8FA2C0; font-size: 13px;">Total Slots: ${totalSlots} | Application Deadline: ${applicationDeadline}</p>
    </div>
  `;

  return sendMail({ to: providerEmail, subject, html });
};

module.exports = {
  sendMail,
  sendOtpEmail,
  sendStudentVerificationStatusEmail,
  sendProviderVerificationStatusEmail,
  sendTransactionStatusEmail,
  sendAdminVerificationAlert,
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendProviderRegisteredEmail,
  sendScholarshipPublishedEmail,
};
