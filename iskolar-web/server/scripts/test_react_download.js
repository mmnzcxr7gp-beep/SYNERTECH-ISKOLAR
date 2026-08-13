const assert = require('assert');

// Mock global URL and fetch for node testing environment
global.URL = {
  createObjectURL: (blob) => 'blob:http://localhost:5173/mock-object-url-uuid',
  revokeObjectURL: (url) => {},
};
global.localStorage = { getItem: () => null };

async function testReactDocumentDownloadHelper() {
  console.log('🧪 Testing React Document Download Helper Utility...');

  const { downloadAuthenticatedDocument } = require('../../iskolar_admin_web/src/utils/documentDownload');

  // Test 1: Missing document ID rejects without making request
  console.log('1️⃣ Testing missing document ID rejection...');
  let res = await downloadAuthenticatedDocument({ docId: null });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 'MISSING_ID');
  console.log('✓ Test 1 PASSED: Missing document ID rejected immediately');

  // Test 2: Valid request attaches Authorization header and returns blob URL
  console.log('2️⃣ Testing valid request with Authorization header...');
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/documents/123/download'), 'URL must match API format');
    assert.strictEqual(options.headers['Authorization'], 'Bearer valid_test_token_jwt');
    assert.strictEqual(url.includes('token='), false, 'Token must NOT be present in URL query string');
    return {
      ok: true,
      status: 200,
      blob: async () => ({ size: 100, type: 'application/pdf' }),
    };
  };

  res = await downloadAuthenticatedDocument({
    docId: 123,
    baseUrl: 'http://localhost:4000',
    token: 'valid_test_token_jwt',
    onPreview: () => {},
  });
  assert.strictEqual(res.success, true);
  assert.ok(res.objectUrl.startsWith('blob:'));
  console.log('✓ Test 2 PASSED: Authorization header attached and blob URL created');

  // Test 3: HTTP 401 returns unauthorized error
  console.log('3️⃣ Testing HTTP 401 response handling...');
  global.fetch = async () => ({ ok: false, status: 401 });
  res = await downloadAuthenticatedDocument({ docId: 123, token: 'invalid_token' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.code, 'UNAUTHORIZED');
  console.log('✓ Test 3 PASSED: 401 Unauthorized mapped cleanly');

  // Test 4: HTTP 403 returns forbidden error
  console.log('4️⃣ Testing HTTP 403 response handling...');
  global.fetch = async () => ({ ok: false, status: 403 });
  res = await downloadAuthenticatedDocument({ docId: 123, token: 'other_user_token' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.code, 'FORBIDDEN');
  console.log('✓ Test 4 PASSED: 403 Forbidden mapped cleanly');

  // Test 5: HTTP 404 returns not found error
  console.log('5️⃣ Testing HTTP 404 response handling...');
  global.fetch = async () => ({ ok: false, status: 404 });
  res = await downloadAuthenticatedDocument({ docId: 9999 });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.code, 'NOT_FOUND');
  console.log('✓ Test 5 PASSED: 404 Not Found mapped cleanly');

  // Test 6: Network failure returns safe error
  console.log('6️⃣ Testing network failure handling...');
  global.fetch = async () => { throw new Error('Failed to fetch'); };
  res = await downloadAuthenticatedDocument({ docId: 123 });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 'NETWORK_ERROR');
  console.log('✓ Test 6 PASSED: Network failure handled safely');

  console.log('✅ ALL REACT DOCUMENT DOWNLOAD HELPER TESTS PASSED SUCCESSFULLY!');
}

testReactDocumentDownloadHelper().catch((err) => {
  console.error('❌ REACT DOWNLOAD TEST FAILED:', err);
  process.exit(1);
});
