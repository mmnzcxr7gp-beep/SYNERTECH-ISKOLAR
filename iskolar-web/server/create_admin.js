const bcrypt = require('bcrypt');
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
    const coll = db.collection('app_state');
    const state = await coll.findOne({ _id: 'iskolar_state' });
    if (!state) {
      console.error('No app state document found');
      process.exit(1);
    }

    const email = 'admin@iskolar.local';
    const password = 'Admin12345!';
    const existing = (state.users || []).find((u) => u.email === email);
    if (existing) {
      console.log('Admin user already exists:', existing.email);
      process.exit(0);
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const nextId = (state.nextIds && state.nextIds.users) ? state.nextIds.users : 1;
    const adminUser = {
      id: nextId,
      name: 'System Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      company: '',
      sponsor_verified: false,
      created_at: new Date().toISOString(),
    };
    state.users = [...(state.users || []), adminUser];
    state.nextIds = state.nextIds || {};
    state.nextIds.users = nextId + 1;

    await coll.replaceOne({ _id: 'iskolar_state' }, state, { upsert: true });
    console.log('Admin user created:');
    console.log('  email:', email);
    console.log('  password:', password);
    await client.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
