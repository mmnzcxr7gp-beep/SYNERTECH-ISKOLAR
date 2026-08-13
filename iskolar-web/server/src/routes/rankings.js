const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { getScholarshipRankings, recalculateRankings } = require('../controllers/rankingController');

const router = express.Router();

router.get('/scholarship/:id', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), getScholarshipRankings);
router.post('/scholarship/:id/recalculate', authMiddleware, roleMiddleware(['sponsor', 'provider', 'admin']), recalculateRankings);

module.exports = router;
