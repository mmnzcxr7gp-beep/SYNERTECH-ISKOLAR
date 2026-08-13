const { MongoClient } = require('mongodb');

(async () => {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME || 'iskolar';
    if (!uri) {
      console.error('MONGO_URI is not set');
      process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const state = await db.collection('app_state').findOne({ _id: 'iskolar_state' });
    if (!state) {
      console.log('No app state document found');
    } else {
      const admins = (state.users || []).filter((u) => u.role === 'admin');
      if (admins.length === 0) {
        console.log('No admin users found');
      } else {
        console.log('Admin users:');
        admins.forEach((u) => console.log(JSON.stringify({ id: u.id, email: u.email, name: u.name, created_at: u.created_at }, null, 2)));
      }
    }
    await client.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
