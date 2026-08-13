/**
 * Index Migration Service
 * Automatically fixes duplicate key constraints on server startup
 */

const fixDuplicateKeyIndexes = async (db) => {
  if (!db) {
    console.warn('[IndexMigration] No database connection, skipping index fixes');
    return;
  }

  try {
    console.log('[IndexMigration] Checking and fixing duplicate key indexes...');

    // Fix Student.lrn unique index
    try {
      const studentIndexes = await db.collection('students').listIndexes().toArray();
      const hasLrnIndex = studentIndexes.some(idx => idx.key.lrn === 1);
      if (hasLrnIndex) {
        console.log('[IndexMigration] Dropping Student.lrn unique index...');
        await db.collection('students').dropIndex('lrn_1');
        console.log('[IndexMigration] ✓ Dropped Student.lrn index');
      } else {
        console.log('[IndexMigration] ✓ Student.lrn index already gone');
      }
    } catch (err) {
      if (err.message.includes('index not found')) {
        console.log('[IndexMigration] ✓ Student.lrn index already gone');
      } else {
        console.warn('[IndexMigration] Warning fixing Student.lrn:', err.message);
      }
    }

    // Fix Provider.registrationNumber unique index
    try {
      const providerIndexes = await db.collection('providers').listIndexes().toArray();
      const hasRegNumIndex = providerIndexes.some(idx => idx.key.registrationNumber === 1);
      if (hasRegNumIndex) {
        console.log('[IndexMigration] Dropping Provider.registrationNumber unique index...');
        await db.collection('providers').dropIndex('registrationNumber_1');
        console.log('[IndexMigration] ✓ Dropped Provider.registrationNumber index');
      } else {
        console.log('[IndexMigration] ✓ Provider.registrationNumber index already gone');
      }
    } catch (err) {
      if (err.message.includes('index not found')) {
        console.log('[IndexMigration] ✓ Provider.registrationNumber index already gone');
      } else {
        console.warn('[IndexMigration] Warning fixing Provider.registrationNumber:', err.message);
      }
    }

    console.log('[IndexMigration] Index migration complete');
  } catch (err) {
    console.error('[IndexMigration] Error during migration:', err.message);
  }
};

module.exports = {
  fixDuplicateKeyIndexes,
};
