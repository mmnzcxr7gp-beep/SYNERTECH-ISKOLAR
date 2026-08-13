const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { db } = require('../config/db');

/* ================= GET USER NOTIFICATIONS ================= */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let notifications = [];
    let total = 0;
    let unreadCount = 0;

    if (mongoose.connection.readyState === 1) {
      [notifications, total, unreadCount] = await Promise.all([
        Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments({ userId }),
        Notification.countDocuments({ userId, read: false }),
      ]);
    } else {
      // Fallback: in-memory notifications
      if (!db.data.notifications) db.data.notifications = [];
      const userNotifs = db.data.notifications
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
      total = userNotifs.length;
      unreadCount = userNotifs.filter((n) => !n.read).length;
      notifications = userNotifs.slice(skip, skip + limit);
    }

    return res.json({ notifications, total, unreadCount, page, limit });
  } catch (err) {
    next(err);
  }
};

/* ================= MARK NOTIFICATION AS READ ================= */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      await Notification.findOneAndUpdate({ _id: id, userId }, { read: true });
    } else {
      if (!db.data.notifications) db.data.notifications = [];
      const notif = db.data.notifications.find((n) => String(n.id || n._id) === String(id) && n.userId === userId);
      if (notif) notif.read = true;
    }

    return res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

/* ================= MARK ALL AS READ ================= */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;

    if (mongoose.connection.readyState === 1) {
      await Notification.updateMany({ userId, read: false }, { read: true });
    } else {
      if (!db.data.notifications) db.data.notifications = [];
      db.data.notifications
        .filter((n) => n.userId === userId)
        .forEach((n) => { n.read = true; });
    }

    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

/* ================= CREATE NOTIFICATION (internal helper) ================= */
const createNotification = async (userId, title, message, type, data = {}) => {
  const notification = { userId, title, message, type, data, read: false };

  if (mongoose.connection.readyState === 1) {
    try {
      const saved = await Notification.create(notification);
      notification._id = saved._id;
      notification.createdAt = saved.createdAt;
    } catch (err) {
      console.error('Failed to save notification to MongoDB:', err?.message);
    }
  } else {
    if (!db.data.notifications) db.data.notifications = [];
    notification.id = Date.now();
    notification.createdAt = new Date().toISOString();
    db.data.notifications.push(notification);
  }

  // Emit via Socket.IO
  if (global._io) {
    global._io.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: notification.createdAt || new Date().toISOString(),
    });
  }

  // Send push notification via FCM (non-blocking, best-effort)
  try {
    const { sendPushNotification } = require('../utils/pushNotificationService');
    await sendPushNotification(userId, title, message, { type, ...data });
  } catch (pushErr) {
    // Non-critical — log and continue
    console.warn('[createNotification] Push notification failed (non-critical):', pushErr?.message);
  }

  return notification;
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};
