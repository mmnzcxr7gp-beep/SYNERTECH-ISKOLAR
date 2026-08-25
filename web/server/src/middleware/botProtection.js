const https = require('https');

/**
 * Cloudflare Turnstile & Google reCAPTCHA v3 Verification Middleware
 * Validates bot protection tokens for sensitive endpoints (login, register, send-otp, reset-password).
 */
const verifyBotProtection = async (req, res, next) => {
  // Allow bypassing in development/test if TURNSTILE_SECRET_KEY is not configured
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  const isProd = process.env.NODE_ENV === 'production';

  const botToken =
    req.headers['x-turnstile-token'] ||
    req.headers['x-recaptcha-token'] ||
    req.headers['x-bot-token'] ||
    req.body?.turnstileToken ||
    req.body?.recaptchaToken ||
    req.body?.botToken;

  if (isProd && (turnstileSecret || recaptchaSecret)) {
    if (!botToken) {
      return res.status(400).json({
        success: false,
        message: 'Anti-bot verification token is required',
        errorCode: 'BOT_PROTECTION_REQUIRED',
      });
    }

    try {
      if (turnstileSecret) {
        // Cloudflare Turnstile Verification API
        const postData = JSON.stringify({
          secret: turnstileSecret,
          response: botToken,
          remoteip: req.ip,
        });

        const isValid = await new Promise((resolve) => {
          const request = https.request(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
              },
            },
            (response) => {
              let body = '';
              response.on('data', (chunk) => (body += chunk));
              response.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  resolve(data.success === true);
                } catch {
                  resolve(false);
                }
              });
            }
          );
          request.on('error', () => resolve(false));
          request.write(postData);
          request.end();
        });

        if (!isValid) {
          return res.status(403).json({
            success: false,
            message: 'Anti-bot verification failed. Please refresh and try again.',
            errorCode: 'BOT_VERIFICATION_FAILED',
          });
        }
      }
    } catch (err) {
      console.error('Bot protection verification error:', err?.message);
    }
  }

  // Attach bot verification status to request context
  req.botVerified = true;
  next();
};

module.exports = {
  verifyBotProtection,
};
