require('dotenv').config();

// Backward-compatible export so other tooling can still import the app.
// NOTE: For Vercel, you should deploy `backend/api.js` which exports a Vercel handler.

const { buildApp } = require('./vercelApp')

module.exports = buildApp()

