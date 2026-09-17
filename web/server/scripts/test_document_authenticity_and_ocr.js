/**
 * Test Document Authenticity and Anti-Hallucination OCR Engine
 */
const assert = require('assert');
const authenticityService = require('../src/utils/documentAuthenticityService');
const ocrController = require('../src/controllers/ocrController');

console.log('🧪 Starting Document Authenticity & Anti-Hallucination Unit Tests...\n');

// Test 1: Authentic Certificate of Registration (COR)
{
  const corText = `
    PAMANTASAN NG LUNGSOD NG MAYNILA
    OFFICE OF THE UNIVERSITY REGISTRAR
    CERTIFICATE OF REGISTRATION
    Academic Year 2024-2025 First Semester

    Student No: 2021-12345
    Student Name: JUAN DELA CRUZ SANTOS
    Degree / Program: Bachelor of Science in Information Technology
    Year Level: 3rd Year

    SUBJECT CODE | COURSE TITLE | UNITS | SECTION
    IT 311 | Web Systems and Technologies | 3.0 | BSIT 3-1
    IT 312 | Database Administration | 3.0 | BSIT 3-1
    IT 313 | Information Assurance and Security | 3.0 | BSIT 3-1

    Total Units Enrolled: 9.0
    GWA: 1.45
  `;

  const result = authenticityService.assessDocumentAuthenticity({
    rawText: corText,
    documentType: 'certificate_of_registration',
    extractedFields: {
      fullName: 'JUAN DELA CRUZ SANTOS',
      idNumber: '2021-12345',
      course: 'Bachelor of Science in Information Technology',
      gpa: '1.45',
    },
    ocrConfidence: 95,
  });

  assert.strictEqual(result.isCorrectPaper, true, 'COR should be recognized as correct paper');
  assert.ok(result.authenticityScore >= 75, `Authenticity score should be >= 75 (got ${result.authenticityScore})`);
  assert.strictEqual(result.verdict, 'GENUINE_DOCUMENT', 'Verdict should be GENUINE_DOCUMENT');
  assert.strictEqual(result.structuralMarkers.requiredMet, true, 'Required COR markers should be met');
  assert.ok(result.structuralMarkers.found.length >= 3, 'Should find multiple structural markers');
  assert.strictEqual(result.extractionEvidence.fullName.valid, true, 'Name evidence should be valid');
  assert.strictEqual(result.extractionEvidence.fullName.confidence, 'HIGH', 'Name confidence should be HIGH');
  console.log('  ✅ [PASS] Authentic COR evaluated with GENUINE_DOCUMENT verdict (Score: ' + result.authenticityScore + '%)');
}

// Test 2: Authentic School ID
{
  const idText = `
    TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES
    AYALA BLVD., ERMITA, MANILA

    STUDENT ID CARD
    Student No: TUPM-22-9876
    Name: MARIA CLARA DELOS REYES
    Course: BS COMPUTER SCIENCE
    Valid Until: A.Y. 2025-2026
  `;

  const result = authenticityService.assessDocumentAuthenticity({
    rawText: idText,
    documentType: 'school_id',
    extractedFields: {
      fullName: 'MARIA CLARA DELOS REYES',
      idNumber: 'TUPM-22-9876',
    },
    ocrConfidence: 90,
  });

  assert.strictEqual(result.isCorrectPaper, true, 'School ID should be recognized as correct paper');
  assert.ok(result.authenticityScore >= 70, 'School ID authenticity score should be >= 70');
  assert.ok(['GENUINE_DOCUMENT', 'LIKELY_GENUINE'].includes(result.verdict), 'Verdict should be GENUINE or LIKELY');
  assert.strictEqual(result.structuralMarkers.requiredMet, true, 'School name marker must be met');
  console.log('  ✅ [PASS] Authentic School ID evaluated with high authenticity (Score: ' + result.authenticityScore + '%)');
}

// Test 3: Irrelevant / Random Text (Not a valid document)
{
  const garbageText = `
    Ingredients:
    2 cups all-purpose flour
    1 tsp baking powder
    1/2 cup softened butter
    Mix all ingredients in a bowl and bake at 350F for 25 minutes.
    Enjoy your chocolate chip cookies!
  `;

  const result = authenticityService.assessDocumentAuthenticity({
    rawText: garbageText,
    documentType: 'certificate_of_registration',
    extractedFields: {},
    ocrConfidence: 80,
  });

  assert.strictEqual(result.isCorrectPaper, false, 'Garbage text must NOT be recognized as correct paper');
  assert.strictEqual(result.verdict, 'NOT_A_VALID_DOCUMENT', 'Verdict must be NOT_A_VALID_DOCUMENT');
  assert.strictEqual(result.structuralMarkers.requiredMet, false, 'COR required marker must fail');
  assert.ok(result.authenticityScore < 25, `Score must be < 25 (got ${result.authenticityScore})`);
  assert.ok(result.warnings.length > 0, 'Should produce warnings');
  console.log('  ✅ [PASS] Garbage/recipe text correctly rejected as NOT_A_VALID_DOCUMENT (Score: ' + result.authenticityScore + '%)');
}

// Test 4: Blank / Noise image
{
  const noiseText = '   ...    ---   123  ';
  const result = authenticityService.assessDocumentAuthenticity({
    rawText: noiseText,
    documentType: 'school_id',
    extractedFields: {},
    ocrConfidence: 15,
  });

  assert.strictEqual(result.isCorrectPaper, false, 'Noise text must fail');
  assert.strictEqual(result.verdict, 'NOT_A_VALID_DOCUMENT', 'Noise text must be NOT_A_VALID_DOCUMENT');
  assert.strictEqual(result.ocrQuality.hasReadableContent, false, 'Should have no readable content');
  console.log('  ✅ [PASS] Noise/low-confidence scan rejected as NOT_A_VALID_DOCUMENT');
}

// Test 5: Anti-Hallucination Safeguard — Never fabricate absent fields
{
  const partialText = `
    CERTIFICATE OF REGISTRATION
    UNIVERSITY OF SANTO TOMAS
    First Semester AY 2024-2025
  `;

  const extracted = ocrController.extractFieldsWithEvidence(partialText);

  // Should NOT hallucinate student name or ID number
  assert.strictEqual(extracted.fields.fullName, undefined, 'Must not fabricate student name when absent');
  assert.strictEqual(extracted.fields.idNumber, undefined, 'Must not fabricate id number when absent');
  assert.strictEqual(extracted.evidence.fullName.valid, false, 'Name evidence must be invalid');
  assert.strictEqual(extracted.evidence.fullName.validationReason, 'Not found in document text');
  console.log('  ✅ [PASS] Anti-hallucination verified: missing fields are never fabricated');
}

// Test 6: Evidence traceability — Exact source matching
{
  const textWithStudent = `
    Araullo University
    Student Name: Juan P. Dela Cruz
    Student Number: AU-2023-00192
  `;

  const extracted = ocrController.extractFieldsWithEvidence(textWithStudent);

  assert.strictEqual(extracted.fields.fullName, 'Juan P. Dela Cruz', 'Name should be extracted');
  assert.ok(extracted.evidence.fullName.source.includes('Juan P. Dela Cruz'), 'Source evidence must contain extracted value');
  assert.strictEqual(extracted.evidence.fullName.valid, true, 'Evidence must be valid');
  assert.strictEqual(extracted.evidence.fullName.confidence, 'HIGH', 'Confidence must be HIGH');
  console.log('  ✅ [PASS] Extraction evidence trail contains exact source snippet and high confidence');
}

console.log('\n================================================================');
console.log('🎉 ALL 6 DOCUMENT AUTHENTICITY & ANTI-HALLUCINATION TESTS PASSED!');
console.log('================================================================\n');
