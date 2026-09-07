# ISKOLAR 2.0 – Comprehensive Functional Test Results

**Project:** ISKOLAR 2.0 (Learning Aid and Scholarship Management Platform)  
**Development Team:** SynerTech  
**Date:** September 6, 2026  
**Auditor:** Senior Full-Stack Software Auditor, QA Engineer, Cybersecurity Reviewer, Capstone Evaluator  

---

## Test Status Legend
- **PASSED**: Expected outcome was directly demonstrated and verified via live execution or verified automated suite.
- **FAILED**: Expected outcome was not achieved, or an unexpected failure/vulnerability was demonstrated.
- **PARTIAL**: Only part of the requirement works; edge conditions, UI states, or validations fail.
- **BLOCKED**: Execution was prevented by an identified blocker or dependency.
- **NOT TESTED**: No authorized environment, third-party gateway, or implementation was available.

---

## 1. Student Applicant Test Cases (Mobile & API)

| Test ID | Platform | User Role | Module | Preconditions | Test Steps | Data Category | Expected Result | Actual Observed Result | Status | Evidence Ref | Defect Ref | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **TC-STU-01** | Mobile / API | Student | Registration | System online, email available | POST `/api/auth/register` with valid student payload & privacy consent | Valid data | Account created (201/200), user record persisted with role 'student' | User registered successfully, JWT token generated | **PASSED** | EVD-TST-03 | - | Standard registration flow verified |
| **TC-STU-02** | Mobile / API | Student | Registration | Student exists with email | POST `/api/auth/register` with duplicate email | Invalid data | Request rejected with HTTP 409 Conflict | Returned 409 "Email already registered" | **PASSED** | EVD-TST-05 | - | Uniqueness constraint working |
| **TC-STU-03** | Mobile / API | Student | Registration | Valid payload | POST `/api/auth/register` with missing required fields (e.g. empty name) | Boundary / Invalid | Rejected with HTTP 400 validation error | Returned 400 with validation errors array | **PASSED** | EVD-TST-05 | - | express-validator halts empty name |
| **TC-STU-04** | Mobile / API | Student | Authentication | Registered user exists | POST `/api/auth/login` with correct email and password | Valid credentials | Authentication succeeds; returns user and token/MFA challenge | User authenticated, token issued | **PASSED** | EVD-TST-03 | - | Valid credentials verified |
| **TC-STU-05** | Mobile / API | Student | Authentication | Registered user exists | POST `/api/auth/login` with incorrect password | Invalid credentials | Authentication rejected with HTTP 401 Unauthorized | Returned 401 "Invalid credentials" | **PASSED** | EVD-TST-05 | - | Bcrypt mismatch rejected |
| **TC-STU-06** | Mobile / API | Student | Authentication | Non-production environment | POST `/api/auth/login` with any email and password "Password123!" | Exploit payload | Should reject unless password actually matches user's bcrypt hash | Password123! accepted as backdoor password when NODE_ENV !== 'production' | **FAILED** | EVD-SEC-01 | SEC-01 | Backdoor bypass active in non-production |
| **TC-STU-07** | Mobile / API | Student | Authentication | MFA configured | POST `/api/auth/login` with `skipMfa: true` | Bypass payload | In production or secured system, client should NOT dictate 2FA bypass | Backend skips 2FA challenge and issues full access token directly | **FAILED** | EVD-SEC-02 | SEC-02 | Client-controlled skipMfa parameter |
| **TC-STU-08** | Mobile / API | Student | Account Control | Student account suspended by admin | Attempt login while `isSuspended: true` | State constraint | HTTP 403 Forbidden with `ACCOUNT_SUSPENDED` code | Returned 403 "Account is suspended. Please contact system administration." | **PASSED** | EVD-TST-05 | - | Suspended account access denial verified |
| **TC-STU-09** | Mobile / API | Student | OTP Lifecycle | User requesting OTP | Request OTP, test expiration (5 min), resend, and limit | Lifecycle | OTP generated via CSRNG, expires in 5m, rate-limited to 5/15m | Verified CSRNG generation, 5-minute expiry, rate-limiting active | **PASSED** | EVD-TST-05 | - | OTP security lockdown verified |
| **TC-STU-10** | Mobile / API | Student | Session / Logout | Authenticated student token | POST `/api/auth/logout`, then access `/api/auth/me` with same token | Revocation | Token rejected with HTTP 401 Unauthorized | Token immediately rejected on current instance | **PASSED** | EVD-TST-05 | - | In-memory blacklist works locally |
| **TC-STU-11** | Mobile / API | Student | Session / Logout | Clustered / multi-node server | Revoke token on Node A, replay on Node B | Multi-instance | Revocation must be enforced across all instances | In-memory Set is not shared with other instances | **FAILED** | EVD-SEC-05 | SEC-05 | Distributed revocation missing Redis/DB store |
| **TC-STU-12** | Mobile / API | Student | Scholarship Discovery | Scholarships published | GET `/api/scholarships` and `/api/scholarship-opportunities/browse` | Public queries | Returns list of active scholarship opportunities | Successfully returned active opportunities list | **PASSED** | EVD-TST-03 | - | Search and browse operational |
| **TC-STU-13** | Mobile / API | Student | Eligibility Check | Student profile & scholarship criteria | GET `/api/scholarships/:id` details view | Criteria evaluation | Displays scholarship eligibility criteria and required documents | Returned requirements and selection stages | **PASSED** | EVD-TST-03 | - | Criteria JSON parsed properly |
| **TC-STU-14** | Mobile / API | Student | Application Creation | Open scholarship exists | POST `/api/applications` with valid form and files | Valid application | Application created with status `PENDING_HUMAN_REVIEW` | Application created with status `PENDING_HUMAN_REVIEW` | **PASSED** | EVD-TST-03 | - | Application submission verified |
| **TC-STU-15** | Mobile / API | Student | Application Creation | Student already applied to scholarship | POST `/api/applications` for same scholarship again | Duplicate payload | Rejected with HTTP 409 Conflict | Returned 409 duplicate application rejected | **PASSED** | EVD-TST-05 | - | Duplicate application blocked |
| **TC-STU-16** | Mobile / API | Student | Requirements Validation | Mandatory requirements defined | POST `/api/applications` with missing required documents | Incomplete payload | Automated checker flags missing documents | Evaluated `RULE_REQ_DOCS_PRESENT: FAIL`, recommendation `NEEDS_RESUBMISSION_RECOMMENDED` | **PASSED** | EVD-TST-04 | - | Missing requirements flagged |
| **TC-STU-17** | Mobile / API | Student | Storage & Privacy | Student uploaded file | Attempt access to another student's document via ID / path | Unauthorized access | HTTP 403 Forbidden with object-level denial | Returned 403 Forbidden: "You do not have permission to access this document" | **PASSED** | EVD-TST-05 | - | Cross-student isolation verified |
| **TC-STU-18** | Mobile / API | Student | OCR Scanner | Scanned Philippine ID uploaded | POST `/api/ocr/extract` with ID image buffer | Valid image | Tesseract OCR extracts text, detects doc type, parses regex fields | Extracted fullName, idNumber, DOB, docType with confidence score | **PASSED** | EVD-TST-04 | - | OCR extraction verified |
| **TC-STU-19** | Mobile / API | Student | OCR Scanner | Blurry / unreadable image (< 30% conf) | POST `/api/ocr/extract` with degraded image | Boundary image | Routes to `PENDING_MANUAL_REVIEW` without dropped file | Fallback triggered, file preserved, status set to manual review | **PASSED** | EVD-TST-04 | - | Graceful unreadable fallback verified |
| **TC-STU-20** | Mobile / API | Student | Status Tracking | Application submitted | GET `/api/applications/:id` | Status polling | Returns live status and timeline events | Real-time timeline returned with all transition events | **PASSED** | EVD-TST-03 | - | Full lifecycle tracking operational |
| **TC-STU-21** | Mobile / API | Student | Info Request Response | Provider requested info | PUT `/api/applications/:id/student-response` with response details | Clarification | Status updates from `MORE_INFORMATION_REQUIRED` to `PENDING_HUMAN_REVIEW` | Transition validated, notes recorded, returned to review queue | **PASSED** | EVD-TST-03 | - | Information loop verified |
| **TC-STU-22** | Mobile / API | Student | Document Resubmission | Provider requested resubmission | PUT `/api/applications/:id/resubmit-document` with new document | Replacement file | Status updates from `RESUBMISSION_REQUIRED` to `PENDING_HUMAN_REVIEW` | Replacement uploaded, new version preserved, returned to queue | **PASSED** | EVD-TST-03 | - | Resubmission loop verified |
| **TC-STU-23** | Mobile / API | Student | Schedule Acknowledgment | Interview scheduled by provider | POST `/api/applications/:id/acknowledge-schedule` | Schedule action | Schedule marked acknowledged; application status remains in interview stage | Acknowledgment recorded in schedule and application timeline | **PASSED** | EVD-TST-03 | - | Interview scheduling verified |
| **TC-STU-24** | Mobile / API | Student | Messaging | Active application | POST `/api/applications/:id/messages` | Message payload | Message delivered to conversation thread, socket notification sent | Message stored, socket emitted, visible in thread | **PASSED** | EVD-TST-03 | - | Bidirectional messaging verified |
| **TC-STU-25** | Mobile | Student | Chatbot Assistant | Open `ChatbotPage` in mobile app | Send question to assistant | In-app query | Connects to intelligent scholarship assistant backend | Returns static mock string `'(Demo response)'` after 650ms delay | **PARTIAL** | EVD-SEC-10 | SEC-10 | Chatbot is a non-functional mock UI |

---

## 2. Scholarship Provider Test Cases (Web Portal & API)

| Test ID | Platform | User Role | Module | Preconditions | Test Steps | Data Category | Expected Result | Actual Observed Result | Status | Evidence Ref | Defect Ref | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **TC-PRV-01** | Web / API | Provider | Registration | New provider details | POST `/api/auth/register` with role 'sponsor' and company info | Registration | Provider account created; marked `sponsor_verified: false` | Created unverified; requires admin accreditation | **PASSED** | EVD-TST-09 | - | Provider registration verified |
| **TC-PRV-02** | Web / API | Provider | Accreditation Access | Unverified provider | Attempt to create scholarship via POST `/api/scholarships` | Authorization | Rejected with HTTP 403 until verified by admin | Blocked by `sponsorVerification` middleware | **PASSED** | EVD-TST-09 | - | Verification gating enforced |
| **TC-PRV-03** | Web / API | Provider | Program Creation | Verified provider | POST `/api/scholarships` with valid title, description, slots, deadline | Valid scholarship | Scholarship created with status 'open' and stored criteria | Scholarship 201 Created and persisted | **PASSED** | EVD-TST-03 | - | Publishing verified |
| **TC-PRV-04** | Web / API | Provider | Slot Validation | Verified provider | POST `/api/scholarships` with `slots: -5` or `slots: 0` | Boundary / Invalid | HTTP 400 Bad Request: slots must be at least 1 | Allowed negative slots (-5) because route lacks validator chain | **FAILED** | EVD-SEC-06 | SEC-06 | Inconsistent route validation |
| **TC-PRV-05** | Web / API | Provider | Deadline Validation | Verified provider | POST `/api/scholarships` with past deadline date | Boundary / Invalid | HTTP 400 Bad Request: deadline must be future date | Accepted past deadline string without date validation | **FAILED** | EVD-SEC-06 | SEC-06 | Missing date constraint check |
| **TC-PRV-06** | Web / API | Provider | Application Review | Student applied to provider scholarship | GET `/api/applications/:id` | Provider query | Provider views student profile, submitted files, OCR results | Full application details, documents, and OCR data loaded | **PASSED** | EVD-TST-03 | - | Provider review working |
| **TC-PRV-07** | Web / API | Provider | Cross-Provider Access | Two providers (P1, P2) | P1 attempts to access P2's scholarship applicants | IDOR attack | HTTP 403 Forbidden | Returned 403 "Not allowed to update this application" | **PASSED** | EVD-TST-05 | - | Cross-provider IDOR blocked |
| **TC-PRV-08** | Web / API | Provider | Checker Evaluation | Application submitted | Inspect automated recommendation on applicant | Automated rules | Displays advisory recommendation badge (`ELIGIBLE_FOR_REVIEW`) | Badge displayed with 16-rule breakdown; final status remains pending | **PASSED** | EVD-TST-04 | - | Explainable checker verified |
| **TC-PRV-09** | Web / API | Provider | Scheduling | Candidate under review | POST `/api/applications/:id/schedule` with date, time, venue/link | Interview event | Application status updates to `INTERVIEW_SCHEDULED`; student notified | Schedule created, status transitioned, notification emitted | **PASSED** | EVD-TST-03 | - | Scheduling operational |
| **TC-PRV-10** | Web / API | Provider | Approval Flow | Candidate interviewed & qualified | PATCH `/api/applications/:id/status` with `status: 'approved'` | Awarding decision | Application status updates to `APPROVED`; sovereign human decision logged | Official status set to `APPROVED`; actor and timestamp logged | **PASSED** | EVD-TST-03 | - | Sovereign approval verified |
| **TC-PRV-11** | Web / API | Provider | Rejection Reason | Candidate in review | PATCH `/api/applications/:id/status` with `status: 'rejected'` and empty reason | Invalid payload | HTTP 400 Bad Request: rejection reason is mandatory | Returned 400: "A specific reason is required when setting status to REJECTED" | **PASSED** | EVD-TST-04 | - | Mandatory rejection reason |
| **TC-PRV-12** | Web / API | Provider | Accounting Ledger | Approved candidate | POST `/api/transactions` to record allowance allocation | Financial ledger | Recorded in database transaction ledger | Recorded internal transaction; no external banking gateway | **PARTIAL** | EVD-SEC-11 | SEC-11 | Internal ledger only; no real payment gateway |

---

## 3. Platform Administrator Test Cases (Web Portal & API)

| Test ID | Platform | User Role | Module | Preconditions | Test Steps | Data Category | Expected Result | Actual Observed Result | Status | Evidence Ref | Defect Ref | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **TC-ADM-01** | Web / API | Administrator | Provider Verification | Unverified provider in queue | PATCH `/api/admin/accounts/:id/verify` | Accreditation | Provider marked `sponsor_verified: true`; unlocked to post scholarships | Provider verified; accreditation event logged to audit trail | **PASSED** | EVD-TST-09 | - | Provider accreditation verified |
| **TC-ADM-02** | Web / API | Administrator | User Management | Active user account | PATCH `/api/admin/accounts/:id/suspend` with reason | Administrative control | Account `isSuspended: true`; all active tokens rejected | Account suspended, session revoked, login blocked | **PASSED** | EVD-TST-05 | - | Account suspension verified |
| **TC-ADM-03** | Web / API | Administrator | User Management | Suspended user account | PATCH `/api/admin/accounts/:id/reactivate` | Administrative control | Account `isSuspended: false`; login restored | Account reactivated; login restored | **PASSED** | EVD-TST-05 | - | Reactivation verified |
| **TC-ADM-04** | Web / API | Administrator | Audit Logging | Any state-changing event occurs | GET `/api/admin/audit-logs` | Oversight | Append-only audit events recorded with actor, role, action, target, IP, timestamp | Complete audit log timeline retrieved (verified across 9+ events) | **PASSED** | EVD-TST-03 | - | Append-only audit logging verified via API |
| **TC-ADM-05** | Web / API | Administrator | Audit Log Tampering | Admin attempts to edit audit log | PUT / DELETE `/api/admin/audit-logs/:id` | Security check | Modifying or deleting audit logs via API is strictly rejected | No route exists to modify or delete audit log entries | **PASSED** | EVD-TST-05 | - | API-level audit trail tampering blocked |
| **TC-ADM-06** | Web / API | Administrator | Sovereign Decision Guard | Application pending review | Admin attempts to award scholarship without provider authorization | Separation of concerns | Admin cannot unilaterally overwrite provider scholarship awarding decisions | Protected by role separation and ownership check | **PASSED** | EVD-TST-04 | - | Human sovereign authority enforced |
| **TC-ADM-07** | Web / API | Administrator | Document Access Audit | Admin downloads student document | GET `/api/documents/:id/download` as admin | Oversight audit | Document served to admin, but `ADMIN_FILE_ACCESS` event logged to audit trail | Document returned; audit event `ADMIN_FILE_ACCESS` recorded in DB | **PASSED** | EVD-TST-05 | - | Admin document access audited |
| **TC-ADM-08** | Web Client | Administrator / Provider | Accessibility | Open `LoginModal.jsx` or admin modals | Attempt keyboard Escape key and Tab focus trap | WCAG 2.1 compliance | Escape key closes modal; Tab key trapped inside active dialog | Modal does not handle Escape; focus can escape to background DOM | **FAILED** | EVD-SEC-09 | SEC-09 | Accessibility WCAG 2.1 Level A/AA defect |

---

## 4. Test Results Summary (Row-by-Row Reconciliation)

| User Role Group | Total Numbered Cases | PASSED | FAILED | PARTIAL | BLOCKED | NOT TESTED |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Student Applicant (`TC-STU-01` to `TC-STU-25`)** | **25** | 21 | 3 | 1 | 0 | 0 |
| **Scholarship Provider (`TC-PRV-01` to `TC-PRV-12`)** | **12** | 9 | 2 | 1 | 0 | 0 |
| **Platform Administrator (`TC-ADM-01` to `TC-ADM-08`)** | **8** | 7 | 1 | 0 | 0 | 0 |
| **Total Numbered Cases** | **45** | **37** | **6** | **2** | **0** | **0** |

### Breakdown of the Six Distinct Failed Cases:
1. **`TC-STU-06` (Authentication):** Backdoor password `Password123!` accepted when `NODE_ENV !== 'production'` ([`authController.js:150-152`](../web/server/src/controllers/authController.js#L150-L152) — `SEC-01`).
2. **`TC-STU-07` (Authentication):** MFA bypass permitted when client passes `skipMfa: true` ([`authController.js:188`](../web/server/src/controllers/authController.js#L188) — `SEC-02`).
3. **`TC-STU-11` (Authentication / Session):** In-memory token revocation list (`new Set()`) is not shared across multi-node or clustered instances ([`authMiddleware.js:26`](../web/server/src/middleware/authMiddleware.js#L26) — `SEC-05`).
4. **`TC-PRV-04` (Scholarship Management):** `POST /api/scholarships` lacks express-validator chain, permitting negative and zero slot values ([`routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20) — `SEC-06`).
5. **`TC-PRV-05` (Scholarship Management):** `POST /api/scholarships` lacks date validation chain, permitting past application deadlines ([`routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20) — `SEC-06`).
6. **`TC-ADM-08` (Accessibility):** `LoginModal.jsx` fails WCAG 2.1 criteria for focus trapping and Escape key dismissal ([`LoginModal.jsx`](../web/client/src/components/LoginModal.jsx) — `SEC-09`).

### Breakdown of the Two Partial Cases:
1. **`TC-STU-25` (Mobile Assistant):** `chatbot_page.dart` displays a UI chat bubble layout but returns a static hardcoded demo string after 650ms delay without backend NLP integration (`SEC-10`).
2. **`TC-PRV-12` (Financial Accounting):** `transactionController.js` and `Transaction.js` successfully record internal funding allocations and ledger states in MongoDB, but do not execute live monetary transfers (`SEC-11`).

---

## 5. Out-of-Scope Capabilities

The following capability was evaluated during architecture review but is explicitly classified as **Out of Scope** for the ISKOLAR 2.0 capstone baseline:

- **Live Monetary Wire Transfer / Payment Gateway Processing:**
  - *Evaluation:* The codebase contains internal accounting and allocation models (`Transaction.js`) but integrates no banking or commercial e-wallet APIs (e.g. PayMongo, GCash, Maya, Stripe, UnionBank).
  - *Scope Determination:* ISKOLAR's documented capstone requirements govern scholarship matching, document validation, applicant ranking, and provider awarding oversight. Because automated monetary disbursement is not a functional requirement, the absence of an external payment gateway does **not** count as a test failure, nor does it degrade the platform's core functional evaluation.

---

## 6. Automated Test Suite Reconciliation & Scope Distinction

Three distinct quantitative measurements are maintained across the audit documentation:

1. **Gross executions (163):** Every test execution across every command and test runner script, including repeated and overlapping coverage.
2. **Unique automated cases (146):** Distinct automated test assertions after explicitly mapped overlapping sub-suites are deduplicated.
3. **Numbered audit cases (45):** The separate functional audit matrix presented in Sections 1–4 above.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATED TEST RECONCILIATION SUMMARY                           │
├────────────────────────────────┬────────────┬──────────────────────────────────────────┤
│ Test Command / Suite           │ Executions │ Coverage Category / Evidence Ref         │
├────────────────────────────────┼────────────┼──────────────────────────────────────────┤
│ mobile: flutter test           │ 81         │ Widget & multi-scale tests (EVD-TST-01)  │
│ client: npm test               │ 10         │ Web UI effects & accessibility(EVD-TST-02│
│ test_master_capstone_connected │ 27         │ End-to-end 3-role workflow (EVD-TST-03)  │
│ run_all_connectivity_audit     │ 17         │ Multi-role storage & security(EVD-TST-05)│
│ test_scanner_and_checker       │ 11         │ Unified scanner/rules suite (EVD-TST-04) │
│ test_automatic_checking        │ 6          │ Sub-suite: rules engine (EVD-TST-06)     │
│ test_ocr_runtime               │ 5          │ Sub-suite: OCR runtime (EVD-TST-07)      │
│ test_student_account_verify    │ 3          │ Sub-suite: student review (EVD-TST-08)   │
│ test_provider_account_verify   │ 3          │ Sub-suite: provider accred. (EVD-TST-09) │
├────────────────────────────────┼────────────┼──────────────────────────────────────────┤
│ Gross Automated Executions     │ 163        │ Total test executions across all suites  │
│ Overlapping Sub-Suite Runs     │ -17        │ 6 (Rules) + 5 (OCR) + 3 (Stud) + 3 (Prov)│
├────────────────────────────────┼────────────┼──────────────────────────────────────────┤
│ Deduplicated Unique Cases      │ 146        │ Distinct automated test assertions       │
└────────────────────────────────┴────────────┴──────────────────────────────────────────┘
```

**Deduplication Calculation:**
$$\text{Unique Automated Cases} = 163 \text{ gross executions} - 17 \text{ overlapping sub-suite executions} = 146 \text{ unique cases}$$

---

## 7. Unexecuted Assessment Categories & Evidence Limitations

In accordance with rigorous audit standards, the following **14 assessment categories** are maintained as unexecuted assessment categories and evidence limitations. They are kept **strictly separate** from the 45 numbered functional cases above and do **not** alter the 45-case totals (37 Passed, 6 Failed, 2 Partial, 0 Blocked, 0 Not Tested within the numbered matrix):

1. **Microsoft Edge:** Browser compatibility testing not executed.
2. **Mozilla Firefox:** Browser compatibility testing not executed.
3. **Apple Safari:** Browser compatibility testing not executed.
4. **Android Emulator:** Virtual device testing not launched.
5. **Physical Android Device:** Physical hardware testing not attached.
6. **Release APK / AAB Installation:** Production signed package installation not executed on device.
7. **TalkBack:** Screen reader accessibility testing not executed on Android hardware.
8. **Screen Readers (NVDA / VoiceOver):** Desktop assistive technology testing not executed in headless session.
9. **Five-Run Lighthouse Testing:** Multi-run Lighthouse automated audit was not executed.
10. **Core Web Vitals:** Throttled network profiling for FCP, LCP, TBT, and CLS was not recorded.
11. **Concurrent-Load Testing:** Distributed load benchmark (> 100 req/s) was not executed.
12. **Live Twilio SMS Delivery:** SMS delivery via real cellular carrier networks was not tested (`SMS_ENABLED="false"`).
13. **Live Firebase Push Delivery:** FCM push delivery to live devices was not executed (missing service account credentials).
14. **Production Cloudflare R2 Verification:** Production R2 cloud bucket verification was not performed (bucket credentials empty; local fallback active).
