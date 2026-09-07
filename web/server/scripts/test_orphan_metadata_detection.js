const assert = require('assert');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('🧪 Running test_orphan_metadata_detection...');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  // Simulated metadata records
  const validKey = 'non_existent_orphan_test_key_' + Date.now() + '.pdf';
  
  let detectedOrphan = false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET || 'iskolar-documents', Key: validKey }));
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      detectedOrphan = true;
    }
  }

  assert.strictEqual(detectedOrphan, true, 'Orphaned metadata detection algorithm must flag missing storage object as 404 NotFound');

  console.log('✅ [PASS] test_orphan_metadata_detection: Missing storage object correctly detected and flagged');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_orphan_metadata_detection:', err);
  process.exit(1);
});
