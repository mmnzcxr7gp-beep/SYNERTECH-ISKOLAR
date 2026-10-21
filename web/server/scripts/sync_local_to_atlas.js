const mongoose = require('mongoose');

const localUri = 'mongodb://127.0.0.1:27017/iskolar';
const password = encodeURIComponent('Iskolar2323.');
const atlasUri = `mongodb+srv://samgarciavillaluna_db_user:${password}@iskolar-main.0lz3nds.mongodb.net/iskolar?retryWrites=true&w=majority&appName=iskolar-main`;

async function syncDatabases() {
  console.log('Connecting to local MongoDB...');
  const localConn = await mongoose.createConnection(localUri).asPromise();
  console.log('Connecting to MongoDB Atlas (iskolar-main)...');
  const atlasConn = await mongoose.createConnection(atlasUri).asPromise();

  const localCols = await localConn.db.listCollections().toArray();
  console.log(`Found ${localCols.length} collections in local MongoDB.`);

  for (const colInfo of localCols) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const count = await localConn.db.collection(colName).countDocuments();
    if (count === 0) {
      console.log(`- ${colName}: 0 docs, skipping.`);
      continue;
    }

    const docs = await localConn.db.collection(colName).find({}).toArray();
    console.log(`- Syncing ${colName} (${docs.length} docs)...`);

    const atlasCol = atlasConn.db.collection(colName);
    
    // Bulk upsert by _id so existing docs are preserved/updated and no duplicate errors occur
    const bulkOps = docs.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      }
    }));

    if (bulkOps.length > 0) {
      const res = await atlasCol.bulkWrite(bulkOps, { ordered: false });
      console.log(`  ✓ ${colName}: upserted ${res.upsertedCount}, modified ${res.modifiedCount} docs`);
    }
  }

  // Ensure indexes on Atlas
  console.log('\nEnsuring indexes on Atlas cluster...');
  try {
    const { ensureIndexes } = require('../src/utils/ensureIndexes');
    await ensureIndexes(atlasConn);
    console.log('✓ Atlas indexes ensured.');
  } catch (err) {
    console.warn('⚠️ Index note:', err.message);
  }

  await localConn.close();
  await atlasConn.close();
  console.log('\n🎉 ALL COLLECTIONS AND DATA SUCCESSFULLY SYNCED TO MONGODB ATLAS!');
}

syncDatabases().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
