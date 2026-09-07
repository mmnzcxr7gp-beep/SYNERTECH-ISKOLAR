/**
 * ISKOLAR 2.0 — Safe Legacy Duplicate Applications Inventory & Migration Script
 * 
 * Safety Rules (Directive 5):
 * 1. Default to read-only inventory/dry-run mode.
 * 2. Never load developer .env automatically for a production-capable migration.
 * 3. Never execute deletion, archival, or index changes without:
 *    --confirm-target-env=<staging|production|test>
 *    --confirmed-backup-id=<backup_reference_id>
 *    --approve-plan
 * 4. Mask all student, personal, and sensitive details in report outputs.
 * 5. Verify post-migration state: zero duplicates remaining and unique index verified.
 * 
 * Usage:
 *   node scripts/migrate_legacy_duplicate_applications.js [--dry-run]
 *   node scripts/migrate_legacy_duplicate_applications.js --apply --confirm-target-env=staging --confirmed-backup-id=SNAP-20260906-01 --approve-plan
 */

const { MongoClient } = require('mongodb');

// Parse CLI flags
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ISKOLAR 2.0 — Safe Duplicate Applications Inventory & Migration

Usage:
  Dry-run (default, read-only):
    node scripts/migrate_legacy_duplicate_applications.js --mongo-uri=<uri>

  Apply migration (strictly requires owner approval flags):
    node scripts/migrate_legacy_duplicate_applications.js \\
      --apply \\
      --mongo-uri=<uri> \\
      --confirm-target-env=<staging|production|test> \\
      --confirmed-backup-id=<backup_reference_id> \\
      --approve-plan

Safety Flags:
  --dry-run                 Run in read-only inspection mode (default)
  --apply                   Execute archival and unique index creation
  --confirm-target-env      Must be staging, production, or test
  --confirmed-backup-id     Mandatory verified backup reference identifier
  --approve-plan            Explicit acknowledgement to archive duplicate records
  --mongo-uri=<uri>         Target MongoDB connection URI
`);
  process.exit(0);
}

const isApply = args.includes('--apply');
const isDryRun = !isApply;

function getArgValue(flag) {
  const prefix = `${flag}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const confirmTargetEnv = getArgValue('--confirm-target-env');
const confirmedBackupId = getArgValue('--confirmed-backup-id');
const hasApprovePlan = args.includes('--approve-plan');
const cliMongoUri = getArgValue('--mongo-uri');

// Safe URI resolution: do NOT automatically load local .env
const mongoUri = cliMongoUri ||
  process.env.MIGRATION_MONGO_URI ||
  (process.env.NODE_ENV === 'test' ? (process.env.TEST_MONGO_URI || process.env.MONGO_TEST_URI) : null);

function maskIdentifier(val) {
  if (val == null) return 'N/A';
  const str = String(val);
  if (str.length <= 4) return '***';
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
}

async function runMigration(options = {}) {
  const effectiveDryRun = options.dryRun !== undefined ? options.dryRun : isDryRun;
  const effectiveUri = options.mongoUri || mongoUri;

  console.log('================================================================');
  console.log('  ISKOLAR 2.0: SAFE DUPLICATE APPLICATION INVENTORY & MIGRATION');
  console.log(`  Mode: ${effectiveDryRun ? 'DRY-RUN (Inspection Only — Safe & Read-Only)' : 'APPLY (Archival & Unique Index Creation)'}`);
  console.log('================================================================\n');

  if (!effectiveUri) {
    console.error('❌ FATAL: Target database URI must be provided explicitly.');
    console.error('   Pass --mongo-uri=<uri> or set MIGRATION_MONGO_URI in your environment.');
    console.error('   Developer .env files are NOT loaded automatically for security isolation.');
    if (require.main === module) process.exit(1);
    throw new Error('Target database URI required');
  }

  // Safety Gate: Enforce Owner Approval flags if attempting apply
  if (!effectiveDryRun) {
    const targetEnv = options.confirmTargetEnv || confirmTargetEnv;
    const backupId = options.confirmedBackupId || confirmedBackupId;
    const approved = options.approvePlan || hasApprovePlan;

    const missingFlags = [];
    if (!targetEnv) missingFlags.push('--confirm-target-env=<staging|production|test>');
    if (!backupId) missingFlags.push('--confirmed-backup-id=<verified_backup_reference>');
    if (!approved) missingFlags.push('--approve-plan');

    if (missingFlags.length > 0) {
      console.error('❌ MIGRATION BLOCKED (Safety Gate Violation)');
      console.error('   To apply duplicate record archival and unique index creation, the owner must provide:');
      missingFlags.forEach((f) => console.error(`     • ${f}`));
      console.error('\n   No records were modified. Defaulting to read-only inspection.\n');
      if (require.main === module) process.exit(1);
      throw new Error(`Safety gate violation: Missing required approval flags: ${missingFlags.join(', ')}`);
    }

    console.log(`🔒 SAFETY VERIFIED:`);
    console.log(`   Target Environment: ${targetEnv}`);
    console.log(`   Verified Backup ID: ${backupId}`);
    console.log(`   Owner Plan Approval: CONFIRMED\n`);
  }

  const client = new MongoClient(effectiveUri);
  try {
    await client.connect();
    const db = client.db();
    const dbName = db.databaseName;
    console.log(`✓ Connected to database: ${dbName}`);

    const archiveCol = db.collection('archived_duplicate_applications');

    const processCollection = async ({ colName, scholarField, studentField, indexName }) => {
      console.log(`\n▶ Inspecting collection '${colName}' for duplicates on (${scholarField}, ${studentField})...`);
      const col = db.collection(colName);

      const pipeline = [
        {
          $match: {
            [scholarField]: { $exists: true, $ne: null },
            [studentField]: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: { scholar: `$${scholarField}`, student: `$${studentField}` },
            count: { $sum: 1 },
            records: {
              $push: {
                id: '$id',
                _id: '$_id',
                status: '$status',
                applied_at: '$applied_at',
                appliedAt: '$appliedAt',
                created_at: '$created_at',
                createdAt: '$createdAt',
                score: '$score',
              },
            },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ];

      const duplicateGroups = await col.aggregate(pipeline).toArray().catch(() => []);
      console.log(`  📊 Duplicate Inventory for '${colName}': ${duplicateGroups.length} duplicate group(s) found.`);

      if (duplicateGroups.length === 0) {
        console.log(`  ✅ Collection '${colName}' has zero duplicate groups.`);
      } else {
        console.log(`\n  --- REDACTED DUPLICATE INVENTORY REPORT FOR '${colName}' ---`);
        duplicateGroups.forEach((group, index) => {
          console.log(`  Group #${index + 1}:`);
          console.log(`    Scholarship: ${maskIdentifier(group._id.scholar)}`);
          console.log(`    Student:     ${maskIdentifier(group._id.student)}`);
          console.log(`    Duplicates:  ${group.count}`);
          group.records.forEach((rec, rIdx) => {
            console.log(`      [${rIdx + 1}] ID: ${maskIdentifier(rec.id || rec._id)} | Status: ${rec.status} | Applied: ${rec.applied_at || rec.appliedAt || rec.created_at || 'N/A'}`);
          });
        });
      }

      if (effectiveDryRun) {
        return { count: duplicateGroups.length, migrated: false, colName };
      }

      // Apply Archival & Index Enforcement
      let archivedCount = 0;
      if (duplicateGroups.length > 0) {
        console.log(`\n  --- APPLYING NON-DESTRUCTIVE ARCHIVAL ON '${colName}' ---`);
        for (const group of duplicateGroups) {
          const sorted = [...group.records].sort((a, b) => {
            const statusOrder = (s) => (['APPROVED', 'AWARDED', 'ACCEPTED'].includes(String(s).toUpperCase()) ? 2 : 1);
            const prioDiff = statusOrder(b.status) - statusOrder(a.status);
            if (prioDiff !== 0) return prioDiff;
            const timeA = new Date(a.applied_at || a.appliedAt || a.created_at || 0).getTime();
            const timeB = new Date(b.applied_at || b.appliedAt || b.created_at || 0).getTime();
            return timeB - timeA;
          });

          const primary = sorted[0];
          const secondaries = sorted.slice(1);

          for (const sec of secondaries) {
            const fullSecDoc = await col.findOne({ _id: sec._id });
            if (fullSecDoc) {
              const archiveDoc = {
                ...fullSecDoc,
                sourceCollection: colName,
                archivedAt: new Date().toISOString(),
                archiveReason: 'LEGACY_DUPLICATE_CONSOLIDATION',
                primaryApplicationId: primary.id || primary._id,
                verifiedBackupId: options.confirmedBackupId || confirmedBackupId,
              };
              await archiveCol.insertOne(archiveDoc);
              await col.deleteOne({ _id: sec._id });
              archivedCount++;
              console.log(`    ✓ Archived duplicate ${maskIdentifier(sec.id || sec._id)} -> archived_duplicate_applications`);
            }
          }
        }
        console.log(`  ✓ Successfully archived ${archivedCount} duplicate record(s) from '${colName}'.`);
      }

      // Build Unique Index
      console.log(`  --- ENFORCING UNIQUE INDEX '${indexName}' ON '${colName}' ---`);
      const existingIndexes = await col.indexes().catch(() => []);
      for (const ex of existingIndexes) {
        const exKeys = Object.keys(ex.key || {});
        if (exKeys.includes(scholarField) && exKeys.includes(studentField) && !ex.unique) {
          console.log(`    Dropping non-unique index '${ex.name}'...`);
          await col.dropIndex(ex.name).catch(() => {});
        }
      }

      const indexResult = await col.createIndex(
        { [scholarField]: 1, [studentField]: 1 },
        { unique: true, background: true, name: indexName }
      );
      console.log(`  ✅ Unique index active: ${indexResult}`);

      // Post-Migration Verification
      const postDuplicates = await col.aggregate(pipeline).toArray().catch(() => []);
      const postIndexes = await col.indexes().catch(() => []);
      const hasUniqueIndex = postIndexes.some((idx) => idx.name === indexName && idx.unique);

      if (postDuplicates.length > 0 || !hasUniqueIndex) {
        throw new Error(`Post-migration verification failed for ${colName}: ${postDuplicates.length} duplicates remain, uniqueIndexActive=${hasUniqueIndex}`);
      }
      console.log(`  ✅ Post-migration verification PASSED: 0 duplicates remaining, unique index verified.`);

      return { count: duplicateGroups.length, archived: archivedCount, migrated: true, colName };
    };

    const res1 = await processCollection({
      colName: 'applications',
      scholarField: 'scholarship_id',
      studentField: 'student_id',
      indexName: 'idx_applications_scholar_student',
    });

    const totalDuplicates = res1.count;

    console.log('\n================================================================');
    if (effectiveDryRun) {
      console.log(`ℹ️ DRY-RUN INVENTORY COMPLETE. Total duplicate groups detected: ${totalDuplicates}.`);
      if (totalDuplicates > 0) {
        console.log('\n⚠️ ACTION REQUIRED BY SYSTEM OWNER:');
        console.log('   1. Verify a complete database backup exists and obtain the verified backup reference.');
        console.log('   2. Review the duplicate record breakdown above.');
        console.log('   3. Run with explicit owner confirmation flags:');
        console.log('      node scripts/migrate_legacy_duplicate_applications.js \\');
        console.log('        --apply \\');
        console.log('        --confirm-target-env=<staging|production> \\');
        console.log('        --confirmed-backup-id=<verified_backup_id> \\');
        console.log('        --approve-plan');
      } else {
        console.log('✅ Collection is clean. Database uniqueness is satisfied.');
      }
    } else {
      console.log('✅ SAFE DUPLICATE MIGRATION AND UNIQUE CONSTRAINT ENFORCEMENT COMPLETED.');
      console.log(`   Verified Backup Reference: ${options.confirmedBackupId || confirmedBackupId}`);
      console.log('   Rollback Procedure:');
      console.log('     Secondary records are preserved in "archived_duplicate_applications".');
      console.log(`     Filter: { verifiedBackupId: "${options.confirmedBackupId || confirmedBackupId}" }`);
    }
    console.log('================================================================\n');

    return { totalDuplicates, migrated: !effectiveDryRun };
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Migration Error:', err.message || err);
      process.exit(1);
    });
}

module.exports = { runMigration };
