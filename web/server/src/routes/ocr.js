const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { extractFromDocument, verifyDocumentData, updateDocumentStatus, confirmOcrExtraction, scanDocumentById } = require('../controllers/ocrController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for OCR images
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else {
      const err = new Error('Only JPEG, PNG, WebP, and PDF files are allowed');
      err.code = 'FILE_TYPE_NOT_ALLOWED';
      cb(err);
    }
  },
});

// OCR extraction
router.post('/extract', authMiddleware, upload.single('document'), extractFromDocument);

// On-demand document physical OCR scan & profile cross-check
router.post('/scan-document/:id', authMiddleware, scanDocumentById);
router.get('/scan-document/:id', authMiddleware, scanDocumentById);
router.post('/scan/:id', authMiddleware, scanDocumentById);
router.get('/scan/:id', authMiddleware, scanDocumentById);

// Verify extracted data against user profile
router.post('/verify', authMiddleware, verifyDocumentData);

// Confirm OCR extraction and edits
router.post('/confirm', authMiddleware, confirmOcrExtraction);

// Admin & Provider: update document verification status
router.put('/documents/:id/status', authMiddleware, roleMiddleware(['admin', 'provider', 'sponsor']), updateDocumentStatus);
router.put('/verify/:id', authMiddleware, roleMiddleware(['admin', 'provider', 'sponsor']), updateDocumentStatus);

module.exports = router;
