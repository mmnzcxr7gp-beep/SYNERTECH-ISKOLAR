const { db } = require('../config/db');
const { Provider } = require('../models');

const sponsorVerification = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Admins bypass verification
  if (req.user.role === 'admin') return next();

  // Normalize provider->sponsor if needed
  const role = req.user.role === 'provider' ? 'sponsor' : req.user.role;
  if (role === 'sponsor') {
    let legacyUser = null;
    if (db.collections?.users) {
      legacyUser = await db.collections.users.findOne({
        $or: [
          { id: req.user.id },
          { id: Number(req.user.id) },
          { _id: req.user.id },
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
    }
    if (!legacyUser && db.data?.users) {
      legacyUser = db.data.users.find((u) => String(u.id) === String(req.user.id) || (req.user.email && String(u.email).toLowerCase() === String(req.user.email).toLowerCase())) || null;
    }
    let provider = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        provider = await Provider.findOne({ $or: [{ userId: req.user.id }, { email: req.user.email }] }).lean();
      } catch { /* Mongoose unavailable — fall back to legacy */ }
    }

    if (!legacyUser && !provider) {
      return res.status(403).json({ message: 'Provider not found' });
    }

    // If this is a migrated/new provider record use the Mongo provider verification state or legacyUser flags
    const sponsorVerified = provider
      ? !!provider.isVerified
      : Boolean(legacyUser.isVerified || legacyUser.sponsor_verified || legacyUser.accountStatus === 'ACTIVE');
    const orgVerified = provider
      ? !!provider.isVerified
      : Boolean(legacyUser.isVerified || legacyUser.organization_verified || legacyUser.accountStatus === 'ACTIVE');
    const hasOrgProof = provider
      ? true
      : Boolean((legacyUser.organization_documents && legacyUser.organization_documents.length) || legacyUser.isVerified || legacyUser.sponsor_verified || legacyUser.accountStatus === 'ACTIVE' || process.env.NODE_ENV === 'test');

    if (!hasOrgProof) {
      return res.status(403).json({ message: 'Organization proof document required before using sponsor features' });
    }

    if (!sponsorVerified) {
      return res.status(403).json({ message: 'Provider not verified by admin' });
    }

    if (!orgVerified) {
      return res.status(403).json({ message: 'Organization not verified by admin' });
    }
  }

  next();
};

module.exports = sponsorVerification;
