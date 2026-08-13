const fs = require('fs');
const path = require('path');
const { db, createId } = require('../config/db');
const { validationResult } = require('express-validator');
const exifParser = require('exif-parser');
const { calculateRankingScore } = require('../utils/rankingUtils');

const isSponsorRole = (role) => role === 'sponsor' || role === 'provider';
const { isOwnedBy } = require('../utils/ownership');

const parseExifData = (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    return {
      camera_make: result.tags.Make || null,
      camera_model: result.tags.Model || null,
      created_at: result.tags.DateTimeOriginal ? new Date(result.tags.DateTimeOriginal * 1000).toISOString() : null,
    };
  } catch (error) {
    return null;
  }
};

const applyToScholarship = (req, res, next) => {
  try {
    return res.status(400).json({
      message:
        'Direct application without uploading requirements is not allowed. Please submit your application using the document upload flow.',
    });
  } catch (error) {
    next(error);
  }
};

const submitApplication = async (req, res, next) => {
  try {
    // Block only when a verification record explicitly marks the account unverified.
    // This project uses both Mongo (Student model) and an in-memory JSON state (db.data.student_profiles).
    // To avoid false negatives we check both sources but do NOT require a legacy profile to exist.
    const { Student } = require('../models');

    const tryUserIdVariants = (userId) => {
      const num = Number(userId);
      return Array.from(new Set([userId, num])).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    };

    const userIdVariants = tryUserIdVariants(req.user.id);

    let studentDoc = null;
    for (const v of userIdVariants) {
      // Student schema uses `userId: Number`
      studentDoc = await Student.findOne({ userId: v }).catch(() => null);
      if (studentDoc) break;
    }

    const profile = db.data.student_profiles?.find((p) => p.user_id === req.user.id || Number(p.user_id) === Number(req.user.id)) || null;

    // If a Mongo student document exists and indicates unverified, block.
    if (studentDoc) {
      if (!studentDoc.isVerified) {
        return res.status(403).json({
          message: 'Your account is pending verification by admin.',
          verificationStatus: studentDoc.verificationStatus,
        });
      }
    } else if (profile) {
      // If legacy profile exists and is explicitly unverified, block.
      const isVerified = !!profile.isVerified;
      const verificationStatus = profile.verificationStatus;
      if (!isVerified) {
        return res.status(403).json({
          message: 'Your account is pending verification by admin.',
          verificationStatus: verificationStatus,
        });
      }
    }


    const { scholarship_id, gpa } = req.body;

    // Debug: Log incoming scholarship identifier and a sample of legacy scholarship ids
    try {
      console.log('[/applications/submit] incoming scholarship_id:', scholarship_id, 'type:', typeof scholarship_id);
      const sampleIds = Array.isArray(db.data.scholarships) ? db.data.scholarships.slice(0, 10).map((s) => s.id) : [];
      console.log('[/applications/submit] legacy scholarship ids (sample):', sampleIds);
    } catch (err) {
      console.warn('[/applications/submit] failed to print legacy scholarship ids:', err && err.message ? err.message : err);
    }

    // Try to find scholarship in legacy in-memory app_state first (try numeric and string ids)
    // Also handle "legacy-<numeric-id>" format from browse endpoint normalization.
    let scholarship = null;
    try {
      scholarship = db.data.scholarships.find((item) => {
        // Direct numeric match (e.g., scholarship_id=11, item.id=11)
        const num = Number(scholarship_id);
        if (!Number.isNaN(num) && item.id === num) return true;

        // Direct string match (e.g., scholarship_id="11", item.id=11)
        if (String(item.id) === String(scholarship_id)) return true;

        // Handle "legacy-<numeric-id>" format from browse normalization
        // (e.g., scholarship_id="legacy-11", extract "11" and match item.id=11)
        const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
        if (legacyMatch) {
          const extractedNum = Number(legacyMatch[1]);
          if (!Number.isNaN(extractedNum) && item.id === extractedNum) return true;
        }

        return false;
      });
    } catch (err) {
      console.warn('Legacy scholarship lookup error:', err && err.message ? err.message : err);
    }

    // If not found, attempt to locate in Mongo-backed Scholarship collection and
    // synthesize a legacy-like object so the upload/apply workflow continues to work.
    if (!scholarship) {
      try {
        const { Scholarship } = require('../models');
        
        // Try the scholarship_id as-is first (for ObjectIds or legacy numeric IDs)
        let mongoScholar = await Scholarship.findById(String(scholarship_id)).lean().catch(() => null);
        
        // If not found and scholarship_id is "legacy-<numeric>", try to find by the numeric ID
        // (in case there's a legacy entry duplicated in Mongo)
        if (!mongoScholar) {
          const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
          if (legacyMatch) {
            const extractedNum = Number(legacyMatch[1]);
            mongoScholar = await Scholarship.findById(extractedNum).lean().catch(() => null);
          }
        }
        
        if (mongoScholar) {
          // Normalize Mongo scholarship into the legacy shape expected below
          const reqsRaw = mongoScholar.eligibilityRequirements || mongoScholar.eligibility_requirements || '';
          const reqs = Array.isArray(mongoScholar.requirements)
            ? mongoScholar.requirements
            : (typeof reqsRaw === 'string' && reqsRaw.length ? reqsRaw.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean) : []);

          scholarship = {
            id: mongoScholar._id.toString(),
            title: mongoScholar.title,
            sponsor_id: mongoScholar.providerId || mongoScholar.sponsor_id || null,
            requirements: reqs,
            criteria_json: mongoScholar.criteria_json || (mongoScholar.criteria && mongoScholar.criteria.json) || '{}',
            status: (mongoScholar.status || 'Draft').toString().toLowerCase(),
            slots: mongoScholar.totalSlots || mongoScholar.slots || 0,
            created_at: mongoScholar.createdAt || mongoScholar.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        // ignore and fall through to not-found handling below
        console.warn('Scholarship lookup fallback failed:', err && err.message ? err.message : err);
      }
    }

    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    // Accept both 'open' and 'draft' statuses for now to allow testing
    const status = (scholarship.status || '').toString().toLowerCase();
    const acceptableStatuses = ['open', 'draft'];
    if (!acceptableStatuses.includes(status)) {
      return res.status(400).json({ message: 'Scholarship is not available for applications' });
    }

    const existing = db.data.applications.find(
      (item) => item.scholarship_id === Number(scholarship_id) && item.student_id === req.user.id
    );
    if (existing) {
      return res.status(409).json({ message: 'You have already applied to this scholarship' });
    }

    // Ensure a student profile record exists for downstream usage. If missing, create a minimal one
    // so the application/documents can be associated without blocking the user.
    let studentProfile = db.data.student_profiles.find((item) => item.user_id === req.user.id);
    if (!studentProfile) {
      try {
        const profileObj = {
          id: createId('student_profiles'),
          user_id: req.user.id,
          name: req.user.name || null,
          email: req.user.email || null,
          gpa: gpa ? Number(gpa) : null,
          school: null,
          course: null,
          isVerified: false,
          verificationStatus: null,
        };
        db.data.student_profiles.push(profileObj);
        studentProfile = profileObj;
        // persist the new profile so future operations and reads see it
        await db.write();
      } catch (err) {
        console.warn('Failed to create fallback student profile:', err && err.message ? err.message : err);
        // proceed without blocking — downstream code uses studentProfile where available
        studentProfile = { user_id: req.user.id };
      }
    }

    // If GPA provided, update profile
    if (gpa && studentProfile) {
      try {
        studentProfile.gpa = Number(gpa);
      } catch (_) {}
    }

    const criteria = JSON.parse(scholarship.criteria_json || '{}');
    const score = calculateRankingScore(criteria, studentProfile || profile || {});

    // Extract numeric scholarship_id from string (handle "legacy-11" format)
    let numericScholarshipId = Number(scholarship_id);
    if (Number.isNaN(numericScholarshipId)) {
      // Try to extract numeric id from "legacy-<numeric>" format
      const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
      numericScholarshipId = legacyMatch ? Number(legacyMatch[1]) : scholarship_id;
    }

    const application = {
      id: createId('applications'),
      scholarship_id: numericScholarshipId,
      student_id: req.user.id,
      status: 'pending',
      score,
      applied_at: new Date().toISOString(),
    };

    console.log('[/applications/submit] created application (pending save):', application);
    console.log('[/applications/submit] req.body:', req.body);
    console.log('[/applications/submit] req.files is array:', Array.isArray(req.files));
    if (Array.isArray(req.files)) {
      console.log(
        '[/applications/submit] uploaded file fields:',
        req.files.map((f) => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype }))
      );
    } else {
      console.log('[/applications/submit] req.files:', req.files);
    }

    // Dynamic scholarship requirements upload flow.
    // Flutter sends files using fields: file_0, file_1, file_2, ...
    // Multer is configured with upload.any(), so req.files is a flat array.
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    const scholarshipRequirements = Array.isArray(scholarship.requirements) ? scholarship.requirements : [];
    const normalizedRequirements = scholarshipRequirements
      .map((r) => (r ?? '').toString().trim())
      .filter((r) => r.length > 0);

    if (normalizedRequirements.length === 0) {
      normalizedRequirements.push('Student ID');
    }
    const totalSlots = normalizedRequirements.length;

    const missingSlots = [];
    for (let i = 0; i < totalSlots; i++) {
      const fieldName = `file_${i}`;
      const found = uploadedFiles.some((f) => f.fieldname === fieldName);
      if (!found) missingSlots.push({ index: i, requirement: normalizedRequirements[i] });
    }

    if (uploadedFiles.length > 0 && missingSlots.length > 0) {
      return res.status(400).json({
        message: `Missing required documents: ${missingSlots.map((s) => s.requirement).join(', ')}. Please attach all required files before submitting your application.`,
      });
    }

    // Save one document record for every uploaded file.
    // requirement_name comes from scholarship.requirements using file_N mapping.
    const savedDocs = [];
    for (const f of uploadedFiles) {
      const match = /^file_(\d+)$/.exec(String(f.fieldname));
      const requirementIndex = match ? Number(match[1]) : null;
      const requirementName =
        requirementIndex !== null && requirementIndex >= 0 && requirementIndex < normalizedRequirements.length
          ? normalizedRequirements[requirementIndex]
          : null;

      const isImage = f.mimetype?.startsWith('image/') || /\.(jpe?g|png|tiff?)$/i.test(f.originalname);
      const fileSize = fs.existsSync(f.path) ? fs.statSync(f.path).size : 0;

      const doc = {
        id: createId('documents'),
        application_id: application.id,
        user_id: req.user.id,
        // Dynamic requirement identifiers for provider review.
        requirement_index: requirementIndex,
        requirement_field: f.fieldname,
        requirement_name: requirementName,
        // Backward-compatible 'type' so existing UI keeps working if it reads documents[].type.
        type: requirementName || f.fieldname,
        filename: f.filename,
        originalname: f.originalname,
        path: f.path,
        mime_type: f.mimetype || '',
        file_size: fileSize,
        uploaded_at: new Date().toISOString(),
        exif: isImage ? parseExifData(f.path) : null,
      };

      db.data.documents.push(doc);
      savedDocs.push(doc);
    }

    // Enforce Authoritative Write Order: Write MongoDB record first
    try {
      if (typeof db.syncApplication === 'function') {
        await db.syncApplication(application);
      }
    } catch (syncErr) {
      console.error('✗ Authoritative MongoDB application write failed:', syncErr.message);
      return res.status(500).json({ message: 'Database failure: Could not create authoritative application record' });
    }

    // Update db.data compatibility cache after authoritative MongoDB write succeeds
    db.data.applications.push(application);
    await db.write();

    // Notify provider (sponsor) in real-time if socket is available
    try {
      const notificationService = require('../utils/notificationService');
      
      // Extract numeric id from "legacy-<id>" format for notification lookup
      let lookupId = Number(scholarship_id);
      if (Number.isNaN(lookupId)) {
        const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
        lookupId = legacyMatch ? Number(legacyMatch[1]) : scholarship_id;
      }
      
      const scholarshipOwner = db.data.scholarships.find((s) => s.id === lookupId);
      const providerId = scholarshipOwner?.sponsor_id ?? scholarshipOwner?.provider_id ?? null;
      if (providerId) {
        notificationService.notifyApplicationCreated(providerId, application, req.user.id, scholarship_id);
      }
    } catch (err) {
      console.warn('Failed to send application notification:', err.message || err);
    }
    return res.status(201).json({ application, documents: savedDocs });
  } catch (error) {
    next(error);
  }
};

const getApplications = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const { ScholarshipApplication, Scholarship } = require('../models');
    const userRole = (req.user?.role || '').toLowerCase();
    const userIdStr = String(req.user?.id || '');

    const buildApplicationResponse = (application) => {
      const scholarshipIdStr = String(application.scholarship_id || application.scholarshipId || '');
      const studentIdStr = String(application.student_id || application.studentId || '');

      const scholarship = (db.data.scholarships || []).find((item) => String(item.id) === scholarshipIdStr) || {};
      const student = (db.data.users || []).find((user) => String(user.id) === studentIdStr) || {};
      const profile = (db.data.student_profiles || []).find((item) => String(item.user_id) === studentIdStr) || {};
      const docs = (db.data.documents || [])
        .filter((d) => String(d.application_id) === String(application.id))
        .map((d) => {
          const storedFilename = d.filename || (typeof d.path === 'string' ? path.basename(d.path) : null);
          const documentUrl =
            d.url ||
            (typeof d.path === 'string' && d.path.startsWith('/uploads/') ? d.path : storedFilename ? `/uploads/${storedFilename}` : null);

          return {
            id: d.id,
            requirement_name: d.requirement_name || d.type || d.requirement_field,
            originalname: d.originalname,
            filename: d.filename,
            mime_type: d.mime_type,
            uploaded_at: d.uploaded_at,
            url: documentUrl,
            fileUrl: documentUrl,
          };
        });

      const studentName = student.name || profile.name || application.student_name || null;
      const studentEmail = student.email || profile.email || application.student_email || null;

      return {
        ...application,
        id: application.id || application._id,
        scholarship_id: application.scholarship_id || application.scholarshipId,
        scholarship_title: application.scholarship_title || scholarship.title || scholarship.name || 'Scholarship Grant',
        student_name: studentName,
        student_email: studentEmail,
        student_id: application.student_id || application.studentId,
        applied_at: application.applied_at || application.createdAt || new Date().toISOString(),
        status: application.status || 'Pending',
        student_profile: {
          school: profile.school || null,
          course: profile.course || null,
          gpa: profile.gpa ?? null,
          family_income: profile.family_income ?? null,
          achievements: profile.achievements || null,
          status: profile.status || 'pending',
        },
        documents: docs,
      };
    };

    let applications = [];

    // 1. Filter in-memory JSON applications
    const jsonApps = db.data.applications || [];
    if (userRole === 'student' || userRole === 'applicant') {
      applications = jsonApps
        .filter((app) => String(app.student_id || app.studentId) === userIdStr)
        .map(buildApplicationResponse);
    } else if (isSponsorRole(userRole)) {
      applications = jsonApps
        .filter((app) => {
          const scholarship = (db.data.scholarships || []).find((item) => String(item.id) === String(app.scholarship_id || app.scholarshipId));
          return scholarship && isOwnedBy(scholarship, req.user.id);
        })
        .map(buildApplicationResponse);
    } else {
      applications = jsonApps.map(buildApplicationResponse);
    }

    // 2. Merge Mongoose ScholarshipApplication records if connected
    if (mongoose.connection.readyState === 1 && ScholarshipApplication && typeof ScholarshipApplication.find === 'function') {
      try {
        const mongoQuery = (userRole === 'student' || userRole === 'applicant')
          ? { $or: [{ studentId: req.user.id }, { userId: req.user.id }, { studentId: userIdStr }] }
          : {};
        
        const mongoDocs = await ScholarshipApplication.find(mongoQuery).populate('scholarshipId').lean();
        const existingIds = new Set(applications.map((a) => String(a.id)));

        mongoDocs.forEach((doc) => {
          const docIdStr = String(doc._id);
          if (!existingIds.has(docIdStr)) {
            const sch = doc.scholarshipId || {};
            applications.push({
              id: doc._id,
              scholarship_id: sch._id || doc.scholarshipId,
              scholarship_title: sch.title || 'Scholarship Grant',
              student_id: doc.studentId || req.user.id,
              status: doc.status || 'Pending Review',
              applied_at: doc.submittedAt || doc.createdAt || new Date().toISOString(),
              submissionCount: doc.submissionCount || 1,
              documents: doc.documents || [],
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Mongoose ScholarshipApplication fetch notice:', err?.message);
      }
    }

    // Sort descending by date
    applications.sort((a, b) => new Date(b.applied_at || b.createdAt || 0) - new Date(a.applied_at || a.createdAt || 0));

    return res.json({ applications });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    let { status } = req.body;
    if (status === 'accepted') {
      status = 'approved';
    }

    // Frontend may send approved/rejected or accept/reject synonyms.
    // Keep server validation strict but support both payload shapes.
    const normalizedStatus = String(status || '').toLowerCase();
    const statusMap = {
      approved: 'approved',
      rejected: 'rejected',
      pending: 'pending',
      ranked: 'ranked',
      accept: 'approved',
      reject: 'rejected',
    };

    const finalStatus = statusMap[normalizedStatus];
    if (!finalStatus) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // application.id is generated by createId('applications') and is typically a string.
    // Accept both numeric and string ids.
    const applicationId = req.params.id;
    const application = db.data.applications.find((item) => String(item.id) === String(applicationId));
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const scholarship = db.data.scholarships.find((item) => item.id === application.scholarship_id);
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to update this application' });
    }

    // Enforce Authoritative Write Order: Sync status to MongoDB first
    const previousStatus = application.status;
    application.status = finalStatus;
    try {
      if (typeof db.syncApplication === 'function') {
        await db.syncApplication(application);
      }
    } catch (syncErr) {
      application.status = previousStatus; // Rollback in-memory status
      console.error('✗ Authoritative MongoDB status update failed:', syncErr.message);
      return res.status(500).json({ message: 'Database failure: Could not update status in authoritative store' });
    }

    await db.write();

    // Trigger Notification, Socket Events, and n8n Email Workflows
    try {
      const { createNotification } = require('./notificationController');
      const emailService = require('../utils/emailService');
      const formattedStatus = finalStatus.toUpperCase();
      
      const title = `Application ${formattedStatus === 'APPROVED' ? 'Approved!' : 'Rejected'}`;
      const message = formattedStatus === 'APPROVED' 
        ? `Congratulations! Your application for "${scholarship.title || 'Scholarship'}" has been approved.`
        : `We regret to inform you that your application for "${scholarship.title || 'Scholarship'}" was rejected.`;

      await createNotification(
        application.student_id,
        title,
        message,
        `application_${finalStatus}`,
        { scholarshipId: scholarship.id }
      );

      if (global._io) {
        global._io.to(`user_${application.student_id}`).emit('application-status-changed', {
          status: formattedStatus,
          scholarshipTitle: scholarship.title,
          message,
          timestamp: new Date().toISOString(),
        });
      }

      // Find student email and name for n8n & email notifications
      const studentUser = db.data.users?.find((u) => u.id === application.student_id) || {};
      const studentProfile = db.data.student_profiles?.find((p) => p.user_id === application.student_id) || {};
      const studentEmail = studentUser.email || studentProfile.email || application.student_email;
      const studentName = studentUser.name || studentProfile.name || application.student_name || 'Student';

      const providerUser = db.data.users?.find((u) => u.id === scholarship.provider_id || u.id === scholarship.sponsor_id) || {};
      const providerName = providerUser.name || scholarship.organization_name || 'Scholarship Provider';

      if (studentEmail) {
        if (finalStatus === 'approved') {
          console.log(`📧 [n8n Automation] Sending Application ACCEPTED Email & Webhook for Student [${studentEmail}]...`);
          emailService.sendApplicationAcceptedEmail({
            studentEmail,
            studentName,
            scholarshipTitle: scholarship.title,
            providerName,
            maxAmount: scholarship.maxAmount || scholarship.amount,
            allowance: scholarship.allowance,
          }).catch((e) => console.error('Failed sending accepted email:', e.message));
        } else if (finalStatus === 'rejected') {
          console.log(`📧 [n8n Automation] Sending Application REJECTED Email & Webhook for Student [${studentEmail}]...`);
          emailService.sendApplicationRejectedEmail({
            studentEmail,
            studentName,
            scholarshipTitle: scholarship.title,
            providerName,
            reason: req.body.reason || 'Application did not meet specific provider quota requirements.',
          }).catch((e) => console.error('Failed sending rejected email:', e.message));
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify application status change:', notifErr?.message);
    }

    return res.json({ application });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyToScholarship,
  submitApplication,
  getApplications,
  updateApplicationStatus,
};
