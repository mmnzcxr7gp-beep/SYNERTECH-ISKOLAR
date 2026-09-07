# ISKOLAR 2.0 – Master System Audit Report
**Learning Aid and Scholarship Management Platform**  
**Development Team:** SynerTech  
**Audit Date:** September 6, 2026  
**Auditor:** Senior Full-Stack Software Auditor, QA Engineer, Cybersecurity Reviewer, Capstone Evaluator  

---

## 1. Executive Summary & Corrected Audit Box

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          ISKOLAR 2.0 AUDIT BASELINE SUMMARY                            │
├───────────────────────────────────┬────────────────────────────────────────────────────┤
│ Readiness Classification          │ NOT READY FOR PUBLIC PRODUCTION DEPLOYMENT         │
│ Permissible Operational Context   │ Controlled local demonstration only (Isolated test │
│                                   │ accounts, synthetic data only, no public access)   │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ Vulnerability Findings            │ Total: 11 (Critical: 0, High: 3, Medium: 4,        │
│                                   │            Low: 2, Informational: 2)               │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ Numbered Functional Test Cases    │ Total: 45 (Passed: 37, Failed: 6, Partial: 2,      │
│                                   │            Blocked: 0, Not Tested: 0)              │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ Out-of-Scope Capabilities         │ Live Monetary Wire Transfer / Payment Gateway      │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ Automated Test Executions         │ Gross executions: 163 across all commands          │
│                                   │ Overlapping sub-suite runs: 17 executions          │
│                                   │ Deduplicated unique automated cases: 146           │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ Web Browser Compatibility         │ Chromium-based browser tested; exact version not   │
│                                   │ recorded. Microsoft Edge, Mozilla Firefox,         │
│                                   │ Apple Safari: NOT TESTED                           │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ Mobile Device Compatibility       │ Flutter Widget Layout & Scaling: TESTED (PASSED)   │
│                                   │ Android Emulator & Physical Hardware: NOT TESTED   │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ External Integrations Reality     │ Socket.IO & Local OCR: LIVE VERIFIED               │
│                                   │ Cloudflare R2 & Nodemailer: CONFIGURED / DEV MODE  │
│                                   │ Twilio SMS & Firebase Push: CONFIGURED (INACTIVE)  │
│                                   │ Mobile Chatbot: MOCKED (PROTOTYPE)                 │
│                                   │ Banking / Payment Gateway: UNIMPLEMENTED           │
└───────────────────────────────────┴────────────────────────────────────────────────────┘
```

### Readiness Evaluation Justification
The platform is classified as **NOT READY FOR PUBLIC PRODUCTION DEPLOYMENT** under standard software quality and cybersecurity criteria because **three High-severity vulnerabilities remain unresolved**:
1. **`SEC-01`**: A hardcoded development password comparison (`Password123!`) in `authController.js` that bypasses bcrypt authentication in non-production configurations.
2. **`SEC-02`**: A client-controlled parameter (`skipMfa: true`) in `authController.js` that bypasses email multi-factor authentication without server-side environment restriction.
3. **`SEC-03`**: An Android release signing keystore (`upload-keystore.jks`) committed directly to the Git repository.

**Controlled Demonstration Caveat:** The application is suitable for an internal capstone presentation or controlled local academic demonstration **only** under strict safeguards: test accounts must be isolated, no real student personal data may be stored, the server must not be bound to public IP interfaces, and all evaluation panel members must be informed of the audit findings.

---

## 2. Audit Scope

The read-only audit inspected:
- **Backend API Server:** `web/server` (Express 4.18, Node.js 20+, MongoDB native driver 7.2, Mongoose 8.0, Socket.IO 4.7, Cloudflare R2 S3 SDK, Tesseract.js 7.0, Nodemailer 9.0).
- **Web Frontend:** `web/client` (React 18.2, Vite 5.4, Tailwind CSS 3.4, Framer Motion 10.12, Three.js 0.185).
- **Mobile Client:** `mobile` (Flutter 3.10+ / Dart SDK 3.10+, Provider 6.0, http 1.6, shared_preferences 2.2).
- **Deployment & Config:** `render.yaml`, `web/client/vercel.json`, `wrangler.toml`, environment templates.

---

## 3. Discovered System Topology & External Service Reality

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DISCOVERED SYSTEM TOPOLOGY                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [ Student Applicant ]                 [ Scholarship Provider ]      [ Platform Administrator ]
   (Flutter Mobile)                      (React Web Portal)            (React Web Portal)
          │                                      │                              │
          ▼                                      ▼                              ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │                               Express.js REST API Server                              │
 │  - Authentication (JWT + Bcrypt + CSRNG OTP)      - Role & Platform Middleware        │
 │  - Socket.IO Real-time Engine                     - Rate Limiting (express-rate-limit)│
 │  - TaskQueue Concurrency Controller               - Sentry Observability Engine       │
 └──────┬──────────────────────┬─────────────────────────┬────────────────────────┬──────┘
        │                      │                         │                        │
        ▼                      ▼                         ▼                        ▼
 ┌───────────────┐     ┌───────────────┐         ┌───────────────┐        ┌───────────────┐
 │ MongoDB Atlas │     │ Cloudflare R2 │         │ Tesseract.js  │        │ Notifications │
 │ - 10 discrete │     │ - S3-compat   │         │ - OCR Engine  │        │ - Nodemailer  │
 │   collections │     │   object store│         │ - Philippine  │        │ - Socket.IO   │
 │ - Indexes &   │     │ - SHA-256 hash│         │   ID regex    │        │ - FCM (Config)│
 │   TTL models  │     │   integrity   │         │   parsers     │        │ - Twilio (Cfg)│
 └───────────────┘     └───────────────┘         └───────────────┘        └───────────────┘
```

### External Services Classification

| Service Component | Implementation Reality | Operational Classification |
| :--- | :--- | :---: |
| **MongoDB Atlas** | Live connection established to `cluster0.bmsc3s6.mongodb.net/iskolar` using native driver and Mongoose 8. | **LIVE VERIFIED** |
| **Socket.IO Engine** | Server listening on port 4000; verified authenticated rooms for `user_*`, `student_room_*`, and `admin_room`. | **LIVE VERIFIED** |
| **Tesseract.js OCR** | Engine initialized locally using `eng.traineddata`; regex extraction verified across Philippine credentials. | **LIVE VERIFIED** |
| **Cloudflare R2** | Storage driver supports S3 API. In current test environment, falls back to protected local disk storage because bucket credentials are empty. | **CONFIGURED / FALLBACK ACTIVE** |
| **Email (Nodemailer)** | Initialized via Ethereal test account in development mode. Real Gmail SMTP configured via environment template. | **CONFIGURED / TEST MODE** |
| **Twilio SMS Verify** | Integration code exists in `smsService.js`, but globally disabled via `SMS_ENABLED="false"`. | **CONFIGURED (INACTIVE)** |
| **Firebase Cloud Messaging** | SDK initialization code exists in `pushNotificationService.js`, but disabled due to missing service account JSON. | **CONFIGURED (INACTIVE)** |
| **Sentry Monitoring** | SDK imported, but skipped during boot due to placeholder DSN. | **CONFIGURED (INACTIVE)** |
| **Mobile Chatbot** | `chatbot_page.dart` returns hardcoded dummy string after 650ms timer. No AI model connected. | **MOCKED (PROTOTYPE)** |
| **Payment Gateway** | `Transaction.js` stores internal ledger balances. No banking wire or e-wallet APIs integrated. | **UNIMPLEMENTED** |

---

## 4. Environment & Build Status

- **Web Portal Build:** PASSED. `npm --prefix web/client run build` completed cleanly in 5.34s (716 modules, ~1.2 MB uncompressed JS). (`EVD-BLD-01`).
- **Mobile Static Analysis:** PASSED. `flutter analyze --no-pub` reported `No issues found!` in 3.2s. (`EVD-BLD-02`).
- **Server Boot:** PASSED. `node server.js` booted on port 4000 with MongoDB Atlas connection. (`EVD-BLD-03`).
- **Flutter Web Server:** PASSED. `node mobile/serve_flutter_web.js` served web assets on port 8088. (`EVD-BLD-04`).

---

## 5. Functional Test Results Reconciliation

The functional test matrix evaluates **45 numbered test cases** across all user roles:
- **Student Applicant:** 25 cases (`TC-STU-01` to `TC-STU-25`)
- **Scholarship Provider:** 12 cases (`TC-PRV-01` to `TC-PRV-12`)
- **Platform Administrator:** 8 cases (`TC-ADM-01` to `TC-ADM-08`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FUNCTIONAL TEST RECONCILIATION                       │
├───────────────────────────────────┬───────┬────────────────────────────┤
│ Status Category                   │ Count │ Percentage                 │
├───────────────────────────────────┼───────┼────────────────────────────┤
│ PASSED                            │ 37    │ 82.2%                      │
│ FAILED                            │ 6     │ 13.3%                      │
│ PARTIAL                           │ 2     │ 4.4%                       │
│ BLOCKED                           │ 0     │ 0.0%                       │
│ NOT TESTED (Numbered Cases)       │ 0     │ 0.0%                       │
├───────────────────────────────────┼───────┼────────────────────────────┤
│ Total Numbered Test Cases         │ 45    │ 100.0%                     │
└───────────────────────────────────┴───────┴────────────────────────────┘
```

### Detailed Record of the Six Failed Cases:
1. **`TC-STU-06` (Authentication):** Backdoor password `Password123!` accepted when `NODE_ENV !== 'production'` ([`../web/server/src/controllers/authController.js:150-152`](../web/server/src/controllers/authController.js#L150-L152) — Finding `SEC-01`).
2. **`TC-STU-07` (Authentication):** Client-controlled `skipMfa: true` bypasses two-factor email OTP verification ([`../web/server/src/controllers/authController.js:188`](../web/server/src/controllers/authController.js#L188) — Finding `SEC-02`).
3. **`TC-STU-11` (Session Management):** Logged-out JWT tokens are tracked in an in-memory `Set()` and are not invalidated on other clustered server nodes ([`../web/server/src/middleware/authMiddleware.js:26`](../web/server/src/middleware/authMiddleware.js#L26) — Finding `SEC-05`).
4. **`TC-PRV-04` (Program Management):** `POST /api/scholarships` lacks express-validator middleware, allowing negative and zero slot counts ([`../web/server/src/routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20) — Finding `SEC-06`).
5. **`TC-PRV-05` (Program Management):** `POST /api/scholarships` accepts past deadlines without date constraint verification ([`../web/server/src/routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20) — Finding `SEC-06`).
6. **`TC-ADM-08` (Accessibility):** `LoginModal.jsx` fails WCAG 2.1 modal dialog standards: focus is not trapped within the dialog, and pressing the Escape key does not dismiss the modal ([`../web/client/src/components/LoginModal.jsx`](../web/client/src/components/LoginModal.jsx) — Finding `SEC-09`).

### Record of the Two Partial Cases:
1. **`TC-STU-25` (Mobile Assistant):** `chatbot_page.dart` displays UI chat bubbles but returns a static mock response string after 650ms timer without backend AI integration (Finding `SEC-10`).
2. **`TC-PRV-12` (Financial Accounting):** `transactionController.js` and `Transaction.js` record internal allocation states in MongoDB, but do not execute live monetary transfers (Finding `SEC-11`).

### Out-of-Scope Capabilities:
- **Live Monetary Wire Transfer / Payment Gateway:** ISKOLAR's documented requirements govern scholarship discovery, document verification, applicant ranking, and awarding decisions. Because automated wire transfers are not an approved requirement, the absence of an external banking gateway does not count as a test failure.

For the full scenario-by-scenario table, see [`./ISKOLAR_TEST_RESULTS.md`](./ISKOLAR_TEST_RESULTS.md).

---

## 6. Automated Test Suite Reconciliation & Overlap Analysis

Three distinct quantitative measurements are maintained:
1. **Gross executions (163):** Every automated test execution across every command and script, including overlapping and repeated coverage.
2. **Unique automated cases (146):** Distinct automated test assertions after removing explicitly mapped overlapping sub-suites.
3. **Numbered audit cases (45):** The separate functional audit matrix in [`./ISKOLAR_TEST_RESULTS.md`](./ISKOLAR_TEST_RESULTS.md).

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

### Deduplication Formula:
$$\text{Unique Automated Cases} = \text{Gross Executions (163)} - \text{Overlapping Sub-Suite Executions (17)} = 146$$

- `test_automatic_checking.js` (6 tests, `EVD-TST-06`) and `test_ocr_runtime.js` (5 tests, `EVD-TST-07`) are exact functional subroutines of `test_scanner_and_checker_verification.js` (11 tests, `EVD-TST-04`).
- `test_student_account_verification.js` (3 tests, `EVD-TST-08`) and `test_provider_account_verification.js` (3 tests, `EVD-TST-09`) are covered within `run_all_connectivity_audit_tests.js` (`EVD-TST-05`) and `test_master_capstone_connected_workflow.js` (`EVD-TST-03`).
- Removing these 17 overlapping sub-suite executions from the 163 gross executions yields exactly **146 unique automated test assertions**.

---

## 7. Security Audit Findings Summary

| ID | Title | Severity | CWE | Affected File |
| :--- | :--- | :---: | :--- | :--- |
| **`SEC-01`** | Backdoor Password in Non-Production | **High** | CWE-798 | [`../web/server/src/controllers/authController.js:150-152`](../web/server/src/controllers/authController.js#L150-L152) |
| **`SEC-02`** | MFA Bypass via `skipMfa` Parameter | **High** | CWE-287 | [`../web/server/src/controllers/authController.js:188`](../web/server/src/controllers/authController.js#L188) |
| **`SEC-03`** | Signing Keystore Committed to Git | **High** | CWE-522 | [`../mobile/android/app/upload-keystore.jks`](../mobile/android/app/upload-keystore.jks) |
| **`SEC-04`** | Cleartext HTTP in Android Manifest | **Medium** | CWE-319 | [`../mobile/android/app/src/main/AndroidManifest.xml:14`](../mobile/android/app/src/main/AndroidManifest.xml#L14) |
| **`SEC-05`** | Non-Distributed JWT Revocation | **Medium** | CWE-613 | [`../web/server/src/middleware/authMiddleware.js:26`](../web/server/src/middleware/authMiddleware.js#L26) |
| **`SEC-06`** | Missing Route Schema Validation | **Medium** | CWE-20 | [`../web/server/src/routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20) |
| **`SEC-07`** | Database In-Memory Mirroring Hazard | **Medium** | CWE-400 | [`../web/server/src/config/db.js:53-108`](../web/server/src/config/db.js#L53-L108) |
| **`SEC-08`** | Sensitive Hostnames in `.env.example` | **Low** | CWE-200 | [`../web/server/.env.example:4,16`](../web/server/.env.example#L4) |
| **`SEC-09`** | Modal Focus Trap & Escape Key Defect | **Low** | WCAG 2.1 | [`../web/client/src/components/LoginModal.jsx`](../web/client/src/components/LoginModal.jsx) |
| **`SEC-10`** | Mock Chatbot in Mobile Application | **Info** | N/A | [`../mobile/lib/screens/chatbot_page.dart:42-52`](../mobile/lib/screens/chatbot_page.dart#L42-L52) |
| **`SEC-11`** | Accounting Ledger without Wire Gateway | **Info** | N/A | [`../web/server/src/controllers/transactionController.js`](../web/server/src/controllers/transactionController.js) |

For complete reproduction steps and impact assessments, see [`./ISKOLAR_SECURITY_AUDIT.md`](./ISKOLAR_SECURITY_AUDIT.md).

---

## 8. Audit Log Integrity Clarification

All administrative actions, provider decisions, and applicant status updates generate audit records that are **append-only through the exposed application API**. The Express API exposes no `PUT` or `DELETE` endpoints for audit records (`GET /api/admin/audit-logs` only).

However, **database-level immutability is not enforced**. Cryptographic hash chaining (Merkle trees), write-once object retention (S3 Object Lock), and append-only database user privileges are not configured. Anyone with direct MongoDB credentials could alter or delete audit documents.

---

## 9. Accessibility Audit Breakdown

Automated checks do not establish full accessibility compliance. The evaluation was decomposed into specific verification categories:

| Accessibility Category | Platform | Evaluation Status | Result / Observed Behavior |
| :--- | :--- | :---: | :--- |
| **Automated Contrast & Motion** | Web | **TESTED** | PASSED (Vite preview test verified dark theme contrast & reduced motion). |
| **Text Scaling (150%, 200%)** | Mobile | **TESTED** | PASSED (Flutter widget regression tests passed at 150% and 200% scale). |
| **Touch-Target Sizing** | Mobile | **PARTIAL** | Verified 48x48dp minimums on primary navigation; dense sub-tables not audited. |
| **Modal Focus Trapping** | Web | **TESTED** | **FAILED** (`LoginModal.jsx` allows keyboard Tab to cycle behind dialog). |
| **Escape Key Dismissal** | Web | **TESTED** | **FAILED** (`LoginModal.jsx` lacks keydown listener for Escape). |
| **Screen Reader (VoiceOver/NVDA)**| Web | **NOT TESTED** | Assistive screen reader testing was not executed in this headless session. |
| **TalkBack Compatibility** | Mobile | **NOT TESTED** | Physical Android accessibility service was not attached. |
| **Error & Status Announcements**| Both | **NOT TESTED** | Dynamic ARIA live regions and semantic announcements not evaluated. |

---

## 10. Compatibility Audit Breakdown

### Web Compatibility:
- **Chromium / Google Chrome:** **TESTED & PASSED**  
  - Chromium-based browser tested; exact version not recorded.
  - Viewports: 360px (mobile), 768px (tablet), 1280px (laptop), 1920px (desktop).
  - Evidence: `EVD-TST-02` (10 passed tests in `tests/test_homepage_effects.js`).
- **Microsoft Edge:** **NOT TESTED** (No dedicated Edge execution record).
- **Mozilla Firefox:** **NOT TESTED** (No dedicated Gecko execution record).
- **Apple Safari:** **NOT TESTED** (No dedicated WebKit execution record).

### Mobile Compatibility:
- **Flutter Widget Responsiveness:** **TESTED & PASSED**  
  - Verified across 4 screen sizes (360x800, 390x844, 412x915, 768x1024) across 3 text scales (100%, 150%, 200%). Evidence: `EVD-TST-01` (81 passed tests).
- **Android OS / API Levels:** **PARTIALLY EVALUATED**  
  - `build.gradle.kts` configures `compileSdk: 34` with `minSdkVersion: flutter.minSdkVersion` (API 21).
- **Android Emulator Compatibility:** **NOT TESTED** (Emulator was not launched during this read-only session).
- **Physical Android Device:** **NOT TESTED** (No USB debugging device attached).
- **Release APK / AAB Installation:** **NOT TESTED**.
- **Background / Resume Lifecycle:** **NOT TESTED** on hardware.
- **Hardware Camera & File Picker:** **NOT TESTED** on physical hardware.
- **Push Notification Receiving:** **NOT TESTED** with live carrier networks or APNs.

---

## 11. Performance Audit Breakdown

Localhost curl response times do not constitute a complete performance audit. Performance was decomposed into specific measurable dimensions:

| Performance Dimension | Target / Scope | Evaluation Status | Result / Observed Value |
| :--- | :--- | :---: | :--- |
| **Local API Smoke-Test Latency** | `/api/health`, `/api/scholarships` | **TESTED** | `/api/health`: 2.16ms, `/api/scholarships`: 4.99ms, `/api/scholarship-opportunities/browse`: 2.59ms (`EVD-PERF-01`). |
| **Web Client Bundle Size** | Vite production build | **TESTED** | Total uncompressed JS: ~1.2 MB (~350 kB gzip). Three.js chunk: 502 kB. (`EVD-BLD-01`). |
| **OCR Processing Duration** | Tesseract.js buffer recognition | **TESTED** | Single document OCR: 1.2s – 2.8s per scan in task queue (`EVD-TST-04`). |
| **Lighthouse Performance Runs** | 5-run average on web portal | **NOT TESTED** | Lighthouse automated runner was not invoked in this session. |
| **Web Vitals (FCP, LCP, TBT, CLS)**| Core Web Vitals under throttling | **NOT TESTED** | Throttled network profiling was not recorded. |
| **Concurrent Load Testing** | Multi-user stress test (> 100 req/s)| **NOT TESTED** | Distributed load benchmark was not executed. |
| **Database Scaling under Load** | > 10,000 document records | **NOT TESTED** | `find({}).toArray()` mirroring hazard flagged under `SEC-07`. |
| **Physical Mobile Startup Time** | Cold/warm start on hardware | **NOT TESTED** | Mobile benchmarking tools (Systrace/DevTools) not attached. |
| **Flutter Frame Rendering / Jank**| 60fps frame budget profiling | **NOT TESTED** | Requires profile mode execution on real device. |

---

## 12. Unexecuted Assessment Categories & Evidence Limitations

In accordance with strict audit methodology, the following **14 assessment categories** are formally documented as unexecuted evaluation categories and evidence limitations for this headless, read-only audit session. They are maintained **strictly separate** from the 45 numbered functional cases and do not alter the reconciled 45-case totals (37 Passed, 6 Failed, 2 Partial, 0 Blocked, 0 Not Tested within the numbered matrix):

1. **Microsoft Edge Browser Testing:** No automated or manual test runs on Microsoft Edge.
2. **Mozilla Firefox Browser Testing:** No automated or manual test runs on Mozilla Firefox.
3. **Apple Safari Browser Testing:** No automated or manual test runs on Apple Safari / WebKit.
4. **Android Emulator Execution:** Android virtual device (AVD) was not booted during testing.
5. **Physical Android Device Execution:** No physical Android hardware was attached via ADB.
6. **Release APK / AAB Installation:** Production signed package installation was not executed on a physical device.
7. **TalkBack Accessibility Testing:** Google TalkBack screen reader was not tested on physical Android hardware.
8. **Screen Reader (Desktop) Testing:** NVDA / JAWS / VoiceOver desktop screen reader testing was not executed in this headless session.
9. **Five-Run Lighthouse Testing:** Multi-run Lighthouse automated audit was not executed.
10. **Core Web Vitals Profiling:** Throttled network profiling for FCP, LCP, TBT, and CLS was not recorded.
11. **Concurrent Load & Stress Testing:** Distributed multi-client load benchmark (> 100 req/s) was not performed.
12. **Live Twilio SMS Delivery:** SMS delivery via live carrier networks was not tested (`SMS_ENABLED="false"`).
13. **Live Firebase Push Delivery:** Push notification receiving on live carrier networks was not executed (missing service account credentials).
14. **Production Cloudflare R2 Verification:** Production R2 cloud bucket verification was not performed (bucket credentials empty; local fallback active).

---

## 13. Prioritized Recommended Actions

1. **Phase 1 Security Remediations (Before Any Public Deployment):**
   - Execute Fix 1.1: Remove backdoor comparison in `authController.js:150-152`.
   - Execute Fix 1.2: Remove client-controlled `skipMfa` parameter in `authController.js:188`.
   - Execute Fix 1.3: Remove `upload-keystore.jks` from Git and add to `.gitignore`.
2. **Phase 2 Hardening (Before Staging / Acceptance):**
   - Execute Fix 2.1: Disallow cleartext HTTP in Android manifest.
   - Execute Fix 2.2: Implement distributed Redis or MongoDB TTL token revocation.
   - Execute Fix 2.3: Unify route validation on `POST /api/scholarships`.
   - Execute Fix 2.4: Paginate `db.read()` to eliminate heap mirroring hazard.
3. **Phase 3 Accessibility & Scope:**
   - Execute Fix 3.1: Sanitize `.env.example` hostnames.
   - Execute Fix 3.2: Implement focus trap and Escape key listener in `LoginModal.jsx`.
   - Execute Fix 4.1 & 4.2: Update chatbot and financial ledger documentation to accurately reflect their prototype and accounting ledger status.

For technical details, see [`./ISKOLAR_REMEDIATION_PLAN.md`](./ISKOLAR_REMEDIATION_PLAN.md).
