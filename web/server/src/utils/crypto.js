const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'iskolar-default-aes-256-encryption-key';

// Derive 32-byte key using SHA-256
const KEY = crypto.createHash('sha256').update(String(SECRET_KEY)).digest();

/**
 * Encrypts sensitive string using AES-256-GCM.
 * @param {string} text
 * @returns {string} iv:authTag:ciphertext (base64)
 */
function encryptField(text) {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith('enc:')) return text; // Already encrypted

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted string.
 * @param {string} encryptedText
 * @returns {string}
 */
function decryptField(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.startsWith('enc:')) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.substring(4).split(':');
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err?.message);
    return encryptedText;
  }
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * @returns {string}
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

module.exports = {
  encryptField,
  decryptField,
  generateSecureOTP,
};
