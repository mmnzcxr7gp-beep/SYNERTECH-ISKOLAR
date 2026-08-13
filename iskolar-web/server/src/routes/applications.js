const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  applyToScholarship,
  getApplications,
  updateApplicationStatus,
} = require('../controllers/applicationController');
const sponsorVerification = require('../middleware/sponsorVerification');

const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});

const upload = multer({ storage });

router.post(
  '/submit',
  authMiddleware,
  roleMiddleware(['student']),
  upload.any(),
  require('../controllers/applicationController').submitApplication
);

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['student']),
  upload.any(),
  require('../controllers/applicationController').submitApplication
);

// Route aliases so all clients (web and mobile) can fetch applications & update statuses cleanly
router.get('/', authMiddleware, getApplications);
router.get('/my-applications', authMiddleware, getApplications);
router.get('/user', authMiddleware, getApplications);

router.put('/:id/status', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), sponsorVerification, updateApplicationStatus);
router.patch('/:id/status', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), sponsorVerification, updateApplicationStatus);

module.exports = router;
