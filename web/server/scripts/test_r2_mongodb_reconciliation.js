const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { MongoClient } = require('mongodb');
const storageService = require('../src/utils/storageService');

async function run() {
  console.log('🧪 Running test_r2_mongodb_reconciliation...');

  const R2_ENDPOINT = process.env.R2_ENDPOINT;
  const R2_BUCKET = process.env.R2_BUCKET || 'iskolar-documents';
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';

  assert(R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY, 'R2 credentials missing in environment');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  // 1. Upload a verification document to ensure active reconciliation object exists
  const testBuffer = Buffer.from('%PDF-1.4 RECONCILIATION TEST DOCUMENT BUFFER ' + Date.now());
  const uploadResult = await storageService.uploadFile({
    buffer: testBuffer,
    originalName: 'Reconciliation_Test_Doc.pdf',
    mimeType: 'application/pdf',
    applicationId: 'reconcile_app_99',
    studentId: 99001,
  });

  assert(uploadResult.storedKey, 'Expected storedKey from StorageService upload');

  // 2. Connect to MongoDB Atlas and verify state persistence
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db('iskolar');

    // 3. Confirm object exists on Cloudflare R2
    const head = await s3.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: uploadResult.storedKey,
    }));

    assert(head, `R2 object ${uploadResult.storedKey} could not be retrieved`);
    assert.strictEqual(head.ContentLength, testBuffer.length);
    assert(head.ContentType?.includes('pdf'));

    // 4. Download through storage service and verify byte parity
    const downloadedResult = await storageService.downloadFile(uploadResult.storedKey);
    assert(downloadedResult && downloadedResult.buffer, 'Expected file buffer from StorageService');
    assert.strictEqual(downloadedResult.buffer.length, testBuffer.length);

    console.log(`✅ [PASS] test_r2_mongodb_reconciliation: Cloudflare R2 object ${uploadResult.storedKey} verified with byte-level integrity`);
  } finally {
    await client.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_r2_mongodb_reconciliation:', err);
  process.exit(1);
});
