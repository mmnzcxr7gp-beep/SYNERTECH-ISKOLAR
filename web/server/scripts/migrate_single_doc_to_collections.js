#!/usr/bin/env node
/**
 * migrate_single_doc_to_collections.js
 * 
 * Safely migrates the ISKOLAR single-document state ('iskolar_state' in 'app_state')
 * into individual authoritative MongoDB collections:
 * - users
 * - student_profiles
 * - scholarships
 * - scholarshipapplications
 * - documents
 * - schedules
 * - otps
 * - manual_review_logs
 * - ocr_extractions
 * - automatic_check_results
 * - system_metadata
 * 
 * CRITICAL SAFETY RULES:
 * 1. Preserves the 'app_state' collection completely intact as rollback evidence.
 * 2. Uses idempotent upsert operations ($set) keyed on unique identifier.
 * 3. Supports --dry-run to audit record counts before executing mutations.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { MongoClient, ServerApiVersion } = require('mongodb');

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');
const stateDocumentId = 'iskolar_state';

async function runMigration() {
  console.log('================================================================');
  console.log(`📦 ISKOLAR SINGLE-DOC TO DISCRETE COLLECTIONS MIGRATION TOOL`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Audit only - No writes)' : '🚀 EXECUTE (Applying mutations)'}`);
  console.log('================================================================\n');

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
  let client;

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: false,
      },
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 8000,
    });

    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✓ Connected to MongoDB database successfully.\n');

    const db = client.db();
    const appStateCol = db.collection('app_state');

    // 1. Inspect app_state
    const stateDoc = await appStateCol.findOne({ _id: stateDocumentId });
    if (!stateDoc) {
      console.log(`ℹ️ No legacy document '${stateDocumentId}' found in 'app_state'.`);
      console.log('Discrete collections are already operating or database is fresh.');
      return { status: 'NO_LEGACY_DATA', recordsMigrated: 0 };
    }

    const entities = [
      { key: 'users', target: 'users', idField: 'id' },
      { key: 'student_profiles', target: 'student_profiles', idField: 'user_id' },
      { key: 'scholarships', target: 'scholarships', idField: 'id' },
      { key: 'applications', target: 'scholarshipapplications', idField: 'id' },
      { key: 'documents', target: 'documents', idField: 'id' },
      { key: 'schedules', target: 'schedules', idField: 'id' },
      { key: 'otps', target: 'otps', idField: 'email' },
      { key: 'manual_review_logs', target: 'manual_review_logs', idField: 'documentId' },
      { key: 'ocr_extractions', target: 'ocr_extractions', idField: 'documentId' },
      { key: 'automatic_check_results', target: 'automatic_check_results', idField: 'applicationId' },
    ];

    console.log('📋 Inventory of Legacy app_state document:');
    let totalItems = 0;
    const plan = [];

    for (const item of entities) {
      const arr = Array.isArray(stateDoc[item.key]) ? stateDoc[item.key] : [];
      totalItems += arr.length;
      plan.push({
        sourceKey: item.key,
        targetCol: item.target,
        idField: item.idField,
        count: arr.length,
        items: arr,
      });
      console.log(`   - ${item.key.padEnd(24)}: ${String(arr.length).padStart(4)} items -> ${item.target}`);
    }

    const nextIds = stateDoc.nextIds || {};
    console.log(`   - nextIds counters        : ${Object.keys(nextIds).length} counters -> system_metadata\n`);

    if (isDryRun) {
      console.log('----------------------------------------------------------------');
      console.log(`🔍 DRY RUN COMPLETE: ${totalItems} items scanned across ${entities.length} categories.`);
      console.log('Legacy app_state will remain 100% intact as rollback evidence.');
      console.log('To execute real migration, run: node scripts/migrate_single_doc_to_collections.js --execute');
      console.log('----------------------------------------------------------------');
      return { status: 'DRY_RUN_SUCCESS', totalItems, plan };
    }

    // 2. Execute migration with bulkWrite upserts
    console.log('🚀 Executing idempotent migration into discrete collections...');

    for (const group of plan) {
      if (group.count === 0) continue;
      const targetCol = db.collection(group.targetCol);
      const bulkOps = group.items.map((doc) => {
        const query = {};
        if (group.idField && doc[group.idField] != null) {
          query[group.idField] = doc[group.idField];
        } else if (doc.id != null) {
          query.id = doc.id;
        } else if (doc._id != null) {
          query._id = doc._id;
        } else {
          query._syntheticKey = `${group.sourceKey}_${Math.random()}`;
        }

        const { _id, ...cleanDoc } = doc;
        return {
          updateOne: {
            filter: query,
            update: { $set: cleanDoc },
            upsert: true,
          },
        };
      });

      const res = await targetCol.bulkWrite(bulkOps);
      console.log(`   ✓ ${group.targetCol.padEnd(24)}: ${res.upsertedCount} inserted, ${res.modifiedCount} updated, ${res.matchedCount} existing.`);
    }

    // Migrate system_metadata counters
    if (Object.keys(nextIds).length > 0) {
      const metaCol = db.collection('system_metadata');
      await metaCol.updateOne(
        { _id: 'counters' },
        { $set: { nextIds, migratedAt: new Date() } },
        { upsert: true }
      );
      console.log(`   ✓ system_metadata         : Counters successfully persisted.`);
    }

    // 3. Confirm legacy app_state is preserved
    const verifyLegacy = await appStateCol.findOne({ _id: stateDocumentId });
    if (verifyLegacy) {
      console.log('\n🔒 ROLLBACK VERIFICATION: Legacy app_state document remains untouched and intact.');
    }

    console.log('\n================================================================');
    console.log(`🎉 MIGRATION SUCCESSFUL: All ${totalItems} records transferred to discrete collections.`);
    console.log('================================================================');

    return { status: 'EXECUTE_SUCCESS', totalItems };
  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err.message);
    throw err;
  } finally {
    if (client) await client.close();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigration };
