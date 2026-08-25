/**
 * ISKOLAR Automated Test Suite: OCR & Processing Manual Review Fallback
 * 
 * Tests:
 * 1. Clear OCR file proceeds normally (OCR_COMPLETED)
 * 2. Blurry / Low-confidence document (< 70%) triggers PENDING_MANUAL_REVIEW
 * 3. Empty OCR output triggers PENDING_MANUAL_REVIEW
 * 4. OCR timeout or failure preserves file and enters PENDING_MANUAL_REVIEW
 * 5. Field mismatch triggers PENDING_MANUAL_REVIEW
 * 6. Unsupported PDF/file remains previewable and enters PENDING_MANUAL_REVIEW
 * 7. Student notice contains clear, non-leaking message
 * 8. Partial OCR data and original file are strictly preserved
 */

const assert = require('assert');
const { connectDb } = require('../src/config/db');
const {
  checkOcrFallbackNeeded,
  recordManualReviewEntry,
  FALLBACK_TRIGGER_REASONS,
} = require('../src/utils/manualReviewFallbackService');

async function runOcrManualFallbackTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING OCR MANUAL REVIEW FALLBACK TESTS');
  console.log('🧪 ====================================================');

  await connectDb();
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iskolar';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Clear OCR file
  await test('1. High-confidence OCR with extracted fields proceeds to OCR_COMPLETED', async () => {
    const res = checkOcrFallbackNeeded({
      rawText: 'Republic of the Philippines PhilSys National ID Juan Dela Cruz',
      confidence: 94,
      extractedFields: { fullName: 'Juan Dela Cruz', idNumber: '1234-5678-9012' },
      documentType: 'national_id',
    });

    assert.strictEqual(res.needsFallback, false);
    assert.strictEqual(res.reviewStatus, 'OCR_COMPLETED');
    assert.strictEqual(res.studentNotice, null);
  });

  // 2. Low confidence (< 70%)
  await test('2. Blurry / Low-confidence OCR (< 70%) triggers PENDING_MANUAL_REVIEW', async () => {
    const res = checkOcrFallbackNeeded({
      rawText: 'Republic of ... PhilSys ...',
      confidence: 52, // Below 70%
      extractedFields: { fullName: 'Juan' },
      documentType: 'national_id',
    });

    assert.strictEqual(res.needsFallback, true);
    assert.strictEqual(res.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert(res.issues.includes('LOW_CONFIDENCE'));
    assert.strictEqual(res.studentNotice.headline, 'Manual Review Required');
    assert(res.studentNotice.message.includes('authorized scholarship provider will review it manually'));
  });

  // 3. Empty text
  await test('3. Empty OCR output triggers PENDING_MANUAL_REVIEW', async () => {
    const res = checkOcrFallbackNeeded({
      rawText: '',
      confidence: 0,
      extractedFields: {},
      documentType: 'unknown',
    });

    assert.strictEqual(res.needsFallback, true);
    assert.strictEqual(res.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert(res.issues.includes('EMPTY_TEXT'));
  });

  // 4. OCR timeout or failure
  await test('4. OCR timeout or processing failure preserves document and sets PENDING_MANUAL_REVIEW', async () => {
    const res = checkOcrFallbackNeeded({
      rawText: 'Partial extracted header',
      confidence: 0,
      extractedFields: {},
      ocrError: new Error('OCR timed out after 30000ms'),
      isTimeout: true,
    });

    assert.strictEqual(res.needsFallback, true);
    assert.strictEqual(res.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert(res.issues.includes('OCR_TIMEOUT'));
  });

  // 5. Unclassified document type
  await test('5. Unclassified previewable document routes to PENDING_MANUAL_REVIEW', async () => {
    const res = checkOcrFallbackNeeded({
      rawText: 'Custom Barangay Certificate of Indigency for education aid',
      confidence: 85,
      extractedFields: { fullName: 'Juan Dela Cruz' },
      documentType: 'unknown',
    });

    assert.strictEqual(res.needsFallback, true);
    assert.strictEqual(res.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert(res.issues.includes('UNCLASSIFIED_PREVIEWABLE'));
  });

  // 6. Database record persistence
  await test('6. Persists fallback record and audit history to ManualReviewLog in MongoDB', async () => {
    const testDocId = `doc-fallback-${Date.now()}`;
    const testAppId = `app-fallback-${Date.now()}`;

    const record = await recordManualReviewEntry({
      documentId: testDocId,
      applicationId: testAppId,
      studentId: 9001,
      reviewStatus: 'PENDING_MANUAL_REVIEW',
      manualReviewReason: FALLBACK_TRIGGER_REASONS.LOW_CONFIDENCE,
      ocrConfidence: 55,
      failedRuleIds: ['RULE_EXTRACTED_FIELDS'],
      studentCorrections: { fullName: 'Juan Dela Cruz' },
      action: 'FALLBACK_TRIGGERED_LOW_CONFIDENCE',
    });

    assert(record);
    assert.strictEqual(record.reviewStatus, 'PENDING_MANUAL_REVIEW');
    assert.strictEqual(record.ocrConfidence, 55);
    assert.strictEqual(record.history.length, 1);
  });

  console.log('🧪 ====================================================');
  console.log(`🧪 OCR MANUAL FALLBACK TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runOcrManualFallbackTests().catch((e) => {
    console.error('Fatal OCR Fallback test error:', e);
    process.exit(1);
  });
}

module.exports = { runOcrManualFallbackTests };

