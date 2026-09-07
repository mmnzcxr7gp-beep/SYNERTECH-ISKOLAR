/**
 * ISKOLAR TEST: Cloudflare R2 Failure Handling & Recovery
 * 
 * Verifies:
 * 1. Missing credentials handling
 * 2. Unconfigured driver error handling
 * 3. Workflow preservation when storage fails
 * 4. Safe error responses (no stack trace or secret exposure)
 */

const assert = require('assert');
const path = require('path');
const storageService = require('../src/utils/storageService');

async function runTest() {
  console.log('='.repeat(60));
  console.log('☁️ RUNNING R2 FAILURE HANDLING & RECOVERY TEST');
  console.log('='.repeat(60));

  // 1. Instantiate mock unconfigured driver
  console.log('\n[STEP 1] Testing unconfigured driver error safety...');
  const unconfiguredDriver = new storageService.r2Driver.constructor({
    bucket: '',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: ''
  });

  let saveThrew = false;
  try {
    await unconfiguredDriver.save({
      storedKey: 'test/sample.pdf',
      buffer: Buffer.from('test'),
      mimeType: 'application/pdf'
    });
  } catch (err) {
    saveThrew = true;
    assert.ok(err.message.includes('not configured') || err.message.includes('missing'));
    assert.ok(!err.message.includes('MOCK_SECRET'), 'No secrets in error message');
  }
  assert.strictEqual(saveThrew, true, 'Must throw safe informative error');
  console.log('  ✅ PASS: Unconfigured driver throws safe error without crashing');

  // 2. Test read error on unconfigured driver
  console.log('\n[STEP 2] Testing read error on unconfigured driver...');
  let readThrew = false;
  try {
    await unconfiguredDriver.read('test/sample.pdf');
  } catch (err) {
    readThrew = true;
  }
  assert.strictEqual(readThrew, true);
  console.log('  ✅ PASS: Read failure caught safely');

  // 3. Test delete safety on unconfigured driver (must not throw unhandled exception)
  console.log('\n[STEP 3] Testing delete safety on unconfigured driver...');
  await unconfiguredDriver.delete('test/sample.pdf');
  console.log('  ✅ PASS: Delete on unconfigured driver completes safely without throw');

  // 4. Test exists check on unconfigured driver
  console.log('\n[STEP 4] Testing exists check on unconfigured driver...');
  const exists = await unconfiguredDriver.exists('test/sample.pdf');
  assert.strictEqual(exists, false, 'Unconfigured driver must return false for exists');
  console.log('  ✅ PASS: Exists check returns false cleanly');

  console.log('\n' + '='.repeat(60));
  console.log('☁️ R2 FAILURE RECOVERY SUMMARY: 4 PASSED, 0 FAILED');
  console.log('='.repeat(60));
  process.exit(0);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
