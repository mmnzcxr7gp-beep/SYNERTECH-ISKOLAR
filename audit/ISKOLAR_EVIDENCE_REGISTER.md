# ISKOLAR 2.0 – Evidence Register
**System:** ISKOLAR 2.0 (Learning Aid and Scholarship Management Platform)  
**Development Team:** SynerTech  
**Audit Date:** September 6, 2026  
**Auditor:** Senior Full-Stack Software Auditor, QA Engineer, Cybersecurity Reviewer, Capstone Evaluator  

---

## 1. Evidence Catalog

All items listed below represent direct, verifiable outputs obtained during read-only audit execution. Sensitive data (passwords, tokens, OTP secrets, connection strings) have been redacted in strict compliance with Operating Rule 7. Each entry represents a unique, formally defined Evidence ID.

| Evidence ID | Category | Source / Command | Description / Key Output | Status |
| :--- | :--- | :--- | :--- | :---: |
| **EVD-BLD-01** | Build | `npm --prefix web/client run build` | Vite production build completed in 5.34s. 716 modules transformed. Chunks generated: index.html (1.99 kB), bundle JS/CSS. Total uncompressed JS: ~1.2 MB. | VERIFIED |
| **EVD-BLD-02** | Static Analysis | `flutter analyze --no-pub` (in `mobile/`) | Ran in 3.2s on macOS Darwin 24. Output: `No issues found!`. | VERIFIED |
| **EVD-BLD-03** | Server Boot | `node server.js` (port 4000) | Express backend booted with Mongoose connection, MongoDB Atlas driver, Socket.IO, Sentry init. | VERIFIED |
| **EVD-BLD-04** | Static Server | `node mobile/serve_flutter_web.js` (port 8088) | Flutter web build served on HTTP port 8088, responding with 200 OK. | VERIFIED |
| **EVD-TST-01** | Mobile Tests | `flutter test` (in `mobile/`) | 81 tests executed across `mobile/test/` including responsive multi-scale viewport tests (360x800, 390x844, 412x915, 768x1024 at 100%, 150%, 200% scale). Output: `All tests passed! (+81)`. | VERIFIED |
| **EVD-TST-02** | Web Tests | `npm --prefix web/client test` | 10 tests executed via `tests/test_homepage_effects.js` (Chromium-based browser tested; exact version not recorded) covering particle text, dither, accessibility, dark mode, reduced motion, mobile layout. Output: `10 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-03** | Integration | `node scripts/test_master_capstone_connected_workflow.js` | 27 tests executed covering 10-step connected workflow: Scholarship Creation -> Student Register -> Discovery & Submit -> Info Request -> Resubmission -> Interview -> Approval -> Messaging -> Audit -> IDs. Output: `27 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-04** | Scanner/Checker | `node scripts/test_scanner_and_checker_verification.js` | 11 tests covering Tesseract OCR runtime, regex pattern extraction, fallback unreadable scan handling, 16 explainable rules, SHA-256 duplicate detection, zero-automatic-approval guarantee. Output: `11 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-05** | Connectivity | `node scripts/run_all_connectivity_audit_tests.js` | 17 tests covering 3-role file uploads, cross-student file denial, cross-provider file denial, admin file audit, multipart contracts, R2 upload & retrieval, document versioning, orphan cleanup, OTP limits, MFA bypass prevention, restart persistence. Output: `17 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-06** | Rules Engine | `node scripts/test_automatic_checking.js` | 6 tests verifying 16 rules evaluation, threshold gating, advisory recommendations (`ELIGIBLE_FOR_REVIEW`, `NEEDS_RESUBMISSION_RECOMMENDED`, `INELIGIBLE_FLAGGED`). Output: `6 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-07** | OCR Engine | `node scripts/test_ocr_runtime.js` | 5 tests verifying Tesseract.js engine execution, Philippine ID regex parsers, corrupt image fallback. Output: `5 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-08** | Verification | `node scripts/test_student_account_verification.js` | 3 tests verifying student document verification lifecycle, admin decision enforcement, audit logging. Output: `3 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-TST-09** | Verification | `node scripts/test_provider_account_verification.js` | 3 tests verifying provider accreditation, SEC/DTI document review, state transitions. Output: `3 PASSED, 0 FAILED`. | VERIFIED |
| **EVD-PERF-01** | Local Latency Smoke Test | `curl` endpoint timings on localhost | Local smoke-test response times: `/api/health`: 2.16ms (200 OK), `/api/scholarships`: 4.99ms (200 OK), `/api/scholarship-opportunities/browse`: 2.59ms (200 OK). | VERIFIED |
| **EVD-SEC-01** | Security Review | Code inspection: `authController.js:150-152` | Hardcoded backdoor password `Password123!` accepted when `NODE_ENV !== 'production'`. | VERIFIED |
| **EVD-SEC-02** | Security Review | Code inspection: `authController.js:188` | Client-controlled `skipMfa: true` bypasses 2FA login verification entirely without server-side environment guard. | VERIFIED |
| **EVD-SEC-03** | Security Review | Git tree inspection: `mobile/android/app/upload-keystore.jks` | Binary release signing keystore (2,808 bytes) committed to Git source repository. | VERIFIED |
| **EVD-SEC-04** | Security Review | Code inspection: `AndroidManifest.xml:14` | `android:usesCleartextTraffic="true"` configured on `<application>`, permitting unencrypted HTTP. | VERIFIED |
| **EVD-SEC-05** | Security Review | Code inspection: `authMiddleware.js:26` | `revokedTokens` implemented as local in-memory `Set()`, not distributed across multiple server nodes. | VERIFIED |
| **EVD-SEC-06** | API Review | Code inspection: `routes/scholarships.js:14-20` vs `routes/scholarshipOpportunities.js:20-66` | Parallel endpoints for scholarship creation have inconsistent validation rules (slots, deadlines, required fields). | VERIFIED |
| **EVD-SEC-07** | Architecture Review | Code inspection: `db.js:53-108` | `db.read()` executes full unpaginated `.find({}).toArray()` across all collections on startup and sync. | VERIFIED |
| **EVD-SEC-08** | Security Review | Code inspection: `web/server/.env.example:4,16` | Sensitive cluster endpoint (`iskolar-main.0lz3nds.mongodb.net`), username (`samgarciavillaluna_db_user`), and email (`iskolar.official@gmail.com`) committed in example environment template. | VERIFIED |
| **EVD-SEC-09** | Accessibility Review | Code inspection & manual test: `LoginModal.jsx` | Modal dialog lacks focus trapping and does not listen for `Escape` key to close. | VERIFIED |
| **EVD-SEC-10** | Feature Scope Review | Code inspection: `chatbot_page.dart:42-52` | Chatbot in Flutter mobile app is a hardcoded mock returning a static demo response after 650ms delay. | VERIFIED |
| **EVD-SEC-11** | Feature Scope Review | Code inspection: `transactionController.js` & `Transaction.js` | Transactions are internal database accounting records; no banking or e-wallet payment gateway is integrated. | VERIFIED |

---

## 2. Automated Test Execution & Overlap Analysis

Three distinct quantitative measurements are tracked and must not be conflated:
1. **Gross executions (163):** Every automated test execution across every command and script, including overlapping and repeated coverage.
2. **Unique automated cases (146):** Distinct automated test assertions after removing explicitly mapped overlapping sub-suites.
3. **Numbered audit cases (45):** The separate functional audit matrix evaluating the 45 numbered end-to-end user-journey scenarios in [`./ISKOLAR_TEST_RESULTS.md`](./ISKOLAR_TEST_RESULTS.md).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATED TEST EXECUTION TOPOLOGY                               │
├────────────────────────────────┬────────────┬──────────────────────────────────────────┤
│ Test Command / Suite           │ Executions │ Coverage Category / Overlap Notes        │
├────────────────────────────────┼────────────┼──────────────────────────────────────────┤
│ mobile: flutter test           │ 81         │ Flutter widget & multi-scale [EVD-TST-01]│
│ client: npm test               │ 10         │ Web UI effects & access. [EVD-TST-02]    │
│ test_master_capstone_connected │ 27         │ End-to-end 3-role workflow [EVD-TST-03]  │
│ run_all_connectivity_audit     │ 17         │ Multi-role storage & security [EVD-TST-05│
│ test_scanner_and_checker       │ 11         │ Unified scanner/rules suite [EVD-TST-04] │
│ test_automatic_checking        │ 6          │ Sub-suite: rules scoring [EVD-TST-06]    │
│ test_ocr_runtime               │ 5          │ Sub-suite: OCR engine [EVD-TST-07]       │
│ test_student_account_verify    │ 3          │ Sub-suite: student review [EVD-TST-08]   │
│ test_provider_account_verify   │ 3          │ Sub-suite: provider accred. [EVD-TST-09] │
├────────────────────────────────┼────────────┼──────────────────────────────────────────┤
│ Gross Automated Executions     │ 163        │ Gross test executions across all suites  │
│ Overlapping Sub-Suite Runs     │ -17        │ 6 (Rules) + 5 (OCR) + 3 (Stud) + 3 (Prov)│
├────────────────────────────────┼────────────┼──────────────────────────────────────────┤
│ Deduplicated Unique Cases      │ 146        │ Distinct automated test assertions       │
└────────────────────────────────┴────────────┴──────────────────────────────────────────┘
```

### Overlap Deduplication Formula:
$$\text{Unique Automated Cases} = \text{Gross Executions (163)} - \text{Overlapping Sub-Suite Executions (17)} = 146$$

- `test_automatic_checking.js` (6 tests, `EVD-TST-06`) and `test_ocr_runtime.js` (5 tests, `EVD-TST-07`) are exact functional subsets of `test_scanner_and_checker_verification.js` (11 tests, `EVD-TST-04`). (11 overlapping executions).
- `test_student_account_verification.js` (3 tests, `EVD-TST-08`) and `test_provider_account_verification.js` (3 tests, `EVD-TST-09`) are functional subsets of `run_all_connectivity_audit_tests.js` (`EVD-TST-05`) and `test_master_capstone_connected_workflow.js` (`EVD-TST-03`). (6 overlapping executions).
- Deduplicating these 17 overlapping sub-suite executions from the 163 gross executions yields exactly **146 unique automated test assertions**.

---

## 3. Requirements-to-Evidence Traceability Matrix

| Functional Module | User Role | Requirement | Verified By | Evidence ID | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Authentication** | Student | Valid registration & profile creation | Automated test | EVD-TST-03 | PASSED |
| **Authentication** | Student | Duplicate email rejection (409) | Automated test | EVD-TST-05 | PASSED |
| **Authentication** | Student / All | Secure password hashing (bcrypt salt 10) | Code inspection | EVD-SEC-01 | PASSED |
| **Authentication** | Student / All | Non-production backdoor rejection | Code inspection | EVD-SEC-01 | FAILED |
| **Authentication** | Student / All | MFA enforcement without client bypass | Code inspection | EVD-SEC-02 | FAILED |
| **Authentication** | Student / All | Account suspension access denial | Automated test | EVD-TST-05 | PASSED |
| **Authentication** | Student | OTP generation, expiry, rate limiting | Automated test | EVD-TST-05 | PASSED |
| **Authentication** | Student | In-memory token revocation on logout | Automated test | EVD-TST-05 | PASSED |
| **Authentication** | Student / All | Distributed multi-node token revocation | Code inspection | EVD-SEC-05 | FAILED |
| **Scholarships** | Provider | Create and publish opportunity | Automated test | EVD-TST-03 | PASSED |
| **Scholarships** | Provider | Validate slots >= 1 on POST /api/scholarships | Code inspection | EVD-SEC-06 | FAILED |
| **Scholarships** | Provider | Validate future deadline on POST /api/scholarships | Code inspection | EVD-SEC-06 | FAILED |
| **Scholarships** | Student | Browse and discover open opportunities | Automated test | EVD-TST-03 | PASSED |
| **Scholarships** | Student | Eligibility criteria and selection stages display | Automated test | EVD-TST-03 | PASSED |
| **Applications** | Student | Submit application with documentary requirements | Automated test | EVD-TST-03 | PASSED |
| **Applications** | Student | Prevent duplicate applications for same scholarship | Automated test | EVD-TST-05 | PASSED |
| **Applications** | Student | Automated checker flags missing mandatory documents | Automated test | EVD-TST-04 | PASSED |
| **Applications** | Provider | Request additional info & student response loop | Automated test | EVD-TST-03 | PASSED |
| **Applications** | Provider | Request document resubmission & replacement upload | Automated test | EVD-TST-03 | PASSED |
| **Scheduling** | Provider/Student | Schedule interview & student acknowledge attendance | Automated test | EVD-TST-03 | PASSED |
| **Decisions** | Provider | Qualify and officially approve scholarship | Automated test | EVD-TST-03 | PASSED |
| **Decisions** | Provider | Mandatory rejection reason enforcement | Automated test | EVD-TST-04 | PASSED |
| **Decisions** | System | Zero Automatic Decision Guarantee (Status remains pending) | Automated test | EVD-TST-04 | PASSED |
| **Messaging** | Student/Provider | Application-scoped bidirectional messaging | Automated test | EVD-TST-03 | PASSED |
| **Audit Logs** | Administrator | Append-only audit trail recorded for all events via API | Automated test | EVD-TST-03 | PASSED |
| **Audit Logs** | Administrator | Prevent modification/deletion of audit logs via API | Automated test | EVD-TST-05 | PASSED |
| **Consistency** | All Roles | Shared entity IDs consistent across clients | Automated test | EVD-TST-03 | PASSED |
| **Storage & Security**| All Roles | Cross-student & cross-provider document isolation | Automated test | EVD-TST-05 | PASSED |
| **Storage & Security**| Admin | Admin document access audit event generation | Automated test | EVD-TST-05 | PASSED |
| **OCR Scanner** | Student/Provider | Philippine ID regex extraction & confidence scoring | Automated test | EVD-TST-04 | PASSED |
| **OCR Scanner** | System | Unreadable scan fallback to manual review queue | Automated test | EVD-TST-04 | PASSED |
| **OCR Engine Unit** | System | Tesseract.js pattern matching & regex parser sub-suite | Unit test | EVD-TST-07 | PASSED |
| **Checker Engine** | System | 16 explainable eligibility rules evaluation | Automated test | EVD-TST-04 | PASSED |
| **Checker Rules Unit** | System | 16-rule explainable criteria evaluation sub-suite | Unit test | EVD-TST-06 | PASSED |
| **Checker Engine** | System | SHA-256 duplicate document hash detection | Automated test | EVD-TST-04 | PASSED |
| **Verification Queue** | Student/Admin | Student document verification queue & admin review | Unit test | EVD-TST-08 | PASSED |
| **Accreditation Queue** | Provider/Admin | Provider accreditation queue & admin review | Unit test | EVD-TST-09 | PASSED |
| **Backend Server** | Platform | Server boot, database connection, Socket.IO init | Server run | EVD-BLD-03 | PASSED |
| **Flutter Web Host** | Mobile Web | Serve static web assets on port 8088 | Server run | EVD-BLD-04 | PASSED |
| **Mobile App** | Student | Flutter static analysis clean | Static analyzer | EVD-BLD-02 | PASSED |
| **Mobile App** | Student | Multi-scale viewport responsiveness | Widget tests | EVD-TST-01 | PASSED |
| **Mobile App Security**| Security | Release signing keystore excluded from Git repository | Git inspection | EVD-SEC-03 | FAILED |
| **Mobile App Security**| Security | Enforce encrypted HTTPS traffic in manifest | Code inspection | EVD-SEC-04 | FAILED |
| **Mobile App Scope** | Student | Intelligent chatbot assistant | Code inspection | EVD-SEC-10 | PARTIAL |
| **Web Portal** | Provider/Admin | Clean production build without errors | Vite build | EVD-BLD-01 | PASSED |
| **Web Portal** | Provider/Admin | Homepage visual effects & theme accessibility | Puppeteer tests | EVD-TST-02 | PASSED |
| **Web Portal Access.** | Provider/Admin | Modal keyboard focus trap & Escape key handler | Code inspection | EVD-SEC-09 | FAILED |
| **Database Architecture** | Platform | Unpaginated memory mirroring prevention | Code inspection | EVD-SEC-07 | FAILED |
| **Configuration Sec.** | Platform | Sanitize public repository configuration templates | Code inspection | EVD-SEC-08 | FAILED |
| **Performance Latency** | Platform | Local API smoke test response latency (< 10ms) | Curl benchmark | EVD-PERF-01 | PASSED |
| **Accounting Scope** | Provider/Student | Record internal funding & allowance allocations | Code inspection | EVD-SEC-11 | PARTIAL |

---

## 4. Evidence Catalog Integrity & Orphan-Reference Verification

A strict formal verification of the Evidence Catalog was conducted:
- **Defined Catalog Rows:** Exactly **25 unique records** defined in Section 1 (`EVD-BLD-01` through `EVD-BLD-04`, `EVD-TST-01` through `EVD-TST-09`, `EVD-PERF-01`, and `EVD-SEC-01` through `EVD-SEC-11`).
- **Duplicate Catalog Definitions:** **0** (Each ID is defined exactly once as a primary catalog row).
- **Referenced but Undefined Evidence IDs:** **0** (All references across all reports map directly to one of the 25 catalog entries).
- **Defined but Unused Catalog Entries:** **0** (Every catalog entry is actively linked to a test case, finding, or traceability matrix row).
- **Mismatched Evidence IDs:** **0** (All security findings map 1-to-1: `SEC-01` -> `EVD-SEC-01` through `SEC-11` -> `EVD-SEC-11`).
- **Test Cases Supported by Direct Source Code Inspection:**
  - `TC-STU-06` (Backdoor password comparison in `authController.js:150-152` — `EVD-SEC-01`)
  - `TC-STU-07` (MFA skip parameter check in `authController.js:188` — `EVD-SEC-02`)
  - `TC-STU-11` (In-memory token revocation Set in `authMiddleware.js:26` — `EVD-SEC-05`)
  - `TC-PRV-04` (Missing slot validator on `routes/scholarships.js` — `EVD-SEC-06`)
  - `TC-PRV-05` (Missing deadline validator on `routes/scholarships.js` — `EVD-SEC-06`)
  - `TC-ADM-08` (Missing Escape and focus trap in `LoginModal.jsx` — `EVD-SEC-09`)
  - `TC-STU-25` (Hardcoded mock response in `chatbot_page.dart:42-52` — `EVD-SEC-10`)
  - `TC-PRV-12` (Internal database ledger in `transactionController.js` — `EVD-SEC-11`)
