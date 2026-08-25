const jwt = require('jsonwebtoken');

const _getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  const invalidPlaceholders = [
    'iskolar-dev-secret-key',
    'iskolar-dev-secret-key-2024',
    'replace-with-a-long-random-secret',
    'secret',
    '123456',
  ];

  if (isProd) {
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production');
    }
    if (invalidPlaceholders.includes(secret) || secret.length < 16) {
      throw new Error('FATAL: JWT_SECRET must be a secure random secret (min 16 chars) and not a placeholder');
    }
  }

  return secret || 'iskolar-dev-secret-key';
};

const revokedTokens = new Set();

const revokeToken = (token) => {
  if (token) revokedTokens.add(token);
};

const isTokenRevoked = (token) => {
  return revokedTokens.has(token);
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  if (isTokenRevoked(token)) {
    return res.status(401).json({ message: 'Token has been revoked upon logout' });
  }

  try {
    const decoded = jwt.verify(token, _getJwtSecret());
    if (decoded && decoded.purpose === 'mfa') {
      return res.status(401).json({ message: 'Intermediate MFA token cannot be used to access authenticated routes. Please complete MFA verification.' });
    }
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (isTokenRevoked(token)) {
      return next();
    }
    try {
      const decoded = jwt.verify(token, _getJwtSecret());
      if (decoded && decoded.purpose !== 'mfa') {
        req.user = decoded;
        req.token = token;
      }
    } catch (_) {}
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  revokeToken,
  isTokenRevoked,
};
