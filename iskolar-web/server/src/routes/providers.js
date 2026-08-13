const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { getProviderDashboard } = require('../controllers/providerController');

const router = express.Router();

router.get('/dashboard', authMiddleware, roleMiddleware(['sponsor', 'provider']), getProviderDashboard);

module.exports = router;
