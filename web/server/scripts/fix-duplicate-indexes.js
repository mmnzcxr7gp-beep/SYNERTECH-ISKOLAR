#!/usr/bin/env node

/**
 * Fix duplicate key indexes that prevent resubmission
 * 
 * This script drops the unique indexes on:
 * - Student.lrn
 * - Provider.registrationNumber
 * 
 * Usage: node scripts/fix-duplicate-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const connectMongoose = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iskolar';
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    return true;
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    return false;
  }
};

const fixIndexes = async () => {
  try {
    // Get database
    const db = mongoose.connection.db;

    console.log('\n=== Fixing Duplicate Key Indexes ===\n');

    // Fix Student collection
    console.log('1. Checking Student collection indexes...');
    try {
      const studentIndexes = await db.collection('students').getIndexes();
      console.log('   Current indexes:', Object.keys(studentIndexes));

      if (studentIndexes.lrn_1) {
        console.log('   Dropping duplicate index on lrn...');
        await db.collection('students').dropIndex('lrn_1');
        console.log('   ✓ Dropped lrn_1 index');
      } else {
        console.log('   ✓ No duplicate lrn index found');
      }
    } catch (err) {
      console.error('   Error fixing Student indexes:', err.message);
    }

    // Fix Provider collection
    console.log('\n2. Checking Provider collection indexes...');
    try {
      const providerIndexes = await db.collection('providers').getIndexes();
      console.log('   Current indexes:', Object.keys(providerIndexes));

      if (providerIndexes.registrationNumber_1) {
        console.log('   Dropping duplicate index on registrationNumber...');
        await db.collection('providers').dropIndex('registrationNumber_1');
        console.log('   ✓ Dropped registrationNumber_1 index');
      } else {
        console.log('   ✓ No duplicate registrationNumber index found');
      }
    } catch (err) {
      console.error('   Error fixing Provider indexes:', err.message);
    }

    console.log('\n=== Index Fix Complete ===\n');
  } catch (err) {
    console.error('Error fixing indexes:', err);
    process.exit(1);
  }
};

const main = async () => {
  const connected = await connectMongoose();
  if (!connected) {
    process.exit(1);
  }

  await fixIndexes();
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB\n');
};

main();
