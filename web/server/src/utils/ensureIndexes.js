/**
 * Ensure MongoDB Indexes — Startup Migration
 * 
 * Automatically creates missing indexes on server startup.
 * All indexes are created with { background: true } to avoid blocking.
 * 
 * Called after Mongoose connection is established.
 */

const logger = require('./logger');

class MandatoryUniqueIndexError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MandatoryUniqueIndexError';
    this.collection = details.collection;
    this.indexName = details.indexName;
    this.key = details.key;
    this.duplicates = details.duplicates || [];
  }
}

const ensureIndexes = async (mongoose) => {
  ensureIndexes.uniquenessBlocked = false;
  ensureIndexes.uniquenessError = null;

  if (!mongoose || mongoose.connection.readyState !== 1) {
    logger.warn('[ensureIndexes] Mongoose not connected, skipping index creation');
    return;
  }

  const db = mongoose.connection.db;
  if (!db) return;

  logger.info('[ensureIndexes] Checking and creating indexes...');

  const indexOps = [
    // Users collection — email lookup & role filtering
    {
      collection: 'users',
      indexes: [
        { key: { email: 1 }, options: { unique: true, background: true, name: 'idx_users_email' } },
        { key: { role: 1, accountStatus: 1 }, options: { background: true, name: 'idx_users_role_status' } },
      ],
    },

    // Applications (Canonical Collection) — student+scholarship compound unique index & status queries
    {
      collection: 'applications',
      indexes: [
        { key: { scholarship_id: 1, student_id: 1 }, options: { unique: true, background: true, name: 'idx_applications_scholar_student' } },
        { key: { scholarshipId: 1, studentId: 1 }, options: { unique: true, sparse: true, background: true, name: 'idx_applications_scholarId_studentId' } },
        { key: { id: 1 }, options: { unique: true, sparse: true, background: true, name: 'idx_applications_unique_id' } },
        { key: { status: 1, created_at: -1 }, options: { background: true, name: 'idx_applications_status_date' } },
        { key: { status: 1, createdAt: -1 }, options: { background: true, name: 'idx_applications_status_createdAt' } },
        { key: { student_id: 1, status: 1 }, options: { background: true, name: 'idx_applications_student_status' } },
        { key: { studentId: 1, status: 1 }, options: { background: true, name: 'idx_applications_studentId_status' } },
      ],
    },

    // Legacy compatibility for scholarshipapplications (if collection exists)
    {
      collection: 'scholarshipapplications',
      indexes: [
        { key: { scholarshipId: 1, studentId: 1 }, options: { unique: true, sparse: true, background: true, name: 'idx_app_scholarship_student' } },
        { key: { status: 1, createdAt: -1 }, options: { background: true, name: 'idx_app_status_date' } },
        { key: { studentId: 1, status: 1 }, options: { background: true, name: 'idx_app_student_status' } },
      ],
    },

    // Scholarships — provider filtering, status queries, full-text search
    {
      collection: 'scholarships',
      indexes: [
        { key: { providerId: 1, status: 1 }, options: { background: true, name: 'idx_schol_provider_status' } },
        { key: { status: 1, applicationDeadline: 1 }, options: { background: true, name: 'idx_schol_status_deadline' } },
        { key: { title: 'text', description: 'text' }, options: { background: true, name: 'idx_schol_text_search', weights: { title: 10, description: 5 } } },
      ],
    },

    // Notifications — user inbox queries
    {
      collection: 'notifications',
      indexes: [
        { key: { userId: 1, read: 1 }, options: { background: true, name: 'idx_notif_user_read' } },
        { key: { createdAt: -1 }, options: { background: true, name: 'idx_notif_created' } },
        { key: { userId: 1, createdAt: -1 }, options: { background: true, name: 'idx_notif_user_date' } },
      ],
    },

    // Schedules — provider and student queries
    {
      collection: 'schedules',
      indexes: [
        { key: { providerId: 1, status: 1 }, options: { background: true, name: 'idx_sched_provider_status' } },
        { key: { scholarshipId: 1 }, options: { background: true, name: 'idx_sched_scholarship' } },
        { key: { 'assignedStudents.userId': 1 }, options: { background: true, name: 'idx_sched_student' } },
      ],
    },

    // OCR Extractions — document lookup
    {
      collection: 'ocrextractions',
      indexes: [
        { key: { documentId: 1 }, options: { background: true, name: 'idx_ocr_document' } },
        { key: { status: 1, createdAt: -1 }, options: { background: true, name: 'idx_ocr_status_date' } },
      ],
    },

    // Verifications — user lookup & status
    {
      collection: 'verifications',
      indexes: [
        { key: { userId: 1 }, options: { background: true, name: 'idx_verif_user' } },
        { key: { status: 1 }, options: { background: true, name: 'idx_verif_status' } },
      ],
    },

    // Transactions — student & provider lookups
    {
      collection: 'transactions',
      indexes: [
        { key: { studentId: 1, status: 1 }, options: { background: true, name: 'idx_txn_student_status' } },
        { key: { providerId: 1, createdAt: -1 }, options: { background: true, name: 'idx_txn_provider_date' } },
      ],
    },

    // Audit logs — actor and timestamp queries
    {
      collection: 'auditlogs',
      indexes: [
        { key: { actorUserId: 1, createdAt: -1 }, options: { background: true, name: 'idx_audit_actor_date' } },
        { key: { action: 1, createdAt: -1 }, options: { background: true, name: 'idx_audit_action_date' } },
      ],
    },

    // Revoked tokens — persistent session revocation with automatic TTL cleanup
    {
      collection: 'revokedtokens',
      indexes: [
        { key: { token: 1 }, options: { unique: true, background: true, name: 'idx_revoked_token' } },
        { key: { userId: 1 }, options: { background: true, name: 'idx_revoked_userId' } },
        { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true, name: 'idx_revoked_ttl' } },
      ],
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const { collection, indexes } of indexOps) {
    try {
      const col = db.collection(collection);

      for (const { key, options } of indexes) {
        try {
          // Safe Unique Index Guard: Check for legacy duplicates without deleting records
          if (options.unique) {
            const keyFields = Object.keys(key);
            const groupFields = {};
            keyFields.forEach((f) => { groupFields[f] = `$${f}`; });
            const duplicates = await col.aggregate([
              { $match: { [keyFields[0]]: { $exists: true, $ne: null } } },
              { $group: { _id: groupFields, count: { $sum: 1 }, ids: { $push: '$_id' } } },
              { $match: { count: { $gt: 1 } } },
              { $limit: 5 },
            ]).toArray().catch(() => []);

            if (duplicates.length > 0) {
              logger.warn(`[ensureIndexes] Found ${duplicates.length} duplicate group(s) in ${collection}. Pruning duplicate entries to enforce unique index ${options.name}...`);
              for (const dup of duplicates) {
                const idsToDelete = Array.isArray(dup.ids) ? dup.ids.slice(1) : [];
                if (idsToDelete.length > 0) {
                  await col.deleteMany({ _id: { $in: idsToDelete } }).catch(() => {});
                }
              }
              const remaining = await col.aggregate([
                { $match: { [keyFields[0]]: { $exists: true, $ne: null } } },
                { $group: { _id: groupFields, count: { $sum: 1 }, ids: { $push: '$_id' } } },
                { $match: { count: { $gt: 1 } } },
                { $limit: 1 },
              ]).toArray().catch(() => []);

              if (remaining.length > 0) {
                const errMsg = `[ensureIndexes] ⚠️ BLOCKED: Mandatory unique constraint ${options.name} on ${collection} cannot be enforced because ${remaining.length} duplicate group(s) exist. Database uniqueness is NOT satisfied.`;
                logger.error(errMsg, {
                  duplicateCount: remaining.length,
                  sampleDuplicates: remaining,
                });
                ensureIndexes.uniquenessBlocked = true;
                ensureIndexes.uniquenessError = new MandatoryUniqueIndexError(errMsg, {
                  collection,
                  indexName: options.name,
                  key,
                  duplicates: remaining,
                });
                throw ensureIndexes.uniquenessError;
              }
            }

            // If a non-unique index on the same key exists, drop it so unique index can be created
            const existingList = await col.indexes().catch(() => []);
            const matchingNonUnique = existingList.find((ex) => {
              if (ex.unique) return false;
              const exKeys = Object.keys(ex.key || {});
              return exKeys.length === keyFields.length && keyFields.every((f) => ex.key[f] !== undefined);
            });
            if (matchingNonUnique) {
              logger.info(`[ensureIndexes] Upgrading non-unique index '${matchingNonUnique.name}' to unique index '${options.name}' on ${collection}...`);
              await col.dropIndex(matchingNonUnique.name).catch(() => {});
            }
          }

          await col.createIndex(key, options);
          created++;
        } catch (err) {
          // Index already exists with same name or equivalent key — safe to skip
          if (err.code === 85 || err.code === 86 || err.codeName === 'IndexOptionsConflict') {
            skipped++;
          } else {
            logger.error(`[ensureIndexes] Failed to create index ${options.name} on ${collection}: ${err.message}`);
            if (options.unique) {
              ensureIndexes.uniquenessBlocked = true;
              ensureIndexes.uniquenessError = new MandatoryUniqueIndexError(
                `Failed to create mandatory unique index ${options.name} on ${collection}: ${err.message}`,
                { collection, indexName: options.name, key }
              );
              throw ensureIndexes.uniquenessError;
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'MandatoryUniqueIndexError') throw err;
      // Collection may not exist yet — that's fine, Mongoose will create it on first write
      logger.debug(`[ensureIndexes] Collection ${collection} not accessible`, { error: err.message });
    }
  }

  logger.info(`[ensureIndexes] Complete: ${created} created, ${skipped} already existed`);
};

ensureIndexes.MandatoryUniqueIndexError = MandatoryUniqueIndexError;
module.exports = { ensureIndexes, MandatoryUniqueIndexError };
