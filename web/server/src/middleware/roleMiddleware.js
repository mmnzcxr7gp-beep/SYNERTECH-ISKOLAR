const { normalizeRole } = require('../config/constants');

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);
    
    // Check optional platform restriction header
    const platform = req.headers['x-client-platform'] || req.headers['x-platform'];
    if (platform === 'web' && userRole === 'student') {
      return res.status(403).json({
        message: 'Student access is available through the ISKOLAR mobile application.',
        allowedPlatform: 'mobile',
      });
    }
    if (platform === 'mobile' && (userRole === 'sponsor' || userRole === 'admin')) {
      return res.status(403).json({
        message: 'Sponsor and administrator access is available through the ISKOLAR web portal.',
        allowedPlatform: 'web',
      });
    }

    // Map allowed roles using canonical values
    const expandedAllowed = new Set(allowedRoles.map((r) => normalizeRole(r)));

    if (!expandedAllowed.has(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  roleMiddleware,
};

