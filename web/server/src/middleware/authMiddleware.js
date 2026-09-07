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

// Fast local bounded cache (max 5,000 entries) for low-latency lookups
const localRevokedTokens = new Set();
const MAX_LOCAL_CACHE = 5000;

const revokeToken = async (token, meta = {}) => {
  if (!token) return;

  // Maintain local bounded cache
  if (localRevokedTokens.size >= MAX_LOCAL_CACHE) {
    const firstKey = localRevokedTokens.values().next().value;
    localRevokedTokens.delete(firstKey);
  }
  localRevokedTokens.add(token);

  const expiresAt = meta.expiresAt || (meta.exp ? new Date(meta.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000));
  const userId = meta.userId ? String(meta.userId) : null;
  const reason = meta.reason || 'logout';

  // Persist to MongoDB RevokedToken collection with TTL index
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const { RevokedToken } = require('../models');
      if (RevokedToken) {
        await RevokedToken.findOneAndUpdate(
          { token },
          { token, userId, reason, expiresAt },
          { upsert: true, new: true }
        );
      }
    } else {
      const { db } = require('../config/db');
      if (db.collections?.revokedtokens) {
        await db.collections.revokedtokens.updateOne(
          { token },
          { $set: { token, userId, reason, expiresAt } },
          { upsert: true }
        );
      }
    }
  } catch (err) {
    console.error('RevokedToken database persistence failure:', err?.message);
    const persistErr = new Error(`Failed to persist token revocation: ${err?.message}`);
    persistErr.code = 'REVOCATION_PERSISTENCE_FAILURE';
    throw persistErr;
  }

  // Disconnect active Socket.IO connection immediately
  if (global._io) {
    try {
      for (const [id, socket] of global._io.of('/').sockets) {
        const matchToken = socket.token === token;
        const matchUser = userId && socket.user && String(socket.user.id) === userId;
        if (matchToken || matchUser) {
          socket.emit('session_revoked', { reason });
          socket.disconnect(true);
        }
      }
    } catch (_) {}
  }
};

const revokeUserTokens = async (userId, reason = 'account_suspension') => {
  if (!userId) return;
  const targetId = String(userId);

  // Disconnect any active Socket.IO sessions for this user
  if (global._io) {
    try {
      for (const [id, socket] of global._io.of('/').sockets) {
        if (socket.user && String(socket.user.id) === targetId) {
          socket.emit('session_revoked', { reason });
          socket.disconnect(true);
        }
      }
    } catch (_) {}
  }

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const { RevokedToken } = require('../models');
      if (RevokedToken) {
        await RevokedToken.create({
          token: `user_revoked_${targetId}_${Date.now()}`,
          userId: targetId,
          reason,
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        });
      }
    } else {
      const { db } = require('../config/db');
      if (db.collections?.revokedtokens) {
        await db.collections.revokedtokens.insertOne({
          token: `user_revoked_${targetId}_${Date.now()}`,
          userId: targetId,
          reason,
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        });
      }
    }
  } catch (err) {
    console.error('RevokeUserTokens persistence failure:', err?.message);
    const persistErr = new Error(`Failed to persist user token revocation: ${err?.message}`);
    persistErr.code = 'REVOCATION_PERSISTENCE_FAILURE';
    throw persistErr;
  }
};

const isTokenRevoked = async (token) => {
  if (!token) return true;
  if (process.env.NODE_ENV === 'test' && global._simulatedStoreOutage && (global._simulatedStoreOutage === 'revocation' || global._simulatedStoreOutage === 'all')) {
    const storeErr = new Error('Simulated revocation store failure');
    storeErr.code = 'SECURITY_STORE_FAILURE';
    throw storeErr;
  }
  if (localRevokedTokens.has(token)) return true;

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const { RevokedToken } = require('../models');
      if (RevokedToken) {
        const found = await RevokedToken.findOne({ token }).lean();
        if (found) {
          localRevokedTokens.add(token);
          return true;
        }
      }
    } else {
      const { db } = require('../config/db');
      if (db.collections?.revokedtokens) {
        const found = await db.collections.revokedtokens.findOne({ token });
        if (found) {
          localRevokedTokens.add(token);
          return true;
        }
      }
    }
  } catch (err) {
    console.error('Revocation store lookup error:', err.message);
    // Security store failure: In strict mode or production, fail closed rather than weakening checks
    const storeErr = new Error(`Security store lookup failed: ${err.message}`);
    storeErr.code = 'SECURITY_STORE_FAILURE';
    throw storeErr;
  }
  return false;
};

const isTokenRevokedSync = (token) => {
  if (!token) return true;
  return localRevokedTokens.has(token);
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    if (await isTokenRevoked(token)) {
      return res.status(401).json({ message: 'Token has been revoked upon logout' });
    }
  } catch (storeErr) {
    // Fail-Closed Security Policy: Do not authenticate tokens when the security store is unreachable
    return res.status(503).json({ message: 'Security store unavailable. Authentication verification failed closed.' });
  }

  try {
    const decoded = jwt.verify(token, _getJwtSecret());
    if (decoded && decoded.purpose === 'mfa') {
      return res.status(401).json({ message: 'Intermediate MFA token cannot be used to access authenticated routes. Please complete MFA verification.' });
    }

    // Live Account Status Validation (Suspended / Deactivated / Deleted)
    // Authoritative scoped MongoDB query with projection (no db.data snapshot fallback)
    let liveUser = null;
    try {
      if (process.env.NODE_ENV === 'test' && global._simulatedStoreOutage && (global._simulatedStoreOutage === 'account' || global._simulatedStoreOutage === 'all')) {
        const storeErr = new Error('Simulated account store connection outage');
        storeErr.code = 'ACCOUNT_STORE_FAILURE';
        throw storeErr;
      }
      const { db } = require('../config/db');
      if (db.collections?.users && decoded && decoded.id) {
        const targetId = decoded.id;
        const numId = Number(targetId);
        const query = {
          $or: [
            { id: targetId },
            ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
            { _id: targetId },
            ...(decoded.email ? [{ email: decoded.email.toLowerCase() }] : []),
          ],
        };
        liveUser = await db.collections.users.findOne(query, {
          projection: {
            accountStatus: 1,
            isSuspended: 1,
            isDeleted: 1,
            deletionReason: 1,
            suspensionReason: 1,
            rejectionReason: 1,
          },
        });
      } else {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1 && decoded && decoded.id) {
          const { User } = require('../models');
          if (User) {
            liveUser = await User.findById(decoded.id)
              .select('accountStatus isSuspended isDeleted deletionReason suspensionReason rejectionReason')
              .lean();
          }
        }
      }
    } catch (storeErr) {
      console.error('Security store account verification error:', storeErr.message);
      return res.status(503).json({
        message: 'Security store unavailable for account verification. Access denied.',
        code: 'ACCOUNT_STORE_FAILURE',
      });
    }

    if (liveUser) {
      if (liveUser.isDeleted || ['DELETION_PENDING', 'DELETED', 'ARCHIVED'].includes(liveUser.accountStatus)) {
        return res.status(403).json({
          message: 'Account has been deactivated or scheduled for deletion.',
          code: 'ACCOUNT_DELETED',
          deletionReason: liveUser.deletionReason || null,
        });
      }
      if (liveUser.accountStatus === 'REJECTED') {
        return res.status(403).json({
          message: 'Account registration was rejected by administrator.',
          code: 'ACCOUNT_REJECTED',
          rejectionReason: liveUser.rejectionReason || null,
        });
      }
      if (liveUser.isSuspended || liveUser.accountStatus === 'SUSPENDED') {
        return res.status(403).json({
          message: 'Account is suspended. Access to resources is prohibited.',
          code: 'ACCOUNT_SUSPENDED',
          suspensionReason: liveUser.suspensionReason || null,
        });
      }
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (await isTokenRevoked(token)) {
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
  revokeUserTokens,
  isTokenRevoked,
  isTokenRevokedSync,
};
