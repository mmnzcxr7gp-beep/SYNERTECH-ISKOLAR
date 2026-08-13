# SYNERTECH ISKOLAR - OCR & Automatic Document Checking

## OCR Data Pipeline
1. **File Reception**: Student uploads document via Flutter mobile app to `POST /api/ocr/extract`.
2. **Backend Processing**: `tesseract.js` worker processes the file buffer to extract raw text and map candidate fields (Full Name, ID Number, Date of Birth, School Name, GWA).
3. **Student Review**: Flutter app presents `OcrReviewScreen` with side-by-side document image preview and editable extracted fields.
4. **Explicit Confirmation**: Student verifies and edits any low-confidence values before tapping "Confirm & Submit".
5. **Persistence**: Confirmed fields persist to `OcrExtraction.js` and `Student.js` schemas in MongoDB.

## Automatic Pre-Screening Rules
- **Rule 1 (Completeness Check)**: Verifies all mandatory document slots are attached.
- **Rule 2 (Format & Size Check)**: Validates JPEG/PNG/PDF within 10MB limit.
- **Rule 3 (Name Consistency Check)**: Matches student profile name against document text.
- **Rule 4 (Eligibility Threshold Check)**: Compares applicant GWA against scholarship minimum threshold.
- **Rule 5 (Duplicate Prevention)**: Flags duplicate document uploads or duplicate applications.

## Human Authority & Safety Boundaries
- Automatic checks advance applications to `pending_human_review`.
- The system **never** grants final approval or claims legal document authenticity based solely on OCR or matching fields. Scholarship Providers and Administrators retain sole authority to mark documents as `Verified`, `Rejected`, or `Needs Resubmission`.
