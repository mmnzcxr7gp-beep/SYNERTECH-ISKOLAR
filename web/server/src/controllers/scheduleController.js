const Schedule = require('../models/Schedule');
const { db, createId } = require('../config/db');
const mongoose = require('mongoose');

/* ================= HELPERS ================= */
const emitNotification = (userId, notification) => {
  if (global._io) {
    global._io.to(`user_${userId}`).emit('notification', notification);
  }
};

const saveNotification = async (userId, title, message, type, data = {}) => {
  try {
    const Notification = require('../models/Notification');
    if (mongoose.connection.readyState === 1) {
      await Notification.create({ userId, title, message, type, data });
    }
  } catch (err) {
    console.error('Failed to save notification:', err?.message);
  }
  emitNotification(userId, { title, message, type, data, timestamp: new Date().toISOString() });
};

/* ================= CREATE SCHEDULE ================= */
const createSchedule = async (req, res, next) => {
  // NOTE: Mongoose sessions require a MongoDB replica set. In standalone/Atlas free-tier
  // deployments, startSession() may fail. This is non-fatal; operations proceed without
  // transactional guarantees.
  let session = null;
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
      } catch (e) {
        // Expected on non-replica-set deployments — proceed without session
      }
    }

    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { type, title, description, date, time, endTime, venue, meetingLink, scholarshipId, assignedStudents, notes } = req.body;

    if (!type || !title || !date || !time) {
      return res.status(400).json({ message: 'Type, title, date, and time are required' });
    }

    // Resolve student names from db
    const resolvedStudents = (assignedStudents || []).map((s) => {
      const studentId = typeof s === 'object' ? s.userId : s;
      const user = db.data.users.find((u) => Number(u.id) === Number(studentId));
      return {
        userId: studentId,
        name: user ? user.name : '',
        email: user ? user.email : '',
        confirmed: false,
      };
    });

    const parsedDate = new Date(date);

    // Prevent double-booking check
    if (mongoose.connection.readyState === 1) {
      for (const student of resolvedStudents) {
        const conflictingSchedule = await Schedule.findOne({
          'assignedStudents.userId': student.userId,
          date: parsedDate,
          time: time,
          status: { $ne: 'cancelled' }
        });
        if (conflictingSchedule) {
          return res.status(400).json({
            message: `Double-booking conflict: Student ${student.name || student.userId} is already scheduled for "${conflictingSchedule.title}" on this date and time.`
          });
        }
      }
    } else {
      if (!db.data.schedules) db.data.schedules = [];
      for (const student of resolvedStudents) {
        const conflictingSchedule = db.data.schedules.find((sch) => 
          sch.assignedStudents && sch.assignedStudents.some((s) => Number(s.userId) === Number(student.userId)) &&
          new Date(sch.date).getTime() === parsedDate.getTime() &&
          sch.time === time &&
          sch.status !== 'cancelled'
        );
        if (conflictingSchedule) {
          return res.status(400).json({
            message: `Double-booking conflict: Student ${student.name || student.userId} is already scheduled for "${conflictingSchedule.title}" on this date and time.`
          });
        }
      }
    }

    let createdSchedule;

    if (mongoose.connection.readyState === 1) {
      const schedule = await Schedule.create({
        type,
        title,
        description: description || '',
        date: parsedDate,
        time,
        endTime: endTime || '',
        venue: venue || '',
        meetingLink: meetingLink || '',
        scholarshipId: scholarshipId || null,
        providerId: userId,
        assignedStudents: resolvedStudents,
        notes: notes || '',
      });

      createdSchedule = schedule;
    } else {
      if (!db.data.schedules) db.data.schedules = [];
      createdSchedule = {
        _id: String(createId('schedules')),
        type,
        title,
        description: description || '',
        date: parsedDate.toISOString(),
        time,
        endTime: endTime || '',
        venue: venue || '',
        meetingLink: meetingLink || '',
        scholarshipId: scholarshipId || null,
        providerId: userId,
        assignedStudents: resolvedStudents,
        notes: notes || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      db.data.schedules.push(createdSchedule);
      if (typeof db.write === 'function') await db.write();
    }

    // Notify assigned students via In-App Notification and Live Email Dispatch
    const notifType = type === 'exam' ? 'exam_scheduled' : 'interview_scheduled';
    const emailService = require('../utils/emailService');

    for (const student of resolvedStudents) {
      await saveNotification(
        student.userId,
        `${type === 'exam' ? 'Exam' : 'Interview'} Scheduled`,
        `You have been scheduled for "${title}" on ${new Date(date).toLocaleDateString()} at ${time}. ${venue ? `Venue: ${venue}` : ''} ${meetingLink ? `Meeting: ${meetingLink}` : ''}`.trim(),
        notifType,
        { scheduleId: createdSchedule._id, type, date, time, venue, meetingLink }
      );

      // Student Email Dispatch
      const recipientEmail = student.email ||
        (db.data.users?.find((u) => Number(u.id) === Number(student.userId))?.email) ||
        (db.data.student_profiles?.find((p) => Number(p.user_id) === Number(student.userId))?.email);

      if (recipientEmail) {
        console.log(`📧 [Scheduling] Dispatching Event Invitation Email to student [${recipientEmail}]...`);
        emailService.sendScheduleNotificationEmail({
          studentEmail: recipientEmail,
          studentName: student.name || 'Scholarship Candidate',
          type,
          title,
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          time,
          endTime,
          venue,
          meetingLink,
          notes,
        }).catch((err) => console.warn('Schedule email notification failed:', err.message));
      }
    }

    const { logAuditEvent } = require('../middleware/auditMiddleware');
    await logAuditEvent({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'SCHEDULE_CREATE',
      targetType: 'Schedule',
      targetId: createdSchedule._id || createdSchedule.id || 'new',
      afterSummary: { type, title, date, time },
      req,
    });

    return res.status(201).json({ message: 'Schedule created', schedule: createdSchedule });
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
    }
    next(err);
  } finally {
    if (session) session.endSession();
  }
};

/* ================= GET SCHEDULES ================= */
const getSchedules = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const userRole = req.user && req.user.role;

    let schedules;

    if (mongoose.connection.readyState === 1) {
      if (userRole === 'admin') {
        schedules = await Schedule.find().sort({ date: 1 });
      } else if (userRole === 'provider' || userRole === 'sponsor') {
        schedules = await Schedule.find({
          $or: [{ providerId: userId }, { providerId: Number(userId) }],
        }).sort({ date: 1 });
      } else {
        schedules = await Schedule.find({
          $or: [
            { 'assignedStudents.userId': userId },
            { 'assignedStudents.userId': Number(userId) },
            { 'assignedStudents.userId': String(userId) },
          ],
        }).sort({ date: 1 });
      }
    } else {

      if (!db.data.schedules) db.data.schedules = [];
      let memSchedules = db.data.schedules;
      if (userRole === 'admin') {
        schedules = memSchedules;
      } else if (userRole === 'provider' || userRole === 'sponsor') {
        schedules = memSchedules.filter((s) => Number(s.providerId) === Number(userId));
      } else {
        schedules = memSchedules.filter((s) => s.assignedStudents && s.assignedStudents.some((a) => Number(a.userId) === Number(userId)));
      }
      schedules = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return res.json({ schedules });
  } catch (err) {
    next(err);
  }
};

/* ================= GET SCHEDULE BY ID ================= */
const getScheduleById = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const schedule = await Schedule.findById(req.params.id);
      if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
      return res.json({ schedule });
    } else {
      if (!db.data.schedules) db.data.schedules = [];
      const schedule = db.data.schedules.find((s) => String(s._id) === String(req.params.id));
      if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
      return res.json({ schedule });
    }
  } catch (err) {
    next(err);
  }
};

/* ================= UPDATE SCHEDULE ================= */
const updateSchedule = async (req, res, next) => {
  try {
    let schedule;

    if (mongoose.connection.readyState === 1) {
      schedule = await Schedule.findById(req.params.id);
      if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

      const { title, description, date, time, endTime, venue, meetingLink, assignedStudents, notes, status } = req.body;

      if (title !== undefined) schedule.title = title;
      if (description !== undefined) schedule.description = description;
      if (date !== undefined) schedule.date = new Date(date);
      if (time !== undefined) schedule.time = time;
      if (endTime !== undefined) schedule.endTime = endTime;
      if (venue !== undefined) schedule.venue = venue;
      if (meetingLink !== undefined) schedule.meetingLink = meetingLink;
      if (notes !== undefined) schedule.notes = notes;
      if (status !== undefined) schedule.status = status;

      if (assignedStudents !== undefined) {
        schedule.assignedStudents = assignedStudents.map((s) => {
          const studentId = typeof s === 'object' ? s.userId : s;
          const user = db.data.users.find((u) => Number(u.id) === Number(studentId));
          const existing = schedule.assignedStudents.find((a) => Number(a.userId) === Number(studentId));
          return {
            userId: studentId,
            name: user ? user.name : '',
            email: user ? user.email : '',
            confirmed: existing ? existing.confirmed : false,
            confirmedAt: existing ? existing.confirmedAt : null,
          };
        });
      }

      await schedule.save();
    } else {
      if (!db.data.schedules) db.data.schedules = [];
      const index = db.data.schedules.findIndex((s) => String(s._id) === String(req.params.id));
      if (index === -1) return res.status(404).json({ message: 'Schedule not found' });
      schedule = db.data.schedules[index];

      const { title, description, date, time, endTime, venue, meetingLink, assignedStudents, notes, status } = req.body;

      if (title !== undefined) schedule.title = title;
      if (description !== undefined) schedule.description = description;
      if (date !== undefined) schedule.date = new Date(date).toISOString();
      if (time !== undefined) schedule.time = time;
      if (endTime !== undefined) schedule.endTime = endTime;
      if (venue !== undefined) schedule.venue = venue;
      if (meetingLink !== undefined) schedule.meetingLink = meetingLink;
      if (notes !== undefined) schedule.notes = notes;
      if (status !== undefined) schedule.status = status;

      if (assignedStudents !== undefined) {
        schedule.assignedStudents = assignedStudents.map((s) => {
          const studentId = typeof s === 'object' ? s.userId : s;
          const user = db.data.users.find((u) => Number(u.id) === Number(studentId));
          const existing = (schedule.assignedStudents || []).find((a) => Number(a.userId) === Number(studentId));
          return {
            userId: studentId,
            name: user ? user.name : '',
            email: user ? user.email : '',
            confirmed: existing ? existing.confirmed : false,
            confirmedAt: existing ? existing.confirmedAt : null,
          };
        });
      }
      if (typeof db.write === 'function') await db.write();
    }

    // Notify assigned students about update
    for (const student of schedule.assignedStudents) {
      await saveNotification(
        student.userId,
        'Schedule Updated',
        `The ${schedule.type} "${schedule.title}" has been updated. Please check the new details.`,
        'schedule_updated',
        { scheduleId: schedule._id }
      );
    }

    return res.json({ message: 'Schedule updated', schedule });
  } catch (err) {
    next(err);
  }
};

/* ================= DELETE SCHEDULE ================= */
const deleteSchedule = async (req, res, next) => {
  try {
    let schedule;
    if (mongoose.connection.readyState === 1) {
      schedule = await Schedule.findById(req.params.id);
      if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
      schedule.status = 'cancelled';
      await schedule.save();
    } else {
      if (!db.data.schedules) db.data.schedules = [];
      const index = db.data.schedules.findIndex((s) => String(s._id) === String(req.params.id));
      if (index === -1) return res.status(404).json({ message: 'Schedule not found' });
      schedule = db.data.schedules[index];
      schedule.status = 'cancelled';
      if (typeof db.write === 'function') await db.write();
    }

    // Notify students about cancellation
    for (const student of schedule.assignedStudents || []) {
      await saveNotification(
        student.userId,
        'Schedule Cancelled',
        `The ${schedule.type} "${schedule.title}" has been cancelled.`,
        'schedule_cancelled',
        { scheduleId: schedule._id }
      );
    }

    return res.json({ message: 'Schedule cancelled' });
  } catch (err) {
    next(err);
  }
};

/* ================= CONFIRM ATTENDANCE ================= */
const confirmAttendance = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    let schedule;

    if (mongoose.connection.readyState === 1) {
      schedule = await Schedule.findById(req.params.id);
      if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

      const student = schedule.assignedStudents.find((s) => Number(s.userId) === Number(userId));
      if (!student) return res.status(403).json({ message: 'You are not assigned to this schedule' });

      student.confirmed = true;
      student.confirmedAt = new Date();
      await schedule.save();
    } else {
      if (!db.data.schedules) db.data.schedules = [];
      const index = db.data.schedules.findIndex((s) => String(s._id) === String(req.params.id));
      if (index === -1) return res.status(404).json({ message: 'Schedule not found' });
      schedule = db.data.schedules[index];

      const student = (schedule.assignedStudents || []).find((s) => Number(s.userId) === Number(userId));
      if (!student) return res.status(403).json({ message: 'You are not assigned to this schedule' });

      student.confirmed = true;
      student.confirmedAt = new Date().toISOString();
      if (typeof db.write === 'function') await db.write();
    }

    return res.json({ message: 'Attendance confirmed', schedule });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  confirmAttendance,
};
