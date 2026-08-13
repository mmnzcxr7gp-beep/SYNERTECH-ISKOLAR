const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isOwnedBy } = require('../utils/ownership');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

/**
 * Helper to sanitize filename and prevent path traversal
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return null;
  
  // Perform multi-layer URI decoding (handles double-encoded input e.g. %252e%252e)
  let decoded = filename;
  try {
    let prev = '';
    while (decoded !== prev && decoded.includes('%')) {
      prev = decoded;
      decoded = decodeURIComponent(decoded);
    }
  } catch (_) {}

  // Check for path traversal attempts, null bytes, absolute paths, or path separators
  if (
    decoded.includes('..') ||
    decoded.includes('/') ||
    decoded.includes('\\') ||
    decoded.includes('\0') ||
    decoded.startsWith('~')
  ) {
    return null; // Traversal or unsafe path detected
  }

  return path.basename(decoded);
};

/**
 * GET /api/documents/:id/download or GET /uploads/:filename
 * Secure document retrieval with object-level authorization (student owner, assigned provider, admin)
 */
const handleDocumentDownload = async (req, res, next) => {
  try {
    const docIdOrFilename = req.params.id || req.params.filename;

    // 1. Path Traversal & Parameter Validation
    const cleanFilename = sanitizeFilename(docIdOrFilename);
    if (!cleanFilename) {
      return res.status(400).json({ message: 'Invalid or malformed document identifier' });
    }

    // 2. Authentication Check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // 3. Document Metadata Lookup (Check db.data.documents or Mongoose)
    const docIdStr = String(docIdOrFilename);
    let doc = (db.data.documents || []).find(
      (d) => String(d.id) === docIdStr || d.filename === cleanFilename || d.originalname === cleanFilename
    );

    if (!doc) {
      // Fallback: check Mongoose Document model if connected
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        try {
          const { Document, ApplicationDocument } = require('../models');
          if (Document) {
            const mDoc = await Document.findById(docIdStr).lean().catch(() => null);
            if (mDoc) {
              doc = {
                id: mDoc._id.toString(),
                user_id: mDoc.userId,
                filename: mDoc.filename || cleanFilename,
                mime_type: mDoc.mimeType || mDoc.mime_type,
                path: mDoc.path,
              };
            }
          }
        } catch (_) {}
      }
    }

    if (!doc) {
      // Safe 404 response without leaking metadata
      return res.status(404).json({ message: 'Document not found' });
    }

    // 4. Object-Level Authorization Check
    const userRole = (req.user.role || '').toLowerCase();
    const userIdStr = String(req.user.id);
    const docUserIdStr = String(doc.user_id || doc.userId || '');

    let isAuthorized = false;

    if (userRole === 'admin') {
      // Admin role has full access
      isAuthorized = true;
    } else if (userRole === 'student' || userRole === 'applicant') {
      // Student must be the owner of the document
      isAuthorized = docUserIdStr === userIdStr;
    } else if (userRole === 'provider' || userRole === 'sponsor') {
      // Provider must own the scholarship associated with the document's application
      if (doc.application_id) {
        const app = (db.data.applications || []).find((a) => String(a.id) === String(doc.application_id));
        if (app) {
          const scholarship = (db.data.scholarships || []).find((s) => String(s.id) === String(app.scholarship_id));
          if (scholarship && isOwnedBy(scholarship, req.user.id)) {
            isAuthorized = true;
          }
        }
      }
      // If user_id matches provider direct upload
      if (docUserIdStr === userIdStr) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this document' });
    }

    // 5. Physical File Streaming
    const storedFilename = doc.filename || cleanFilename;
    const safeFilePath = path.join(uploadsDir, path.basename(storedFilename));

    if (!fs.existsSync(safeFilePath)) {
      return res.status(404).json({ message: 'Physical file not found' });
    }

    const mimeType = doc.mime_type || doc.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalname || path.basename(safeFilePath)}"`);

    const stream = fs.createReadStream(safeFilePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Route definitions
router.get('/:id/download', authMiddleware, handleDocumentDownload);
router.get('/file/:filename', authMiddleware, handleDocumentDownload);

module.exports = {
  router,
  handleDocumentDownload,
  sanitizeFilename,
};
