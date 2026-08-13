const { db } = require('../config/db');
const { isOwnedBy } = require('../utils/ownership');
const { logAuditEvent } = require('../middleware/auditMiddleware');

const isSponsorRole = (role) => {
  const r = (role || '').toLowerCase();
  return r === 'sponsor' || r === 'provider';
};

const getScholarshipRankings = (req, res, next) => {
  try {
    const scholarshipId = req.params.id;
    const scholarship = db.data.scholarships.find((item) => String(item.id) === String(scholarshipId));
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to view rankings for this scholarship' });
    }

    const apps = (db.data.applications || []).filter(
      (application) => String(application.scholarship_id || application.scholarshipId) === String(scholarshipId)
    );

    const rankings = apps
      .sort((a, b) => {
        const scoreA = Number(a.score || a.weightedScore || 0);
        const scoreB = Number(b.score || b.weightedScore || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const gpaA = Number(a.gpa || 0);
        const gpaB = Number(b.gpa || 0);
        return gpaB - gpaA;
      })
      .map((application, idx) => {
        const student = (db.data.users || []).find((user) => String(user.id) === String(application.student_id || application.studentId)) || {};
        const profile = (db.data.student_profiles || []).find((item) => String(item.user_id) === String(application.student_id || application.studentId)) || {};
        
        // Expose sensitive individual rank/score only if authorized user (admin/provider or owner)
        const isSelf = String(req.user.id) === String(student.id);
        const isAdminOrProvider = req.user.role === 'admin' || isSponsorRole(req.user.role);

        return {
          application_id: application.id,
          rank: idx + 1,
          score: isAdminOrProvider || isSelf ? (application.score || application.weightedScore || 0) : null,
          status: application.status,
          applied_at: application.applied_at || application.createdAt,
          student_id: isAdminOrProvider ? student.id : null,
          student_name: isAdminOrProvider || isSelf ? student.name : 'Applicant #' + (idx + 1),
          school: profile.school || '',
          course: profile.course || '',
          gpa: isAdminOrProvider ? profile.gpa : null,
        };
      });

    return res.json({ scholarship_id: scholarship.id, title: scholarship.title || scholarship.name, rankings });
  } catch (error) {
    next(error);
  }
};

const recalculateRankings = async (req, res, next) => {
  try {
    const scholarshipId = req.params.id;
    const scholarship = db.data.scholarships.find((item) => String(item.id) === String(scholarshipId));
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to recalculate rankings for this scholarship' });
    }

    const apps = (db.data.applications || []).filter(
      (application) => String(application.scholarship_id || application.scholarshipId) === String(scholarshipId)
    );

    apps.sort((a, b) => {
      const scoreA = Number(a.score || a.weightedScore || 0);
      const scoreB = Number(b.score || b.weightedScore || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const gpaA = Number(a.gpa || 0);
      const gpaB = Number(b.gpa || 0);
      return gpaB - gpaA;
    });

    apps.forEach((app, index) => {
      app.rank = index + 1;
    });

    try {
      if (typeof db.write === 'function') await db.write();
    } catch (e) {
      console.error('DB write error:', e?.message);
    }

    const RankingSnapshot = require('../models/RankingSnapshot');
    const mongoose = require('mongoose');
    let snapshotRecord = null;
    if (mongoose.connection.readyState === 1) {
      snapshotRecord = await RankingSnapshot.create({
        scholarshipId: mongoose.Types.ObjectId.isValid(scholarshipId) ? scholarshipId : new mongoose.Types.ObjectId(),
        totalEvaluated: apps.length,
        rankedApplicants: apps.map((app, idx) => ({
          applicationId: mongoose.Types.ObjectId.isValid(app.id) ? app.id : new mongoose.Types.ObjectId(),
          studentId: mongoose.Types.ObjectId.isValid(app.student_id || app.studentId) ? (app.student_id || app.studentId) : new mongoose.Types.ObjectId(),
          rank: idx + 1,
          score: app.score || app.weightedScore || 0,
          tieBreakerNote: 'Ranked by score descending, then GPA descending',
        })),
      });
    }

    await logAuditEvent({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'RECALCULATE_SCHOLARSHIP_RANKINGS',
      targetType: 'Scholarship',
      targetId: scholarshipId,
      afterSummary: { totalRanked: apps.length },
      req,
    });

    return res.json({
      message: 'Rankings recalculation completed successfully',
      scholarshipId,
      totalRanked: apps.length,
      snapshot: snapshotRecord,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScholarshipRankings,
  recalculateRankings,
};
