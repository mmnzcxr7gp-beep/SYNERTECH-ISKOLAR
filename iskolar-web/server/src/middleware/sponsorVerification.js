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
    const legacyUser = db.data?.users?.find((u) => u.id === req.user.id) || null;
    let provider = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        provider = await Provider.findOne({ userId: req.user.id }).lean();
      } catch { /* Mongoose unavailable — fall back to legacy */ }
    }

    if (!legacyUser && !provider) {
      return res.status(403).json({ message: 'Provider not found' });
    }

    // If this is a migrated/new provider record use the Mongo provider verification state.
    const sponsorVerified = provider ? !!provider.isVerified : !!legacyUser.sponsor_verified;
    const orgVerified = provider ? !!provider.isVerified : !!legacyUser.organization_verified;
    const hasOrgProof = provider
      ? true
      : !!legacyUser.organization_documents && legacyUser.organization_documents.length;

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
