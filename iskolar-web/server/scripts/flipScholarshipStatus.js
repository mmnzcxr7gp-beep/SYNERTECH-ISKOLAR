#!/usr/bin/env node
/*
  flipScholarshipStatus.js
  Usage: node scripts/flipScholarshipStatus.js <legacyScholarshipId>

  This script connects to the backend app_state (or in-memory fallback)
  and sets the legacy scholarship with the provided id to status 'open'.
  It calls `db.write()` so the change persists to the `app_state` document
  when Mongo is available.
*/

const { connectDb } = require('../src/config/db');

(async () => {
  const idArg = process.argv[2];
  if (!idArg) {
    console.error('Usage: node scripts/flipScholarshipStatus.js <legacyScholarshipId>');
    process.exit(1);
  }

  try {
    const dbObj = await connectDb();

    const scholarships = Array.isArray(dbObj.data.scholarships) ? dbObj.data.scholarships : [];
    const idx = scholarships.findIndex((s) => String(s.id) === String(idArg));

    if (idx === -1) {
      console.error(`Legacy scholarship with id=${idArg} not found in app_state`);
      process.exit(2);
    }

    scholarships[idx].status = 'open';

    await dbObj.write();

    console.log(`✓ Legacy scholarship id=${idArg} status set to 'open' in app_state`);
    process.exit(0);
  } catch (err) {
    console.error('✗ Failed to flip scholarship status:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
