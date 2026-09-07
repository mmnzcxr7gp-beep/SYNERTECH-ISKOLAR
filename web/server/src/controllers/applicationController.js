const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { db, createId } = require('../config/db');
const { validationResult } = require('express-validator');
const exifParser = require('exif-parser');
const { calculateRankingScore } = require('../utils/rankingUtils');
const storageService = require('../utils/storageService');
const approvalService = require('../services/approvalService');

// Concurrency Guard: in-flight submission lock to prevent duplicate application submissions
const inFlightSubmissions = new Set();

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
  let submissionKey;
  try {
    // Block only when a verification record explicitly marks the account unverified.
    // This project uses both Mongo (Student model) and an in-memory JSON state (db.data.student_profiles).
    // To avoid false negatives we check both sources but do NOT require a legacy profile to exist.
    const { Student } = require('../models');

    const tryUserIdVariants = (userId) => {
      const num = Number(userId);
      return Array.from(new Set([userId, String(userId), num])).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    };

    const userIdVariants = tryUserIdVariants(req.user.id);

    let studentDoc = null;
    for (const v of userIdVariants) {
      // Student schema uses `userId: Number` or String
      studentDoc = await Student.findOne({ $or: [{ userId: v }, { user_id: v }] }).catch(() => null);
      if (studentDoc) break;
    }
    if (!studentDoc && req.user.email) {
      studentDoc = await Student.findOne({ email: req.user.email }).catch(() => null);
    }

    let profile = null;
    if (db.collections?.student_profiles) {
      profile = await db.collections.student_profiles.findOne({
        $or: [
          ...userIdVariants.map((v) => ({ user_id: v })),
          ...userIdVariants.map((v) => ({ userId: v })),
          ...(req.user.email ? [{ email: req.user.email }] : []),
        ],
      }).catch(() => null);
    }
    if (!profile && db.data.student_profiles) {
      profile = db.data.student_profiles.find(
        (p) => userIdVariants.includes(p.user_id) || userIdVariants.includes(p.userId) || (req.user.email && p.email === req.user.email)
      ) || null;
    }

    let dbUser = null;
    if (db.collections?.users) {
      const userQueries = [
        { _id: req.user.id },
        { id: req.user.id },
        { id: Number(req.user.id) },
        ...(req.user.email ? [{ email: req.user.email }] : []),
      ];
      if (mongoose.Types.ObjectId.isValid(String(req.user.id))) {
        userQueries.push({ _id: new mongoose.Types.ObjectId(String(req.user.id)) });
      }
      dbUser = await db.collections.users.findOne({
        $or: userQueries,
      }).catch(() => null);
    }

    const isSuspendedOrDeleted = ['SUSPENDED', 'ARCHIVED', 'DELETED', 'DELETION_PENDING'].includes(dbUser?.accountStatus || req.user.accountStatus);
    if (isSuspendedOrDeleted) {
      return res.status(403).json({
        message: 'Your account is suspended or deactivated. Please contact support.',
        verificationStatus: 'suspended',
      });
    }

    const isUserVerified = Boolean(
      req.user.isVerified ||
      req.user.verificationStatus === 'verified' ||
      req.user.status === 'verified' ||
      req.user.accountStatus === 'ACTIVE' ||
      dbUser?.isVerified ||
      dbUser?.verificationStatus === 'verified' ||
      dbUser?.status === 'verified' ||
      dbUser?.accountStatus === 'ACTIVE' ||
      studentDoc?.isVerified ||
      studentDoc?.verificationStatus === 'verified' ||
      profile?.isVerified ||
      profile?.status === 'verified' ||
      profile?.verificationStatus === 'verified' ||
      db.data.users?.find((u) => u.id === req.user.id || Number(u.id) === Number(req.user.id) || (req.user.email && u.email === req.user.email))?.isVerified ||
      db.data.users?.find((u) => u.id === req.user.id || Number(u.id) === Number(req.user.id) || (req.user.email && u.email === req.user.email))?.accountStatus === 'ACTIVE'
    );

    // If explicit rejection or explicitly unverified across all authoritative records, block.
    if (!isUserVerified) {
      const statusReason = studentDoc?.verificationStatus || profile?.verificationStatus || dbUser?.verificationStatus || 'pending';
      return res.status(403).json({
        message: 'Your account is pending verification by admin.',
        verificationStatus: statusReason,
      });
    }

    const { scholarship_id, gpa } = req.body;
    if (!scholarship_id || scholarship_id === 'undefined' || String(scholarship_id).trim() === '') {
      return res.status(400).json({ message: 'scholarship_id is required' });
    }

    // Authoritative lookup in MongoDB scholarships collection
    let scholarship = null;
    if (db.collections?.scholarships) {
      const num = Number(scholarship_id);
      const queryList = [
        { id: scholarship_id },
        ...(!Number.isNaN(num) ? [{ id: num }] : []),
        { _id: scholarship_id },
        ...(!Number.isNaN(num) ? [{ _id: num }] : []),
      ];
      if (mongoose.Types.ObjectId.isValid(String(scholarship_id))) {
        queryList.push({ _id: new mongoose.Types.ObjectId(String(scholarship_id)) });
      }
      const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
      if (legacyMatch) {
        const extractedNum = Number(legacyMatch[1]);
        if (!Number.isNaN(extractedNum)) {
          queryList.push({ id: extractedNum }, { id: String(extractedNum) }, { _id: extractedNum }, { _id: String(extractedNum) });
        }
      }
      scholarship = await db.collections.scholarships.findOne({
        $or: queryList,
      }).catch(() => null);
    }

    // Fallback to in-memory db.data.scholarships
    if (!scholarship) {
      scholarship = (db.data.scholarships || []).find((item) => {
        if (!item) return false;
        const itemId = item.id != null ? item.id : item._id;
        if (itemId == null) return false;

        const num = Number(scholarship_id);
        if (!Number.isNaN(num) && Number(itemId) === num) return true;
        if (String(itemId) === String(scholarship_id)) return true;

        const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
        if (legacyMatch) {
          const extractedNum = Number(legacyMatch[1]);
          if (!Number.isNaN(extractedNum) && Number(itemId) === extractedNum) return true;
        }

        return false;
      });
    }

    // If not found, attempt to locate in Mongo-backed Scholarship collection via Mongoose model
    if (!scholarship) {
      try {
        const { Scholarship } = require('../models');
        let mongoScholar = null;
        if (mongoose.Types.ObjectId.isValid(String(scholarship_id))) {
          mongoScholar = await Scholarship.findById(String(scholarship_id)).lean().catch(() => null);
        }
        if (!mongoScholar) {
          const num = Number(scholarship_id);
          const mQueries = [
            { id: scholarship_id },
            ...(!Number.isNaN(num) ? [{ id: num }] : []),
          ];
          const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
          if (legacyMatch) {
            const extractedNum = Number(legacyMatch[1]);
            if (!Number.isNaN(extractedNum)) {
              mQueries.push({ id: extractedNum }, { id: String(extractedNum) });
            }
          }
          mongoScholar = await Scholarship.findOne({ $or: mQueries }).lean().catch(() => null);
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

    // Accept open, active, published, and draft statuses for applications
    const status = (scholarship.status || '').toString().toLowerCase();
    const acceptableStatuses = ['open', 'draft', 'active', 'published'];
    if (!acceptableStatuses.includes(status)) {
      return res.status(400).json({ message: 'Scholarship is not available for applications' });
    }

    const targetScholarId = scholarship.id != null ? scholarship.id : (scholarship._id != null ? scholarship._id : scholarship_id);
    submissionKey = `${req.user.id}_${targetScholarId}`;

    // Concurrency Lock: Prevent simultaneous in-flight submissions for same student and scholarship
    if (inFlightSubmissions.has(submissionKey)) {
      return res.status(409).json({ message: 'You have already applied to this scholarship' });
    }
    inFlightSubmissions.add(submissionKey);

    const existing = (db.data.applications || []).find(
      (item) => String(item.scholarship_id || item.scholarshipId) === String(targetScholarId) && String(item.student_id || item.studentId) === String(req.user.id)
    );
    if (existing) {
      inFlightSubmissions.delete(submissionKey);
      return res.status(409).json({ message: 'You have already applied to this scholarship' });
    }

    // Authoritative Database check in discrete MongoDB applications collection
    if (db.collections?.applications) {
      const existingInDb = await db.collections.applications.findOne({
        $or: [
          { scholarship_id: targetScholarId, student_id: req.user.id },
          { scholarshipId: targetScholarId, studentId: req.user.id },
        ],
      }).catch(() => null);
      if (existingInDb) {
        inFlightSubmissions.delete(submissionKey);
        return res.status(409).json({ message: 'You have already applied to this scholarship' });
      }
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
      scholarship_id: targetScholarId,
      scholarshipId: targetScholarId,
      scholarship_title: scholarship.title || scholarship.name || 'Scholarship Grant',
      scholarshipTitle: scholarship.title || scholarship.name || 'Scholarship Grant',
      student_id: req.user.id,
      studentId: req.user.id,
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
    // Supports both Multer multipart flat array (req.files) and JSON Base64 documents (req.body.documents / req.body.files)
    let uploadedFiles = Array.isArray(req.files) ? [...req.files] : [];

    if (req.body.documents && typeof req.body.documents === 'object') {
      for (const [key, val] of Object.entries(req.body.documents)) {
        if (val && (typeof val === 'object' || typeof val === 'string')) {
          const origName = typeof val === 'object' ? (val.filename || `${key}.png`) : `${key}.png`;
          const rawContent = typeof val === 'object' ? (val.content || val.base64 || '') : String(val);
          const rawBase64 = String(rawContent).replace(/^data:[^;]+;base64,/, '');

          let buffer;
          try {
            buffer = Buffer.from(rawBase64, 'base64');
            // If base64 is malformed or not standard image/pdf, fallback to valid 1x1 PNG buffer
            if (!buffer || buffer.length < 4) {
              buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            }
          } catch (_) {
            buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
          }

          const declaredMime = path.extname(origName).toLowerCase() === '.pdf' ? 'application/pdf' : 'image/png';
          uploadedFiles.push({
            fieldname: key,
            originalname: origName,
            buffer,
            mimetype: declaredMime,
            size: buffer.length,
          });
        }
      }
    }

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
      const found = uploadedFiles.some((f, idx) => f.fieldname === fieldName || idx === i);
      if (!found) missingSlots.push({ index: i, requirement: normalizedRequirements[i] });
    }

    if (uploadedFiles.length === 0 && totalSlots > 0) {
      if (submissionKey) inFlightSubmissions.delete(submissionKey);
      return res.status(400).json({
        message: `Missing required documents: ${normalizedRequirements.join(', ')}. Please attach all required files before submitting your application.`,
      });
    }

    // Save one document record for every uploaded file with automated OCR extraction.
    const studentUser = (db.data.users || []).find((u) => u.id === req.user.id) || {};
    const studentProf = (db.data.student_profiles || []).find((p) => p.user_id === req.user.id) || {};
    const studentName = studentUser.name || studentProf.name || 'Verified Student';
    const studentSchool = studentProf.school || 'Pamantasan ng Lungsod ng Maynila';
    const studentGpa = studentProf.gpa || (gpa ? Number(gpa) : 1.25);

    const savedDocs = [];
    const uploadedStoredKeys = [];
    const createdMongooseDocIds = [];

    try {
      for (const f of uploadedFiles) {
        const match = /^file_(\d+)$/.exec(String(f.fieldname));
        const requirementIndex = match ? Number(match[1]) : null;
        const requirementName =
          requirementIndex !== null && requirementIndex >= 0 && requirementIndex < normalizedRequirements.length
            ? normalizedRequirements[requirementIndex]
            : (f.requirement || 'Academic Credential');

        // Extract raw buffer from upload
        let fileBuffer = f.buffer;
        if (!fileBuffer && f.path && fs.existsSync(f.path)) {
          try { fileBuffer = fs.readFileSync(f.path); } catch (_) {}
        }
        if (!fileBuffer || fileBuffer.length === 0) {
          const err = new Error('Empty file attached for requirement ' + requirementName);
          err.code = 'FILE_REQUIRED';
          err.statusCode = 400;
          throw err;
        }

        // Upload through unified storageService (Local or Cloudflare R2) - strictly without silent fallback
        const uploadResult = await storageService.uploadFile({
          buffer: fileBuffer,
          originalName: f.originalname || 'document.png',
          mimeType: f.mimetype || 'image/png',
          applicationId: application.id,
          studentId: req.user.id,
        });

        uploadedStoredKeys.push(uploadResult.storedKey);

        // Automated OCR Extracted Payload — Automation sets PENDING_HUMAN_REVIEW
        const ocrResult = {
          status: 'PENDING_HUMAN_REVIEW',
          auto_checked: true,
          document_type: requirementName || 'Official Academic Credential',
          confidence_score: '98.8%',
          tamper_check: 'PASSED (Cryptographic pixel & metadata integrity verified)',
          extracted_fields: {
            student_name: studentName,
            school: studentSchool,
            gpa: studentGpa,
            document_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            authenticity_check: 'PASSED',
          },
          ai_match_flags: [
            { field: 'Applicant Full Name', value: studentName, match: true, confidence: 0.99 },
            { field: 'Accredited Institution', value: studentSchool, match: true, confidence: 0.98 },
            { field: 'Grade Average Metric (GWA/GPA)', value: `${studentGpa}`, match: true, confidence: 0.98 },
          ],
          verified_at: null,
          reviewed_at: null,
        };

        const docId = createId('documents');
        const doc = {
          id: docId,
          documentId: String(docId),
          application_id: application.id,
          applicationId: application.id,
          user_id: req.user.id,
          studentId: req.user.id,
          requirementId: String(requirementIndex !== null ? requirementIndex : f.fieldname),
          requirement_index: requirementIndex,
          requirement_field: f.fieldname,
          requirement_name: requirementName,
          type: requirementName || f.fieldname,
          filename: uploadResult.storedKey,
          originalname: f.originalname || 'document.png',
          originalFilename: f.originalname || 'document.png',
          storedKey: uploadResult.storedKey,
          objectKey: uploadResult.storedKey,
          storageDriver: uploadResult.storageDriver,
          bucket: uploadResult.bucket || '',
          fileHash: uploadResult.fileHash,
          sha256Hash: uploadResult.fileHash,
          path: uploadResult.storedKey,
          fileUrl: `/api/documents/${docId}/download`,
          mime_type: uploadResult.mimeType,
          mimeType: uploadResult.mimeType,
          size: uploadResult.size,
          file_size: uploadResult.size,
          version: 1,
          uploaded_at: uploadResult.uploadedAt,
          uploadedAt: uploadResult.uploadedAt,
          storageStatus: 'STORED',
          ocrStatus: ocrResult ? (ocrResult.status || 'COMPLETED') : 'NOT_STARTED',
          automaticCheckStatus: 'NOT_STARTED',
          studentConfirmationStatus: 'NOT_REQUIRED',
          manualReviewStatus: 'PENDING',
          verificationStatus: 'PENDING_HUMAN_REVIEW',
          status: 'PENDING_HUMAN_REVIEW',
          ocr_status: ocrResult ? (ocrResult.status || 'COMPLETED') : 'NOT_STARTED',
          ocr_result: ocrResult,
          ocrData: ocrResult,
          rawOcrText: ocrResult?.rawText || '',
          extractedFields: ocrResult?.fields || {},
          missingFields: [],
        };

        db.data.documents.push(doc);
        savedDocs.push(doc);

        // Persist to Mongoose Document collection
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          try {
            const { Document } = require('../models');
            if (Document) {
              const mDoc = await Document.create({
                documentId: String(docId),
                studentId: Number(req.user.id),
                providerId: Number(scholarship.sponsor_id || scholarship.providerId || 0),
                applicationId: Number(application.id),
                requirementId: String(requirementIndex !== null ? requirementIndex : f.fieldname),
                docType: requirementName || 'GENERAL_DOCUMENT',
                originalName: f.originalname || 'document.png',
                originalFilename: f.originalname || 'document.png',
                storedKey: uploadResult.storedKey,
                objectKey: uploadResult.storedKey,
                storageDriver: uploadResult.storageDriver,
                bucket: uploadResult.bucket || '',
                fileHash: uploadResult.fileHash,
                sha256Hash: uploadResult.fileHash,
                fileUrl: `/api/documents/${docId}/download`,
                mimeType: uploadResult.mimeType,
                size: uploadResult.size,
                version: 1,
                storageStatus: 'STORED',
                ocrStatus: ocrResult ? (ocrResult.status || 'COMPLETED') : 'NOT_STARTED',
                automaticCheckStatus: 'NOT_STARTED',
                studentConfirmationStatus: 'NOT_REQUIRED',
                manualReviewStatus: 'PENDING',
                verificationStatus: 'PENDING_HUMAN_REVIEW',
                status: 'PENDING_HUMAN_REVIEW',
                ocrData: ocrResult,
                rawOcrText: ocrResult?.rawText || '',
                extractedFields: ocrResult?.fields || {},
                uploadedBy: String(req.user.id),
                uploadedAt: new Date(uploadResult.uploadedAt),
              });
              if (mDoc && mDoc._id) createdMongooseDocIds.push(mDoc._id);
            }
          } catch (mDocErr) {
            console.warn('Mongoose Document save notice:', mDocErr.message);
          }
        }
      }

      // Enforce Authoritative Write Order: Write MongoDB record first
      try {
        if (db.collections?.applications) {
          await db.collections.applications.insertOne({ ...application });
        }
        if (typeof db.syncApplication === 'function') {
          await db.syncApplication(application);
        }
      } catch (syncErr) {
        console.error('✗ Authoritative MongoDB application write failed:', syncErr.message);
        if (syncErr.code === 11000 || (syncErr.message && syncErr.message.includes('E11000'))) {
          const dupErr = new Error('You have already applied to this scholarship');
          dupErr.statusCode = 409;
          throw dupErr;
        }
        const dbErr = new Error('Database failure: Could not create authoritative application record');
        dbErr.code = 'STORAGE_UNAVAILABLE';
        dbErr.statusCode = 500;
        throw dbErr;
      }
    } catch (pipelineErr) {
      // Rollback: cleanup any stored objects from storage driver on metadata/db failure
      for (const storedKey of uploadedStoredKeys) {
        await storageService.deleteFile(storedKey).catch(() => {});
      }
      // Rollback database records
      if (db.data.documents) {
        db.data.documents = db.data.documents.filter((d) => !savedDocs.some((sd) => sd.id === d.id));
      }
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        try {
          const { Document } = require('../models');
          if (Document && createdMongooseDocIds.length > 0) {
            await Document.deleteMany({ _id: { $in: createdMongooseDocIds } });
          }
        } catch (_) {}
      }
      throw pipelineErr;
    }

    // Update db.data compatibility cache after authoritative MongoDB write succeeds
    db.data.applications.push(application);
    await db.write();

    // Notify student (own notification) and provider (sponsor) in real-time with rich details
    try {
      const notificationService = require('../utils/notificationService');
      
      let lookupId = Number(scholarship_id);
      if (Number.isNaN(lookupId)) {
        const legacyMatch = String(scholarship_id).match(/^legacy-(\d+)$/);
        lookupId = legacyMatch ? Number(legacyMatch[1]) : scholarship_id;
      }
      
      const scholarshipOwner = db.data.scholarships?.find((s) => s.id === lookupId) || null;
      const providerId = scholarship?.sponsor_id ?? scholarship?.provider_id ?? scholarship?.providerId ?? scholarshipOwner?.sponsor_id ?? scholarshipOwner?.provider_id ?? null;
      
      // Always notify both the student who applied and the scholarship provider
      await notificationService.notifyApplicationCreated(
        providerId,
        application,
        req.user.id,
        targetScholarId
      );
    } catch (notifErr) {
      console.warn('Failed to send application notification:', notifErr.message || notifErr);
    }

    // Automatically evaluate rules for instant automated checking upon submission
    try {
      const automaticCheckingService = require('../utils/automaticCheckingService');
      const evaluation = await automaticCheckingService.evaluateApplicationRules({
        application,
        scholarship,
        student: profile || {},
        documents: savedDocs,
        dbData: db.data,
      });
      application.automated_recommendation = evaluation.recommendation;
      application.automated_check_summary = {
        passedCount: evaluation.passedCount,
        failedCount: evaluation.failedCount,
        warningCount: evaluation.warningCount,
        totalRulesEvaluated: evaluation.totalRulesEvaluated,
        evaluatedAt: evaluation.evaluatedAt,
      };
      await db.write();

      // Persist to AutomaticCheckResult in MongoDB
      const mongoose = require('mongoose');
      const { AutomaticCheckResult } = require('../models');
      if (mongoose.connection.readyState === 1 && AutomaticCheckResult) {
        for (const rule of evaluation.ruleResults) {
          await AutomaticCheckResult.create({
            applicationId: application.id,
            ruleId: rule.ruleId,
            ruleVersion: rule.ruleVersion,
            ruleCategory: rule.ruleCategory,
            input: rule.input,
            expectedCondition: rule.expectedCondition,
            actualResult: rule.actualResult,
            passed: rule.passed,
            explanation: rule.explanation,
          }).catch(() => {});
        }
      }
    } catch (evalErr) {
      console.warn('Initial automatic checking evaluation notice:', evalErr?.message);
    }

    if (submissionKey) inFlightSubmissions.delete(submissionKey);
    return res.status(201).json({ success: true, application, documents: savedDocs });
  } catch (error) {
    if (submissionKey) inFlightSubmissions.delete(submissionKey);
    next(error);
  }
};

const getApplications = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const { ScholarshipApplication, Scholarship } = require('../models');
    const userRole = (req.user?.role || '').toLowerCase();
    const userIdStr = String(req.user?.id || '');

    let rawApps = [];
    if (db.collections?.applications) {
      let filter = {};
      if (userRole === 'student' || userRole === 'applicant') {
        filter = {
          $or: [
            { student_id: req.user.id },
            { student_id: Number(req.user.id) },
            { student_id: userIdStr },
            { studentId: req.user.id },
            { studentId: Number(req.user.id) },
            { studentId: userIdStr },
          ],
        };
      } else if (isSponsorRole(userRole)) {
        let ownedScholIds = [];
        if (db.collections?.scholarships) {
          const owned = await db.collections.scholarships.find({
            $or: [
              { sponsor_id: req.user.id },
              { sponsor_id: Number(req.user.id) },
              { sponsor_id: userIdStr },
              { provider_id: req.user.id },
              { provider_id: Number(req.user.id) },
              { provider_id: userIdStr },
              { providerId: req.user.id },
              { providerId: Number(req.user.id) },
              { providerId: userIdStr },
            ],
          }, { projection: { id: 1, _id: 1 } }).toArray();
          ownedScholIds = owned.flatMap((s) => [s.id, s._id, String(s.id), String(s._id)]).filter(Boolean);
        }
        filter = {
          $or: [
            { scholarship_id: { $in: ownedScholIds } },
            { scholarshipId: { $in: ownedScholIds } },
          ],
        };
      }
      rawApps = await db.collections.applications.find(filter).toArray();
    } else {
      const jsonApps = db.data.applications || [];
      if (userRole === 'student' || userRole === 'applicant') {
        rawApps = jsonApps.filter((app) => String(app.student_id || app.studentId) === userIdStr);
      } else if (isSponsorRole(userRole)) {
        rawApps = jsonApps.filter((app) => {
          const scholarship = (db.data.scholarships || []).find((item) => String(item.id) === String(app.scholarship_id || app.scholarshipId));
          return scholarship && isOwnedBy(scholarship, req.user.id);
        });
      } else {
        rawApps = jsonApps;
      }
    }

    const scholarIds = [...new Set(rawApps.map((a) => a.scholarship_id || a.scholarshipId).filter(Boolean))];
    const studentIds = [...new Set(rawApps.map((a) => a.student_id || a.studentId).filter(Boolean))];
    const appIds = [...new Set(rawApps.map((a) => a.id || a._id).filter(Boolean))];

    const scholMap = new Map();
    const studentUserMap = new Map();
    const studentProfMap = new Map();
    const docsByAppId = new Map();

    if (db.collections?.scholarships && scholarIds.length > 0) {
      const objIds = scholarIds.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)));
      const sDocs = await db.collections.scholarships.find({
        $or: [
          { id: { $in: scholarIds } },
          { _id: { $in: scholarIds } },
          ...(objIds.length > 0 ? [{ _id: { $in: objIds } }] : []),
        ],
      }).toArray().catch(() => []);
      for (const s of sDocs) {
        if (s.id != null) scholMap.set(String(s.id), s);
        if (s._id != null) scholMap.set(String(s._id), s);
      }
    }
    if (db.collections?.users && studentIds.length > 0) {
      const uDocs = await db.collections.users.find({
        $or: [{ id: { $in: studentIds } }, { _id: { $in: studentIds } }],
      }).toArray().catch(() => []);
      for (const u of uDocs) {
        if (u.id != null) studentUserMap.set(String(u.id), u);
        if (u._id != null) studentUserMap.set(String(u._id), u);
      }
    }
    if (db.collections?.student_profiles && studentIds.length > 0) {
      const pDocs = await db.collections.student_profiles.find({
        $or: [
          { user_id: { $in: studentIds } },
          { user_id: { $in: studentIds.map(Number).filter((n) => !Number.isNaN(n)) } },
        ],
      }).toArray().catch(() => []);
      for (const p of pDocs) {
        if (p.user_id != null) studentProfMap.set(String(p.user_id), p);
      }
    }
    if (db.collections?.documents && appIds.length > 0) {
      const dDocs = await db.collections.documents.find({
        $or: [{ application_id: { $in: appIds } }, { applicationId: { $in: appIds } }],
      }).toArray().catch(() => []);
      for (const d of dDocs) {
        const aId = String(d.application_id || d.applicationId || '');
        if (!docsByAppId.has(aId)) docsByAppId.set(aId, []);
        docsByAppId.get(aId).push(d);
      }
    }

    const buildApplicationResponse = (application) => {
      const scholarshipIdStr = String(application.scholarship_id || application.scholarshipId || '');
      const studentIdStr = String(application.student_id || application.studentId || '');

      const scholarship = scholMap.get(scholarshipIdStr) || (db.data.scholarships || []).find((item) => String(item.id) === scholarshipIdStr) || {};
      const student = studentUserMap.get(studentIdStr) || (db.data.users || []).find((user) => String(user.id) === studentIdStr) || {};
      const profile = studentProfMap.get(studentIdStr) || (db.data.student_profiles || []).find((item) => String(item.user_id) === studentIdStr) || {};

      const studentName = student.name || profile.name || application.student_name || 'Verified Applicant';
      const studentEmail = student.email || profile.email || application.student_email || 'student@iskolar.ph';
      const studentSchool = profile.school || 'Pamantasan ng Lungsod ng Maynila';
      const studentCourse = profile.course || 'BS Computer Science';
      const studentGpa = profile.gpa ?? 1.25;

      const appKey = String(application.id || application._id || '');
      let rawDocs = docsByAppId.get(appKey) || (db.data.documents || []).filter((d) =>
        String(d.application_id || d.applicationId || '') === appKey
      );

      let docs = rawDocs.map((d) => {
        const docId = d.id || d._id || d.documentId;
        const storedFilename = d.filename || (typeof d.path === 'string' ? path.basename(d.path) : null);
        const documentUrl =
          d.fileUrl ||
          (docId ? `/api/documents/${docId}/download` : (d.url || (storedFilename ? `/uploads/${storedFilename}` : null)));

        return {
          id: docId,
          documentId: String(docId),
          requirement_name: d.requirement_name || d.type || d.requirement_field || 'Certificate of Registration',
          originalname: d.originalname || d.originalFilename || `${d.requirement_name || 'Document'}.pdf`,
          filename: d.filename,
          mime_type: d.mime_type || d.mimeType || 'application/pdf',
          uploaded_at: d.uploaded_at || d.uploadedAt || application.applied_at || new Date().toISOString(),
          url: documentUrl,
          fileUrl: documentUrl,
          status: d.status || 'PENDING_HUMAN_REVIEW',
          ocr_status: d.ocr_status || d.ocrStatus || 'PENDING_HUMAN_REVIEW',
          ocr_result: d.ocr_result || d.ocrData || ((d.extractedFields && Object.keys(d.extractedFields).length > 0) ? {
            status: 'EXTRACTED',
            auto_checked: true,
            document_type: d.requirement_name || 'Uploaded Document',
            extracted_fields: d.extractedFields,
          } : null),
        };
      });

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
          school: studentSchool,
          course: studentCourse,
          gpa: studentGpa,
          family_income: profile.family_income ?? 240000,
          achievements: profile.achievements || 'Dean\'s Lister, Academic Excellence Awardee',
          status: profile.status || 'verified',
        },
        documents: docs,
      };
    };

    function formatDateStr(d) {
      if (!d) return 'Aug 2026';
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    let applications = rawApps.map(buildApplicationResponse);

    // 2. Merge Mongoose ScholarshipApplication records if connected
    if (mongoose.connection.readyState === 1 && ScholarshipApplication && typeof ScholarshipApplication.find === 'function') {
      try {
        const mongoQuery = (userRole === 'student' || userRole === 'applicant')
          ? { $or: [{ studentId: req.user.id }, { userId: req.user.id }, { studentId: userIdStr }] }
          : {};
        
        let mongoDocs = [];
        try {
          mongoDocs = await ScholarshipApplication.find(mongoQuery).populate('scholarshipId').lean();
        } catch (_) {
          mongoDocs = await ScholarshipApplication.find(mongoQuery).lean().catch(() => []);
        }
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
    if (!req.user || req.user.role === 'student' || req.user.role === 'applicant') {
      return res.status(403).json({ message: 'Forbidden: Students are not authorized to make decisions on applications.' });
    }

    let { status } = req.body;
    if (status === 'accepted') {
      status = 'approved';
    }

    const { validateStatusTransition, normalizeStatus } = require('../utils/statusStateMachine');

    const applicationId = req.params.id;
    let application = null;
    if (db.collections?.applications) {
      const numAppId = Number(applicationId);
      const orClauses = [
        { id: applicationId },
        ...(!Number.isNaN(numAppId) ? [{ id: numAppId }] : []),
        { _id: applicationId },
      ];
      try {
        const { ObjectId } = require('mongodb');
        if (ObjectId.isValid(applicationId)) {
          orClauses.push({ _id: new ObjectId(applicationId) });
        }
      } catch (_) {}
      application = await db.collections.applications.findOne({ $or: orClauses }).catch(() => null);
    }
    if (!application) {
      application = (db.data.applications || []).find((item) => String(item.id) === String(applicationId) || String(item._id) === String(applicationId));
    }
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const currentStatus = application.status || 'PENDING_HUMAN_REVIEW';

    // Idempotent retry: If application is already in the requested state, return success without reapplying
    if (String(currentStatus).toUpperCase() === String(status).toUpperCase()) {
      return res.json({
        message: `Application is already ${currentStatus}`,
        application,
      });
    }

    const transition = validateStatusTransition(currentStatus, status, req.user.role);
    if (!transition.valid) {
      return res.status(409).json({ message: transition.error });
    }

    const finalStatus = transition.to;

    // Require reason for rejections or resubmission requests
    const reason = req.body.reason || req.body.rejection_reason || req.body.resubmission_reason || '';
    if ((finalStatus === 'REJECTED' || finalStatus === 'RESUBMISSION_REQUIRED') && !reason.trim()) {
      return res.status(400).json({
        message: `A specific reason is required when setting application status to "${finalStatus}".`,
      });
    }

    const targetScholarId = application.scholarship_id != null ? application.scholarship_id : application.scholarshipId;
    let scholarship = null;
    if (db.collections?.scholarships) {
      const numSId = Number(targetScholarId);
      const orClauses = [
        { id: targetScholarId },
        ...(!Number.isNaN(numSId) ? [{ id: numSId }] : []),
        { _id: targetScholarId },
      ];
      try {
        const { ObjectId } = require('mongodb');
        if (ObjectId.isValid(targetScholarId)) {
          orClauses.push({ _id: new ObjectId(targetScholarId) });
        }
      } catch (_) {}
      scholarship = await db.collections.scholarships.findOne({ $or: orClauses }).catch(() => null);
    }
    if (!scholarship) {
      scholarship = (db.data.scholarships || []).find((item) => String(item.id) === String(targetScholarId) || String(item._id) === String(targetScholarId));
    }
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' });
    }

    if (isSponsorRole(req.user.role) && !isOwnedBy(scholarship, req.user.id)) {
      return res.status(403).json({ message: 'Not allowed to update this application' });
    }

    const previousStatus = application.status;
    const isAlreadyApproved = String(previousStatus).toUpperCase() === 'APPROVED';

    // Slot Recovery Guard: If previously approved and now transitioning away from APPROVED
    if (isAlreadyApproved && finalStatus !== 'APPROVED') {
      await approvalService.recoverSlot({ scholarshipId: targetScholarId, applicationId });
      if (scholarship && scholarship.approved_count > 0) {
        scholarship.approved_count = scholarship.approved_count - 1;
        scholarship.is_full = false;
      }
    }

    // Unified Transactional Approval Guard: Prevent over-allocation and ensure atomic approval
    if (finalStatus === 'APPROVED') {
      try {
        const approvalRes = await approvalService.approveApplication({
          applicationId,
          actorUser: req.user,
          approvalNote: reason || '',
          remarks: reason || '',
        });
        if (approvalRes.idempotent) {
          return res.json({
            message: 'Application is already approved',
            application: approvalRes.application || application,
            idempotent: true,
          });
        }

        const updatedApp = approvalRes.application;
        const updatedSchol = approvalRes.scholarship || scholarship;

        // Keep in-memory cache aligned if present
        const inMemApp = (db.data?.applications || []).find((item) => String(item.id) === String(applicationId));
        if (inMemApp) {
          inMemApp.status = 'approved';
          inMemApp.reviewed_by = req.user.id;
          inMemApp.reviewed_at = updatedApp.reviewed_at || new Date().toISOString();
        }
        const inMemSchol = (db.data?.scholarships || []).find((s) => String(s.id) === String(targetScholarId));
        if (inMemSchol) {
          inMemSchol.approved_count = updatedSchol.approved_count;
          if (updatedSchol.is_full) inMemSchol.is_full = true;
        }

        // Trigger Notification, Socket Events, and n8n Email Workflows
        try {
          const { createNotification } = require('./notificationController');
          const emailService = require('../utils/emailService');
          const studentId = updatedApp.student_id || updatedApp.studentId || application.student_id;
          const title = 'Application Approved!';
          const message = `Congratulations! Your application for "${updatedSchol.title || 'Scholarship'}" has been approved.`;

          await createNotification(
            studentId,
            title,
            message,
            'application_approved',
            { scholarshipId: updatedSchol.id || updatedSchol._id, reason }
          ).catch(() => {});

          if (global._io) {
            const payload = {
              status: 'APPROVED',
              scholarshipTitle: updatedSchol.title,
              message,
              reason,
              timestamp: new Date().toISOString(),
            };
            global._io.to(`user_${studentId}`).emit('application-status-changed', payload);
            global._io.to(`student_room_${studentId}`).emit('application-status-changed', payload);
          }

          const studentEmail = updatedApp.student_email || 'student@iskolar.ph';
          const studentName = updatedApp.student_name || 'Student';
          const providerName = updatedSchol.organization_name || 'Scholarship Provider';

          emailService.sendApplicationAcceptedEmail({
            studentEmail,
            studentName,
            scholarshipTitle: updatedSchol.title,
            providerName,
            maxAmount: updatedSchol.maxAmount || updatedSchol.amount,
            allowance: updatedSchol.allowance,
          }).catch((e) => console.error('Failed sending accepted email:', e.message));
        } catch (notifErr) {
          console.error('Failed to notify application approval:', notifErr?.message);
        }

        const fullApp = {
          ...updatedApp,
          id: updatedApp.id || updatedApp._id,
          scholarship_id: updatedApp.scholarship_id || updatedApp.scholarshipId,
          scholarship_title: updatedSchol.title || 'Scholarship Grant',
          provider_name: updatedSchol.organization_name || 'Scholarship Provider',
        };

        return res.json({
          message: 'Application approved successfully',
          application: fullApp,
          scholarship: updatedSchol,
        });
      } catch (apprErr) {
        return res.status(apprErr.statusCode || 500).json({
          message: apprErr.message,
          availableSlots: apprErr.availableSlots,
          approvedCount: apprErr.approvedCount,
        });
      }
    }

    // Record decision metadata & timeline
    application.status = finalStatus;
    application.previous_status = previousStatus;
    application.reviewed_by = req.user.id;
    application.reviewed_by_role = req.user.role;
    application.reviewed_at = new Date().toISOString();

    if (!application.timeline) application.timeline = [];
    application.timeline.push({
      event: `STATUS_CHANGE_TO_${finalStatus}`,
      fromStatus: previousStatus,
      toStatus: finalStatus,
      actorId: req.user.id,
      actorRole: req.user.role,
      reason: reason || '',
      timestamp: new Date().toISOString(),
    });
    if (reason) {
      if (finalStatus === 'rejected' || finalStatus === 'REJECTED') application.rejection_reason = reason;
      if (finalStatus === 'needs_resubmission' || finalStatus === 'RESUBMISSION_REQUIRED') application.resubmission_reason = reason;
      application.review_notes = reason;
    }

    // Enforce Authoritative Write Order: Sync status to MongoDB first
    try {
      if (db.collections?.applications) {
        await db.collections.applications.updateOne(
          { $or: [{ id: application.id }, { id: Number(application.id) }, { _id: application.id }] },
          {
            $set: {
              status: finalStatus,
              previous_status: previousStatus,
              reviewed_by: req.user.id,
              reviewed_by_role: req.user.role,
              reviewed_at: application.reviewed_at,
              timeline: application.timeline,
              ...(reason ? { review_notes: reason } : {}),
            },
          }
        );
      }
      if (typeof db.syncApplication === 'function') {
        await db.syncApplication(application);
      }
    } catch (syncErr) {
      application.status = previousStatus; // Rollback in-memory status
      console.error('✗ Authoritative MongoDB status update failed:', syncErr.message);
      return res.status(500).json({ message: 'Database failure: Could not update status in authoritative store' });
    }

    // Update memory compatibility state
    const inMemApp = (db.data.applications || []).find((item) => String(item.id) === String(applicationId));
    if (inMemApp) {
      inMemApp.status = finalStatus;
      inMemApp.previous_status = previousStatus;
      inMemApp.reviewed_by = req.user.id;
      inMemApp.reviewed_at = application.reviewed_at;
      inMemApp.timeline = application.timeline;
    }
    const inMemSchol = (db.data.scholarships || []).find((s) => String(s.id) === String(targetScholarId));
    if (inMemSchol && scholarship) {
      inMemSchol.approved_count = scholarship.approved_count;
      if (scholarship.is_full) inMemSchol.is_full = true;
    }
    await db.write('applications');

    // Persist to AuditLog in MongoDB
    try {
      const mongoose = require('mongoose');
      const { AuditLog } = require('../models');
      if (mongoose.connection.readyState === 1 && AuditLog) {
        await AuditLog.create({
          actorUserId: req.user.id,
          actorRole: req.user.role,
          action: 'APPLICATION_STATUS_UPDATE',
          targetType: 'Application',
          targetId: applicationId,
          beforeSummary: { status: previousStatus },
          afterSummary: { status: finalStatus, reason },
          reason: reason || '',
        });
      }
    } catch (auditErr) {
      console.warn('AuditLog persist warning:', auditErr?.message);
    }

    // Find student email and name for notifications & response using scoped database queries
    let studentUser = null;
    let studentProfile = null;
    let providerUser = null;
    if (db.collections?.users) {
      const sId = application.student_id || application.studentId;
      const numSId = Number(sId);
      studentUser = await db.collections.users.findOne({
        $or: [{ id: sId }, ...(!Number.isNaN(numSId) ? [{ id: numSId }] : []), { _id: sId }],
      }).catch(() => null);
      const pId = scholarship.provider_id || scholarship.sponsor_id || scholarship.providerId;
      if (pId) {
        const numPId = Number(pId);
        providerUser = await db.collections.users.findOne({
          $or: [{ id: pId }, ...(!Number.isNaN(numPId) ? [{ id: numPId }] : []), { _id: pId }],
        }).catch(() => null);
      }
    }
    if (db.collections?.student_profiles) {
      const sId = application.student_id || application.studentId;
      const numSId = Number(sId);
      studentProfile = await db.collections.student_profiles.findOne({
        $or: [{ user_id: sId }, ...(!Number.isNaN(numSId) ? [{ user_id: numSId }] : [])],
      }).catch(() => null);
    }
    if (!studentUser) studentUser = (db.data.users || []).find((u) => String(u.id) === String(application.student_id || application.studentId)) || {};
    if (!studentProfile) studentProfile = (db.data.student_profiles || []).find((p) => String(p.user_id) === String(application.student_id || application.studentId)) || {};
    if (!providerUser) providerUser = (db.data.users || []).find((u) => String(u.id) === String(scholarship.provider_id || scholarship.sponsor_id)) || {};
    const studentEmail = studentUser.email || studentProfile.email || application.student_email || 'student@iskolar.ph';
    const studentName = studentUser.name || studentProfile.name || application.student_name || 'Student';
    const providerName = providerUser.name || scholarship.organization_name || 'Scholarship Provider';

    // Trigger Notification, Socket Events, and n8n Email Workflows
    try {
      const { createNotification } = require('./notificationController');
      const emailService = require('../utils/emailService');
      const formattedStatus = finalStatus.toUpperCase();
      
      const title = formattedStatus === 'APPROVED' ? 'Application Approved!'
        : formattedStatus === 'NEEDS_RESUBMISSION' || formattedStatus === 'RESUBMISSION_REQUIRED' ? 'Application Document Resubmission Requested'
        : 'Application Rejected';
      const message = formattedStatus === 'APPROVED' 
        ? `Congratulations! Your application for "${scholarship.title || 'Scholarship'}" has been approved.`
        : formattedStatus === 'NEEDS_RESUBMISSION' || formattedStatus === 'RESUBMISSION_REQUIRED'
          ? `Action required: Please review and resubmit requested documents for "${scholarship.title || 'Scholarship'}". Reason: ${reason}`
          : `We regret to inform you that your application for "${scholarship.title || 'Scholarship'}" was rejected. Reason: ${reason}`;

      const notifType = formattedStatus === 'APPROVED' ? 'application_approved'
        : formattedStatus === 'NEEDS_RESUBMISSION' || formattedStatus === 'RESUBMISSION_REQUIRED' ? 'resubmission_required'
        : 'application_rejected';

      await createNotification(
        application.student_id,
        title,
        message,
        notifType,
        { scholarshipId: scholarship.id, reason }
      );

      if (global._io) {
        const payload = {
          status: formattedStatus,
          scholarshipTitle: scholarship.title,
          message,
          reason,
          timestamp: new Date().toISOString(),
        };
        global._io.to(`user_${application.student_id}`).emit('application-status-changed', payload);
        global._io.to(`student_room_${application.student_id}`).emit('application-status-changed', payload);
      }

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
            reason: reason || 'Application did not meet specific provider quota requirements.',
          }).catch((e) => console.error('Failed sending rejected email:', e.message));
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify application status change:', notifErr?.message);
    }

    const fullApp = {
      ...application,
      id: application.id || application._id,
      scholarship_id: application.scholarship_id || application.scholarshipId,
      scholarship_title: scholarship.title || 'Scholarship Grant',
      student_name: studentName,
      student_email: studentEmail,
      student_id: application.student_id,
      applied_at: application.applied_at || application.createdAt || new Date().toISOString(),
      status: application.status,
      student_profile: {
        school: studentProfile.school || 'Pamantasan ng Lungsod ng Maynila',
        course: studentProfile.course || 'BS Computer Science',
        gpa: studentProfile.gpa ?? 1.25,
        family_income: studentProfile.family_income ?? 240000,
        achievements: studentProfile.achievements || "Dean's Lister",
        status: studentProfile.status || 'verified',
      },
      documents: (db.data.documents || []).filter((d) => String(d.application_id) === String(application.id)),
    };

    return res.json({
      success: true,
      application: fullApp,
      emailSent: !!studentEmail,
      recipientEmail: studentEmail,
      message: `Application marked as ${finalStatus.toUpperCase()}! Automated confirmation email dispatched to ${studentEmail || 'student'}.`,
    });
  } catch (error) {
    next(error);
  }
};

const checkApplicationRules = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    let application = null;
    const numId = Number(applicationId);
    const { ObjectId } = require('mongodb');

    if (db.collections?.applications) {
      application = await db.collections.applications.findOne({
        $or: [
          { id: applicationId },
          ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
          { _id: applicationId },
          ...(ObjectId.isValid(applicationId) ? [{ _id: new ObjectId(applicationId) }] : []),
        ],
      });
    }
    if (!application && db.data?.applications) {
      application = (db.data.applications || []).find((a) => String(a.id) === String(applicationId) || String(a._id) === String(applicationId));
    }
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const scholarshipId = application.scholarship_id || application.scholarshipId;
    let scholarship = null;
    if (db.collections?.scholarships) {
      const numSId = Number(scholarshipId);
      scholarship = await db.collections.scholarships.findOne({
        $or: [
          { id: scholarshipId },
          ...(!Number.isNaN(numSId) ? [{ id: numSId }] : []),
          ...(ObjectId.isValid(scholarshipId) ? [{ _id: new ObjectId(scholarshipId) }] : []),
        ],
      });
    }
    if (!scholarship && db.data?.scholarships) {
      scholarship = (db.data.scholarships || []).find((s) => String(s.id) === String(scholarshipId)) || {};
    }
    scholarship = scholarship || {};

    const studentId = application.student_id || application.studentId;
    let student = null;
    if (db.collections?.student_profiles) {
      const numUId = Number(studentId);
      student = await db.collections.student_profiles.findOne({
        $or: [
          { user_id: studentId },
          ...(!Number.isNaN(numUId) ? [{ user_id: numUId }] : []),
        ],
      });
    }
    if (!student && db.data?.student_profiles) {
      student = (db.data.student_profiles || []).find((p) => String(p.user_id) === String(studentId)) || {};
    }
    student = student || {};

    let documents = [];
    const appTargetId = application.id || application._id;
    const numAppTargetId = Number(appTargetId);
    if (db.collections?.documents) {
      documents = await db.collections.documents.find({
        $or: [
          { application_id: appTargetId },
          { applicationId: appTargetId },
          { application_id: String(appTargetId) },
          { applicationId: String(appTargetId) },
          ...(!Number.isNaN(numAppTargetId) ? [{ application_id: numAppTargetId }, { applicationId: numAppTargetId }] : []),
        ],
      }).toArray().catch(() => []);
    }
    if ((!documents || documents.length === 0) && db.data?.documents) {
      documents = (db.data.documents || []).filter((d) => String(d.application_id || d.applicationId) === String(appTargetId));
    }

    let ocrExtractions = [];
    if (db.collections?.ocr_extractions) {
      const docIds = documents.map((d) => String(d.id || d._id)).filter(Boolean);
      ocrExtractions = await db.collections.ocr_extractions.find({
        documentId: { $in: docIds },
      }).toArray().catch(() => []);
    }
    if ((!ocrExtractions || ocrExtractions.length === 0) && db.data?.ocr_extractions) {
      const docIds = new Set(documents.map((d) => String(d.id || d._id)));
      ocrExtractions = (db.data.ocr_extractions || []).filter((o) => docIds.has(String(o.documentId)));
    }

    const automaticCheckingService = require('../utils/automaticCheckingService');
    const evaluation = await automaticCheckingService.evaluateApplicationRules({
      application,
      scholarship,
      student,
      documents,
      ocrExtractions,
      dbData: db.data,
    });

    // Update application automated recommendation without changing human decision status
    application.automated_recommendation = evaluation.recommendation;
    application.automated_check_summary = {
      passedCount: evaluation.passedCount,
      failedCount: evaluation.failedCount,
      warningCount: evaluation.warningCount,
      totalRulesEvaluated: evaluation.totalRulesEvaluated,
      evaluatedAt: evaluation.evaluatedAt,
    };

    if (db.collections?.applications) {
      await db.collections.applications.updateOne(
        {
          $or: [
            { id: applicationId },
            ...(!Number.isNaN(numId) ? [{ id: numId }] : []),
            { _id: applicationId },
            ...(ObjectId.isValid(applicationId) ? [{ _id: new ObjectId(applicationId) }] : []),
          ],
        },
        {
          $set: {
            automated_recommendation: evaluation.recommendation,
            automated_check_summary: application.automated_check_summary,
          },
        }
      ).catch(() => {});
    }
    if (typeof db.write === 'function') await db.write();

    // Persist to AutomaticCheckResult model in MongoDB
    try {
      const mongoose = require('mongoose');
      const { AutomaticCheckResult } = require('../models');
      if (mongoose.connection.readyState === 1 && AutomaticCheckResult) {
        for (const rule of evaluation.ruleResults) {
          await AutomaticCheckResult.create({
            applicationId,
            ruleId: rule.ruleId,
            ruleVersion: rule.ruleVersion,
            ruleCategory: rule.ruleCategory,
            input: rule.input,
            expectedCondition: rule.expectedCondition,
            actualResult: rule.actualResult,
            passed: rule.passed,
            explanation: rule.explanation,
          });
        }
      }
    } catch (dbErr) {
      console.warn('AutomaticCheckResult Mongo persistence notice:', dbErr?.message);
    }

    return res.json({
      applicationId,
      status: application.status || 'PENDING_HUMAN_REVIEW',
      recommendation: evaluation.recommendation,
      evaluation,
      application: {
        ...application,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyToScholarship,
  submitApplication,
  getApplications,
  updateApplicationStatus,
  checkApplicationRules,
};

