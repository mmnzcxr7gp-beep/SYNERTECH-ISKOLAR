const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');
const { checkOcrFallbackNeeded, OCR_CONFIDENCE_THRESHOLD } = require('../src/utils/manualReviewFallbackService');

async function run() {
  console.log('🧪 Running test_low_confidence_manual_review...');
  const env = await startTestServer();

  try {
    assert.strictEqual(OCR_CONFIDENCE_THRESHOLD, 70, 'Configured threshold must be 70%');

    // 1. Test score below threshold (e.g. 52%)
    const lowScoreResult = checkOcrFallbackNeeded({
      rawText: 'Fragmented text',
      confidence: 52.4,
      extractedFields: { name: 'Fragment' },
      documentType: 'EnrollmentCertificate',
    });

    assert.strictEqual(lowScoreResult.needsFallback, true);
    assert(lowScoreResult.issues.includes('LOW_CONFIDENCE'));
    assert.strictEqual(lowScoreResult.reviewStatus, 'PENDING_MANUAL_REVIEW');

    // 2. Test score above threshold (e.g. 88%)
    const highScoreResult = checkOcrFallbackNeeded({
      rawText: 'Complete Enrollment Certificate 2026',
      confidence: 88.0,
      extractedFields: { school: 'PUP', studentId: '2022-001' },
      documentType: 'EnrollmentCertificate',
    });

    assert.strictEqual(highScoreResult.needsFallback, false);
    assert.strictEqual(highScoreResult.reviewStatus, 'OCR_COMPLETED');

    console.log('✅ [PASS] test_low_confidence_manual_review: Low confidence OCR strictly routed to manual human review');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_low_confidence_manual_review:', err);
  process.exit(1);
});
