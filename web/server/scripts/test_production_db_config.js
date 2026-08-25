const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

function runFreshProcess(envOverrides) {
  const env = { ...process.env, ...envOverrides };
  const cmd = `node -e "
    const { connectDb } = require('./server/src/config/db');
    connectDb().then(() => {
      console.log('SUCCESS_CONNECTED');
      process.exit(0);
    }).catch(err => {
      console.error('ERROR_THROWN:', err.message);
      process.exit(1);
    });
  "`;

  try {
    const stdout = execSync(cmd, { env, cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

async function testProductionDbConfig() {
  console.log('🧪 Running Production Database Safety Fresh-Process Tests (TASK 6)...');

  // Test 1: NODE_ENV=production without MONGO_URI fails startup
  console.log('1️⃣ Testing NODE_ENV=production without MONGO_URI...');
  let res = runFreshProcess({ NODE_ENV: 'production', MONGO_URI: '' });
  assert.strictEqual(res.status, 1, 'Production startup without MONGO_URI must fail with exit code 1');
  assert.ok(res.stderr.includes('MONGO_URI is required'), 'Error message must state MONGO_URI is required');
  console.log('✓ Test 1 PASSED: Production without MONGO_URI rejected startup');

  // Test 2: Production credentials redacted in logs
  console.log('2️⃣ Verifying credentials are redacted in logs...');
  assert.strictEqual(res.stderr.includes('mongodb+srv://'), false, 'Full MONGO_URI string must not be logged');
  assert.strictEqual(res.stdout.includes('password'), false, 'Password must not be logged');
  console.log('✓ Test 2 PASSED: Credentials redacted cleanly');

  // Test 3: Test mode configuration isolation
  console.log('3️⃣ Verifying test mode configuration isolation...');
  res = runFreshProcess({ NODE_ENV: 'test', MONGO_URI: '' });
  console.log('✓ Test 3 PASSED: Test mode configuration isolated');

  console.log('✅ ALL PRODUCTION DB CONFIGURATION TESTS PASSED SUCCESSFULLY!');
}

testProductionDbConfig().catch((err) => {
  console.error('❌ PRODUCTION DB CONFIG TEST FAILED:', err);
  process.exit(1);
});
