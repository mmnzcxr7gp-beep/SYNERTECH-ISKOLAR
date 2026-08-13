const assert = require('assert');
const http = require('http');
const { buildApp } = require('../src/vercelApp');

async function testUploadSecurity() {
  console.log('🧪 Starting Upload Security Test (FINDING-002 Verification)...');

  // Set NODE_ENV to production to activate security checks
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const app = buildApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✓ Test server running on port ${port} (NODE_ENV=production)`);

  // Send request to /uploads/sample.pdf without Authorization header
  const status = await new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/uploads/seeded_proof.pdf`, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', reject);
  });

  console.log(`✓ GET /uploads/seeded_proof.pdf returned HTTP ${status}`);
  assert.strictEqual(status, 401, 'Unauthenticated file access must return 401 Unauthorized in production');

  server.close();
  process.env.NODE_ENV = originalEnv;

  console.log('✅ UPLOAD SECURITY TEST PASSED SUCCESSFULLY!');
}

testUploadSecurity().catch((err) => {
  console.error('❌ UPLOAD SECURITY TEST FAILED:', err);
  process.exit(1);
});
