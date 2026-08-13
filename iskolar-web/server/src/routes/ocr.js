const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { extractFromDocument, verifyDocumentData, updateDocumentStatus, confirmOcrExtraction } = require('../controllers/ocrController');

const router = express.Router();

// Configure multer for OCR uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'ocr');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'ocr-' + unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for OCR images
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
  },
});

// OCR extraction
router.post('/extract', authMiddleware, upload.single('document'), extractFromDocument);

// Verify extracted data against user profile
router.post('/verify', authMiddleware, verifyDocumentData);

// Confirm OCR extraction and edits
router.post('/confirm', authMiddleware, confirmOcrExtraction);

// Admin: update document verification status
router.put('/documents/:id/status', authMiddleware, roleMiddleware(['admin', 'provider']), updateDocumentStatus);

module.exports = router;
