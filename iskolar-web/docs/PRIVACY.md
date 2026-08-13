# SYNERTECH ISKOLAR - Privacy & Data Protection Policy

## Data Privacy Compliance
SYNERTECH ISKOLAR strictly complies with Republic Act No. 10173 (Data Privacy Act of 2012).

## Key Privacy Protocols
1. **Pre-Registration Privacy Consent**:
   - Both Flutter student registration and React provider registration enforce an explicit Privacy Policy popup modal prior to account creation submission.
   - Closing or cancelling the popup preserves form state without creating an account or sending data.
   - Selecting "I Agree and Create Account" submits the registration request exactly once.
2. **Document Privacy**:
   - Uploaded private documents (transcripts, IDs, income statements) are stored in protected directories with direct static web access disabled.
   - Protected document endpoints (`/uploads/:filename`) require valid JWT bearer tokens and object-level authorization matching the document owner or authorized provider.
3. **Data Retention & Audit**:
   - Consent timestamps and declaration flags are recorded in `ConsentRecord.js` and `AuditLog.js`.
