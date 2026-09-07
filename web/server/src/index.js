require('dotenv').config();

// Backward-compatible export so other tooling can still import the app.
// Authoritative backend runtime is hosted as a long-running Node.js process on Render (server.js).

const { buildApp } = require('./vercelApp');

module.exports = buildApp()

