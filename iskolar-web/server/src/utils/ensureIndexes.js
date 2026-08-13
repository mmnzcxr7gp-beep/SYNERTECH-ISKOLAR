/**
 * Ensure MongoDB Indexes — Startup Migration
 * 
 * Automatically creates missing indexes on server startup.
 * All indexes are created with { background: true } to avoid blocking.
 * 
 * Called after Mongoose connection is established.
 */

const logger = require('./logger');

const ensureIndexes = async (mongoose) => {
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

    // Scholarship Applications — student+scholarship compound & status queries
    {
      collection: 'scholarshipapplications',
      indexes: [
        { key: { scholarshipId: 1, studentId: 1 }, options: { background: true, name: 'idx_app_scholarship_student' } },
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
  ];

  let created = 0;
  let skipped = 0;

  for (const { collection, indexes } of indexOps) {
    try {
      const col = db.collection(collection);

      for (const { key, options } of indexes) {
        try {
          await col.createIndex(key, options);
          created++;
        } catch (err) {
          // Index already exists with same name or equivalent key — safe to skip
          if (err.code === 85 || err.code === 86 || err.codeName === 'IndexOptionsConflict') {
            skipped++;
          } else {
            logger.warn(`[ensureIndexes] Failed to create index ${options.name} on ${collection}`, {
              error: err.message,
            });
          }
        }
      }
    } catch (err) {
      // Collection may not exist yet — that's fine, Mongoose will create it on first write
      logger.debug(`[ensureIndexes] Collection ${collection} not accessible`, { error: err.message });
    }
  }

  logger.info(`[ensureIndexes] Complete: ${created} created, ${skipped} already existed`);
};

module.exports = { ensureIndexes };
