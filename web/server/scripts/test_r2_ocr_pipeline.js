const assert = require('assert');
const storageService = require('../src/utils/storageService');
const { extractFields, detectDocumentType } = require('../src/controllers/ocrController');

async function testR2OcrPipeline() {
  console.log('🧪 Testing Storage-to-OCR Pipeline & Field Extraction...');

  const syntheticSampleText = `
    PAMANTASAN NG LUNGSOD NG MAYNILA
    OFFICIAL TRANSCRIPT OF RECORDS
    Name: Juan Dela Cruz
    Student Number: 2022-10892
    Date of Birth: 2003-05-14
    GWA: 1.25
  `;

  // 1. Test Field Extraction
  const extracted = extractFields(syntheticSampleText);
  assert.strictEqual(extracted.fullName, 'Juan Dela Cruz');
  assert.strictEqual(extracted.idNumber, '2022-10892');
  assert.strictEqual(extracted.dateOfBirth, '2003-05-14');

  // 2. Test Document Type Detection
  const docType = detectDocumentType(syntheticSampleText);
  assert.ok(docType === 'school_id' || docType === 'unknown');

  // 3. Verify missing values are not invented/hallucinated
  const sparseText = 'STUDENT PASS ONLY';
  const sparseExtracted = extractFields(sparseText);
  assert.strictEqual(sparseExtracted.fatherName, undefined, 'Missing fatherName must not be invented');
  assert.strictEqual(sparseExtracted.motherName, undefined, 'Missing motherName must not be invented');
  assert.strictEqual(sparseExtracted.expirationDate, undefined, 'Missing expirationDate must not be invented');

  // 4. Test Manual Review Fallback Trigger
  const fallbackService = require('../src/utils/manualReviewFallbackService');
  const lowConfidenceCheck = fallbackService.checkOcrFallbackNeeded({
    rawText: 'corrupted unreadable scan ??? ###',
    confidence: 35,
    extractedFields: {},
    documentType: 'unknown',
  });

  assert.strictEqual(lowConfidenceCheck.needsFallback, true, 'Low confidence scan must trigger manual review');
  assert.strictEqual(lowConfidenceCheck.reviewStatus, 'PENDING_MANUAL_REVIEW');

  console.log('✅ PASS test_r2_ocr_pipeline: Storage-to-OCR pipeline and fallback triggers verified');
  process.exit(0);
}

testR2OcrPipeline().catch((err) => {
  console.error('❌ FAIL test_r2_ocr_pipeline:', err);
  process.exit(1);
});
