require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection(uri, label) {
  const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log(`\n🔍 Checking ${label}: ${maskedUri}...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000, connectTimeoutMS: 4000 });
  try {
    await client.connect();
    const pingResult = await client.db().command({ ping: 1 });
    console.log(`✅ [${label}] Connected successfully! Ping:`, pingResult);
    const dbName = client.db().databaseName;
    console.log(`   Database Name: ${dbName}`);
    const collections = await client.db().listCollections().toArray();
    console.log(`   Collections (${collections.length}):`);
    for (const col of collections) {
      try {
        const count = await client.db().collection(col.name).estimatedDocumentCount();
        console.log(`     • ${col.name}: ~${count} documents`);
      } catch {
        console.log(`     • ${col.name}`);
      }
    }
    await client.close();
    return { ok: true };
  } catch (err) {
    console.error(`❌ [${label}] Connection failed:`, err.message);
    if (client) await client.close().catch(() => {});
    return { ok: false, error: err };
  }
}

async function main() {
  const primaryUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/iskolar';

  let primaryOk = false;
  if (primaryUri) {
    const res = await testConnection(primaryUri, 'MongoDB Atlas (Primary)');
    primaryOk = res.ok;
    if (!primaryOk && res.error && res.error.message.includes('SSL alert number 80')) {
      console.warn('⚠️  Note: Atlas SSL alert 80 indicates client public IP is not in Atlas Network Access IP allowlist.');
    }
  } else {
    console.warn('⚠️  No MONGO_URI specified in environment.');
  }

  const localRes = await testConnection(localUri, 'Local MongoDB Fallback (127.0.0.1:27017)');

  console.log('\n=========================================');
  console.log('       MONGODB DIAGNOSTIC SUMMARY        ');
  console.log('=========================================');
  console.log(`Primary Atlas:  ${primaryOk ? '🟢 ONLINE' : '🔴 IP NOT WHITELISTED / UNREACHABLE'}`);
  console.log(`Local Database: ${localRes.ok ? '🟢 ONLINE' : '🔴 OFFLINE'}`);

  if (primaryOk || localRes.ok) {
    console.log('✅ ISKOLAR has an active, accessible database backend.\n');
    process.exit(0);
  } else {
    console.error('❌ Neither primary nor local MongoDB is accessible.\n');
    process.exit(1);
  }
}

main();
