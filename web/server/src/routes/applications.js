const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  applyToScholarship,
  getApplications,
  updateApplicationStatus,
  checkApplicationRules,
} = require('../controllers/applicationController');
const { db } = require('../config/db');
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
router.get('/student', authMiddleware, getApplications);
router.get('/student/list', authMiddleware, getApplications);
router.get('/provider', authMiddleware, getApplications);
router.get('/provider/list', authMiddleware, getApplications);


// Explainable Automated Document & Eligibility Rules Checking
router.post('/:id/check-rules', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), checkApplicationRules);
router.get('/:id/check-rules', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), checkApplicationRules);
router.get('/:id/rules', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), checkApplicationRules);

// Human-Controlled Decision Authorization
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    let app = null;
    if (db.collections?.applications) {
      const id = req.params.id;
      const orClauses = [{ id }, { id: Number(id) }, { _id: id }];
      try {
        const { ObjectId } = require('mongodb');
        if (ObjectId.isValid(id)) {
          orClauses.push({ _id: new ObjectId(id) });
        }
      } catch (_) {}
      app = await db.collections.applications.findOne({ $or: orClauses });
    }
    if (!app) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        const { ScholarshipApplication } = require('../models');
        if (ScholarshipApplication) {
          app = await ScholarshipApplication.findOne({
            $or: [{ _id: req.params.id }, { id: req.params.id }],
          }).lean().catch(() => null);
        }
      }
    }
    if (!app && db.data?.applications) {
      app = (db.data.applications || []).find((a) => String(a.id) === String(req.params.id) || String(a._id) === String(req.params.id));
    }
    if (!app) return res.status(404).json({ message: 'Application not found' });
    return res.json({ application: app, ...app });
  } catch (err) {
    next(err);
  }
});
router.put('/:id/status', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), sponsorVerification, updateApplicationStatus);
router.patch('/:id/status', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), sponsorVerification, updateApplicationStatus);

// Post-Review Workflow & Next Actions (More Info, Resubmission, Schedule, Qualified, Approve, Reject)
const workflowController = require('../controllers/applicationWorkflowController');

router.get('/:id/conversation', authMiddleware, workflowController.getApplicationConversation);
router.post('/:id/messages', authMiddleware, workflowController.sendMessage);
router.post('/:id/action', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), workflowController.executeReviewAction);
router.post('/:id/review-action', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), workflowController.executeReviewAction);

// Student Interactive Follow-ups
router.post('/:id/more-info-response', authMiddleware, roleMiddleware(['student']), workflowController.respondToMoreInformation);
router.post('/:id/more-information-response', authMiddleware, roleMiddleware(['student']), workflowController.respondToMoreInformation);
router.post('/:id/resubmit-document', authMiddleware, roleMiddleware(['student']), workflowController.resubmitDocument);
router.post('/:id/document-resubmission', authMiddleware, roleMiddleware(['student']), workflowController.resubmitDocument);
router.post('/:id/acknowledge-schedule', authMiddleware, roleMiddleware(['student']), workflowController.acknowledgeSchedule);
router.post('/:id/acknowledge-approval', authMiddleware, roleMiddleware(['student']), workflowController.acknowledgeApproval);

module.exports = router;

