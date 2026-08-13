const bcrypt = require('bcrypt');
const { db, createId } = require('../config/db');

const getAllUsers = (req, res, next) => {
  try {
    const users = db.data.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || '',
      company_domain: user.company_domain || '',
      sponsor_verified: user.sponsor_verified,
      organization_verified: user.organization_verified,
      organization_documents: user.organization_documents || [],
      organization_email_matches_company_domain: user.organization_email_matches_company_domain,
      created_at: user.created_at,
    }));
    return res.json({ users });
  } catch (error) {
    next(error);
  }
};

const getUserById = (req, res, next) => {
  try {
    const user = db.data.users.find((item) => item.id === Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company || '',
        company_domain: user.company_domain || '',
        sponsor_verified: user.sponsor_verified,
        organization_verified: user.organization_verified,
        organization_documents: user.organization_documents || [],
        organization_email_matches_company_domain: user.organization_email_matches_company_domain,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      role,
      company,
      company_domain,
      sponsor_verified = false,
      organization_verified = false,
      password,
    } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }

    const existing = db.data.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password || 'TempPass123!', 10);
    const user = {
      id: createId('users'),
      name,
      email,
      role,
      company: company || '',
      company_domain: company_domain || '',
      sponsor_verified: Boolean(sponsor_verified),
      organization_verified: Boolean(organization_verified),
      organization_documents: [],
      organization_email_matches_company_domain: false,
      created_at: new Date().toISOString(),
      password: hashedPassword,
    };

    db.data.users.push(user);
    await db.write();

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        company_domain: user.company_domain,
        sponsor_verified: user.sponsor_verified,
        organization_verified: user.organization_verified,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = db.data.users.find((item) => item.id === Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name,
      email,
      role,
      company,
      company_domain,
      sponsor_verified,
      organization_verified,
      password,
    } = req.body;

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = db.data.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(409).json({ message: 'A user with this email already exists' });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.company = company || user.company || '';
    user.company_domain = company_domain || user.company_domain || '';
    if (typeof sponsor_verified !== 'undefined') {
      user.sponsor_verified = Boolean(sponsor_verified);
    }
    if (typeof organization_verified !== 'undefined') {
      user.organization_verified = Boolean(organization_verified);
    }
    if (password) {
      user.password = bcrypt.hashSync(password, 10);
    }

    await db.write();

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company || '',
        company_domain: user.company_domain || '',
        sponsor_verified: user.sponsor_verified,
        organization_verified: user.organization_verified,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const index = db.data.users.findIndex((item) => item.id === Number(req.params.id));
    if (index === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    db.data.users.splice(index, 1);
    await db.write();

    return res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

const { registerDeviceToken, removeDeviceToken } = require('../utils/pushNotificationService');

/* ================= REGISTER DEVICE TOKEN ================= */
const registerDeviceTokenController = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    const record = await registerDeviceToken(userId, token, platform || 'unknown');

    return res.json({
      message: 'Device token registered',
      deviceToken: record,
    });
  } catch (err) {
    next(err);
  }
};

/* ================= REMOVE DEVICE TOKEN ================= */
const removeDeviceTokenController = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    await removeDeviceToken(token);

    return res.json({ message: 'Device token removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  registerDeviceTokenController,
  removeDeviceTokenController,
};
