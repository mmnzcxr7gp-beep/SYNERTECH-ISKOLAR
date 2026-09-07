const express = require('express');
const { handleChatbotQuery } = require('../controllers/chatbotController');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/chatbot/query - Permission-aware student inquiry endpoint
router.post('/query', optionalAuthMiddleware, handleChatbotQuery);

module.exports = router;
