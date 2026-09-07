const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CREDENTIALS_FILE = path.join(__dirname, '../../.test_credentials.json');

/**
 * Generates or retrieves unique strong passwords for synthetic accounts.
 * Passwords are saved in a gitignored local test credential file.
 */
function getSyntheticCredentialsMap() {
  let creds = {};
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    } catch (_) {
      creds = {};
    }
  }

  const accountEmails = [
    'admin@iskolar.ph',
    'security.admin@iskolar.ph',
    'gokongwei.brothers@iskolar.ph',
    'ayala.foundation@iskolar.ph',
    'sm.foundation@iskolar.ph',
    'aboitiz.foundation@iskolar.ph',
    'megaworld.foundation@iskolar.ph',
    'juan.delacruz@iskolar.ph',
    'maria.santos@iskolar.ph',
    'joshua.reyes@iskolar.ph',
    'angelica.lopez@iskolar.ph',
    'christian.bautista@iskolar.ph',
  ];

  let modified = false;
  for (const email of accountEmails) {
    if (!creds[email] || typeof creds[email] !== 'string' || creds[email].length < 16) {
      // Generate a unique 24-character cryptographic password with mixed characters
      const randomPart = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, 'X');
      const uniquePass = `Iskolar#${randomPart}!9`;
      creds[email] = uniquePass;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
  }

  return creds;
}

function getSyntheticPasswordForEmail(email) {
  const map = getSyntheticCredentialsMap();
  const normalized = (email || '').trim().toLowerCase();
  return map[normalized] || null;
}

module.exports = {
  getSyntheticCredentialsMap,
  getSyntheticPasswordForEmail,
  CREDENTIALS_FILE
};
