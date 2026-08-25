const { buildApp, connectMongoose } = require('./src/vercelApp');
const { connectDb } = require('./src/config/db');

// Initialize MongoDB & Mongoose connections if configured
connectDb().catch((err) => {
  console.warn('⚠️ MongoClient initial connection warning:', err?.message || err);
});

connectMongoose().catch((err) => {
  console.warn('⚠️ Mongoose initial connection warning:', err?.message || err);
});

const app = buildApp();

module.exports = app;
module.exports.app = app;


