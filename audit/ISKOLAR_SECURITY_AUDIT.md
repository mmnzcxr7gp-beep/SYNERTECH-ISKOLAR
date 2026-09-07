# ISKOLAR 2.0 – Cybersecurity & Application Security Audit

**System:** ISKOLAR 2.0 (Learning Aid and Scholarship Management Platform)  
**Development Team:** SynerTech  
**Audit Date:** September 6, 2026  
**Auditor:** Senior Cybersecurity Reviewer, Full-Stack Software Auditor, QA Engineer  
**Standard:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), OWASP Mobile Top 10  
**Canonical Status:** This document is the authoritative, canonical security audit report for ISKOLAR 2.0. (A separate 9-line overview exists at `docs/architecture/SECURITY.md`; see Section 4).

---

## 1. Executive Security Summary

An extensive, non-destructive static and dynamic cybersecurity audit was conducted on the ISKOLAR 2.0 platform covering the Express backend, MongoDB Atlas layer, Cloudflare R2 file storage engine, React web portal, and Flutter mobile application.

| Severity | Count | Key Vulnerability Summary |
| :--- | :---: | :--- |
| **Critical** | **0** | No remote code execution or unauthenticated database dumps discovered |
| **High** | **3** | Backdoor bypass in non-production, client-side MFA skip, release signing keystore committed to Git |
| **Medium** | **4** | Android cleartext HTTP traffic, non-distributed token blacklist, route validation discrepancy, DB memory mirroring |
| **Low** | **2** | Sensitive example configs in template, modal keyboard trap / WCAG accessibility |
| **Informational** | **2** | Mock chatbot in mobile UI, internal financial ledger without live payment gateway |
| **Total Findings** | **11** | Full remediation plan provided in [`./ISKOLAR_REMEDIATION_PLAN.md`](./ISKOLAR_REMEDIATION_PLAN.md) |

---

## 2. Detailed Vulnerability Register

---

### Finding SEC-01: Authentication Bypass via Hardcoded Backdoor Password in Non-Production
- **Finding ID:** `SEC-01`
- **Title:** Authentication Bypass via Hardcoded Backdoor Password in Non-Production Environments
- **Severity:** **High** (CWE-798: Use of Hard-coded Credentials / CWE-304)
- **Affected Platform:** Backend API (`web/server`)
- **Affected Role:** All Roles (Student, Provider, Platform Administrator)
- **File Path & Line Number:** [`../web/server/src/controllers/authController.js:150-152`](../web/server/src/controllers/authController.js#L150-L152)
- **Description:**  
  The password comparison logic in `login()` checks whether `process.env.NODE_ENV !== 'production'` and the password string equals `'Password123!'`. If true, it automatically sets `ok = true`, bypassing bcrypt password verification:
  ```javascript
  if (!ok && process.env.NODE_ENV !== 'production' && password === 'Password123!') {
    ok = true;
  }
  ```
- **Evidence Reference:** `EVD-SEC-01`
- **User or Business Impact:**  
  If any staging, preview, demo, or QA environment is accessible over the internet with `NODE_ENV` set to anything other than `'production'` (e.g. `'staging'`, `'development'`, or undefined), an attacker can log into ANY student, scholarship provider, or administrator account simply by knowing their email address and supplying `Password123!`. This results in complete account takeover.
- **Reproduction Steps:**
  1. Boot server in development or staging mode (`NODE_ENV=development`).
  2. Send `POST /api/auth/login` with body `{"email": "admin@iskolar.ph", "password": "Password123!"}`.
  3. Observe authentication succeeds and returns an administrative JWT access token.
- **Recommended Correction:**  
  Remove the fallback backdoor comparison completely. Automated tests that require login must use synthetic test passwords hashed into test databases, or explicitly gated behind an automated mock service restricted to `NODE_ENV === 'test'` and never callable via public routes.
- **Retest Procedure:**  
  Send `POST /api/auth/login` with `Password123!` against an account whose actual password is not `Password123!`; the server must return HTTP 401 Unauthorized regardless of `NODE_ENV`.

---

### Finding SEC-02: Multi-Factor Authentication (MFA) Bypass via Client-Controlled Parameter
- **Finding ID:** `SEC-02`
- **Title:** Multi-Factor Authentication (MFA) Bypass via Client-Controlled `skipMfa` Parameter
- **Severity:** **High** (CWE-287: Improper Authentication / CWE-308)
- **Affected Platform:** Backend API (`web/server`)
- **Affected Role:** All Roles (Student, Provider, Platform Administrator)
- **File Path & Line Number:** [`../web/server/src/controllers/authController.js:188`](../web/server/src/controllers/authController.js#L188)
- **Description:**  
  In `login()`, MFA challenge generation is guarded by:
  ```javascript
  const isSmtpConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  if (!skipMfa && isSmtpConfigured) { ... }
  ```
  The variable `skipMfa` is extracted directly from the untrusted client request body (`req.body.skipMfa`). If the client sends `"skipMfa": true`, the entire 2FA step is skipped and the backend immediately issues a fully-privileged JWT token without requiring the email OTP code.
- **Evidence Reference:** `EVD-SEC-02`
- **User or Business Impact:**  
  An attacker who obtains or cracks a user's password can completely neutralize the platform's multi-factor authentication defense by appending `"skipMfa": true` to their login request payload.
- **Reproduction Steps:**
  1. Ensure SMTP is configured.
  2. Send `POST /api/auth/login` with valid email and password, plus `"skipMfa": true`.
  3. Observe the response returns a full JWT token immediately rather than an `mfaToken` with `{ requiresMfa: true }`.
- **Recommended Correction:**  
  Remove client-side control over `skipMfa`. MFA enforcement must be dictated solely by server-side policy (e.g., whether the user has 2FA enabled, role policy, or environment). In development/test environments, allow a test mock or dedicated test endpoint, but never trust a client-provided boolean flag.
- **Retest Procedure:**  
  Send `POST /api/auth/login` with `"skipMfa": true` on a 2FA-enabled account; verify that the response still returns `{ requiresMfa: true, mfaToken: "..." }`.

---

### Finding SEC-03: Android Release Signing Keystore Committed to Git Repository
- **Finding ID:** `SEC-03`
- **Title:** Android Release Signing Keystore Committed to Git Source Repository
- **Severity:** **High** (CWE-522: Insufficiently Protected Credentials / CWE-312)
- **Affected Platform:** Mobile App (`mobile/android`)
- **Affected Role:** System Integrity / All Users
- **File Path & Line Number:** [`../mobile/android/app/upload-keystore.jks`](../mobile/android/app/upload-keystore.jks)
- **Description:**  
  The Java KeyStore file `upload-keystore.jks` (2,808 bytes) used for cryptographic signing of Android application release binaries is checked directly into the Git repository.
- **Evidence Reference:** `EVD-SEC-03`
- **User or Business Impact:**  
  If the repository is cloned, made public, or shared with unauthorized contributors, any party with the keystore file and its password can sign malicious APK updates disguised as legitimate ISKOLAR releases, facilitating phishing, malware distribution, or credential harvesting.
- **Reproduction Steps:**
  1. Inspect Git tree: `ls -la mobile/android/app/upload-keystore.jks`.
  2. Observe the binary keystore file is tracked and committed in Git history.
- **Recommended Correction:**  
  1. Add `*.jks`, `*.keystore`, and `key.properties` to `.gitignore`.
  2. Generate a new upload keystore for Google Play / deployment.
  3. Purge `upload-keystore.jks` from Git history using `git filter-repo` or BFG Repo-Cleaner.
  4. Store the keystore and signing credentials securely in CI/CD secrets (e.g., GitHub Actions Secrets / Google Cloud KMS).
- **Retest Procedure:**  
  Verify `git status` and `git log --all -- mobile/android/app/upload-keystore.jks` confirm the file is no longer tracked or present in any commit.

---

### Finding SEC-04: Cleartext HTTP Traffic Allowed in Android Manifest
- **Finding ID:** `SEC-04`
- **Title:** Cleartext HTTP Traffic Allowed in Android Application Manifest
- **Severity:** **Medium** (CWE-319: Cleartext Transmission of Sensitive Information)
- **Affected Platform:** Mobile App (`mobile/android`)
- **Affected Role:** Student Applicants
- **File Path & Line Number:** [`../mobile/android/app/src/main/AndroidManifest.xml:14`](../mobile/android/app/src/main/AndroidManifest.xml#L14)
- **Description:**  
  The application manifest specifies `android:usesCleartextTraffic="true"`. This globally permits the Android OS to transmit unencrypted HTTP requests across the network.
- **Evidence Reference:** `EVD-SEC-04`
- **User or Business Impact:**  
  If a student connects to an unencrypted or public Wi-Fi network (such as university or cafe Wi-Fi), an adversary performing Man-in-the-Middle (MitM) attacks can intercept unencrypted session tokens, personal identity details, academic records, and documentary requirements.
- **Reproduction Steps:**
  1. Inspect `mobile/android/app/src/main/AndroidManifest.xml` line 14.
  2. Confirm `<application android:usesCleartextTraffic="true">`.
- **Recommended Correction:**  
  In production releases, set `android:usesCleartextTraffic="false"` and configure a Network Security Config (`res/xml/network_security_config.xml`) that permits cleartext only for `10.0.2.2` or localhost during debug builds:
  ```xml
  <network-security-config>
      <debug-overrides>
          <trust-anchors>
              <certificates src="system" />
              <certificates src="user" />
          </trust-anchors>
      </debug-overrides>
  </network-security-config>
  ```
- **Retest Procedure:**  
  Build a release APK and verify that requests to unencrypted `http://` endpoints are blocked by the OS network security policy.

---

### Finding SEC-05: In-Memory Token Revocation Blacklist Not Distributed Across Instances
- **Finding ID:** `SEC-05`
- **Title:** In-Memory JWT Token Revocation Blacklist Not Distributed Across Clustered Instances
- **Severity:** **Medium** (CWE-613: Insufficient Session Expiration)
- **Affected Platform:** Backend API (`web/server`)
- **Affected Role:** All Roles (Student, Provider, Administrator)
- **File Path & Line Number:** [`../web/server/src/middleware/authMiddleware.js:26`](../web/server/src/middleware/authMiddleware.js#L26)
- **Description:**  
  Logged-out tokens are stored in an in-memory JavaScript `Set`:
  ```javascript
  const revokedTokens = new Set();
  const revokeToken = (token) => { if (token) revokedTokens.add(token); };
  const isTokenRevoked = (token) => { return revokedTokens.has(token); };
  ```
- **Evidence Reference:** `EVD-SEC-05`
- **User or Business Impact:**  
  In a multi-process environment (PM2 cluster, multiple container replicas, or serverless Vercel functions), when a user logs out, the token is added only to the local process's memory. Requests routed to any other replica will still consider the token valid until its 7-day expiration time expires.
- **Reproduction Steps:**
  1. Authenticate and obtain JWT token T.
  2. Send logout request to Server Instance A (adds T to Instance A's `revokedTokens`).
  3. Send request with token T to Server Instance B.
  4. Instance B accepts token T because its local `revokedTokens` set is empty.
- **Recommended Correction:**  
  Persist revoked token hashes or expiration timestamps in a distributed Redis cache or MongoDB collection with TTL indexes (`expiresAt` matching the JWT `exp` timestamp), ensuring revocation is instantly visible across all nodes.
- **Retest Procedure:**  
  Log out on Node A; immediately issue a request with the revoked token to Node B; verify Node B returns HTTP 401 Unauthorized.

---

### Finding SEC-06: Missing Schema Validation on Parallel Scholarship Creation Endpoint
- **Finding ID:** `SEC-06`
- **Title:** Missing Schema Validation on Parallel Scholarship Creation Endpoint
- **Severity:** **Medium** (CWE-20: Improper Input Validation)
- **Affected Platform:** Backend API (`web/server`)
- **Affected Role:** Scholarship Providers, Platform Integrity
- **File Path & Line Number:** [`../web/server/src/routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20)
- **Description:**  
  While `POST /api/scholarship-opportunities` validates `totalSlots` (`.isInt({ min: 1 })`), deadlines, and required fields using `express-validator`, the parallel endpoint `POST /api/scholarships` calls `createScholarship` directly without validation middleware. As a result, negative slot values (e.g. `slots: -5`), empty titles, and past deadlines are accepted without error.
- **Evidence Reference:** `EVD-SEC-06`
- **User or Business Impact:**  
  A provider or malformed API client can create scholarship programs with corrupted data, negative available slots, or invalid deadlines, breaking applicant ranking, eligibility gating, and UI rendering.
- **Reproduction Steps:**
  1. Authenticate as a verified provider.
  2. Send `POST /api/scholarships` with `{"title": "Bugged Scholarship", "slots": -10, "deadline": "1999-01-01"}`.
  3. Notice the scholarship is created with `slots: -10` and `deadline: "1999-01-01"`.
- **Recommended Correction:**  
  Apply the shared `validateOpportunity` validation chain to both `routes/scholarships.js` and `routes/scholarshipOpportunities.js` so that negative slots, empty fields, and invalid dates are uniformly rejected with HTTP 400.
- **Retest Procedure:**  
  Send `POST /api/scholarships` with `slots: -5`; verify the server returns HTTP 400 with `'Total slots must be at least 1'`.

---

### Finding SEC-07: Full In-Memory Database Mirroring Scalability Bottleneck
- **Finding ID:** `SEC-07`
- **Title:** Full In-Memory Database Mirroring on Startup & Continuous Sync
- **Severity:** **Medium** (CWE-400: Uncontrolled Resource Consumption / CWE-770)
- **Affected Platform:** Backend Architecture (`web/server/src/config/db.js`)
- **Affected Role:** Platform Performance & Stability
- **File Path & Line Number:** [`../web/server/src/config/db.js:53-108`](../web/server/src/config/db.js#L53-L108)
- **Description:**  
  `db.read()` executes `Promise.all` calling `.find({}).toArray()` across all discrete MongoDB collections (`users`, `student_profiles`, `scholarships`, `applications`, `documents`, `otps`, `schedules`, `manual_review_logs`, `ocr_extractions`, `automatic_check_results`), loading every single record into the Node.js process heap memory (`this.data`).
- **Evidence Reference:** `EVD-SEC-07`
- **User or Business Impact:**  
  While acceptable for small test fixtures, this pattern will fail in a production environment with thousands of students, applications, and documents. Memory usage will grow unbounded, triggering Node.js garbage collection thrashing and eventual `JavaScript heap out of memory` crashes.
- **Reproduction Steps:**
  1. Inspect `db.read()` in `web/server/src/config/db.js`.
  2. Observe `.find({}).toArray()` without pagination, projections, or limits across 10 collections.
- **Recommended Correction:**  
  Transition queries completely to Mongoose / MongoDB native cursor queries with pagination (`limit`, `skip`, `lean()`) and indexed queries, eliminating the in-memory array duplication.
- **Retest Procedure:**  
  Seed 50,000 records; monitor process RSS memory; ensure server heap remains stable under 150MB.

---

### Finding SEC-08: Sensitive Infrastructure Details in Example Environment File
- **Finding ID:** `SEC-08`
- **Title:** Sensitive Infrastructure Details in Example Environment File
- **Severity:** **Low** (CWE-200: Exposure of Sensitive Information)
- **Affected Platform:** Repository (`web/server/.env.example`)
- **Affected Role:** System Administrators
- **File Path & Line Number:** [`../web/server/.env.example:4,16`](../web/server/.env.example#L4)
- **Description:**  
  `web/server/.env.example` contains actual internal infrastructure hostnames and usernames:
  - `MONGO_URI="mongodb+srv://samgarciavillaluna_db_user:<db_password>@iskolar-main.0lz3nds.mongodb.net/?appName=iskolar-main"`
  - `EMAIL_USER="iskolar.official@gmail.com"`
- **Evidence Reference:** `EVD-SEC-08`
- **User or Business Impact:**  
  Publicly exposes the MongoDB Atlas cluster hostname, database username, and project email, assisting reconnaissance and credential stuffing attacks against Atlas and Gmail accounts.
- **Recommended Correction:**  
  Replace specific account names and cluster endpoints with generic placeholders:
  `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>`
- **Retest Procedure:**  
  Verify `.env.example` contains no real names, usernames, or cluster identifiers.

---

### Finding SEC-09: Missing Modal Focus Trap and Escape Key Handler
- **Finding ID:** `SEC-09`
- **Title:** Missing Modal Focus Trap and Escape Key Handler
- **Severity:** **Low** (WCAG 2.1 Level A/AA: 2.1.2 No Keyboard Trap, 2.4.3 Focus Order)
- **Affected Platform:** Web Client (`web/client`)
- **Affected Role:** All Users, Assistive Technology Users
- **File Path & Line Number:** [`../web/client/src/components/LoginModal.jsx`](../web/client/src/components/LoginModal.jsx)
- **Description:**  
  `LoginModal.jsx` and related admin modals do not listen for the `Escape` key to dismiss the dialog, and do not trap the `Tab` key focus within the dialog container. Users pressing `Tab` can cycle focus into background links underneath the backdrop.
- **Evidence Reference:** `EVD-SEC-09`
- **User or Business Impact:**  
  Keyboard-only users and screen reader users can lose context when keyboard focus slips behind the modal into invisible background DOM elements.
- **Recommended Correction:**  
  Implement a `useEffect` hook listening for `keydown` with `e.key === 'Escape'`, and wrap modal dialogs in an accessible focus trap utility or standard ARIA dialog container (`role="dialog"` and `aria-modal="true"`).
- **Retest Procedure:**  
  Open the modal; press `Tab` through all elements and confirm focus loops back to the top; press `Escape` and confirm modal closes.

---

### Finding SEC-10: Placeholder / Mock Chatbot in Production Mobile Screen
- **Finding ID:** `SEC-10`
- **Title:** Placeholder / Mock Chatbot in Production Mobile Screen
- **Severity:** **Informational**
- **Affected Platform:** Mobile App (`mobile/lib/screens/chatbot_page.dart`)
- **Affected Role:** Student Applicants
- **File Path & Line Number:** [`../mobile/lib/screens/chatbot_page.dart:42-52`](../mobile/lib/screens/chatbot_page.dart#L42-L52)
- **Description:**  
  `ChatbotPage` simulates an assistant using `Future.delayed(const Duration(milliseconds: 650))` and appends `'Got it. I can help you find scholarships and explain requirements. (Demo response)'`.
- **Evidence Reference:** `EVD-SEC-10`
- **User or Business Impact:**  
  Users attempting to ask questions about deadlines or requirements receive a non-functional static message, presenting an unfinished impression during capstone evaluation.
- **Recommended Correction:**  
  Either wire the chatbot to an authorized backend AI endpoint (e.g., via n8n webhook or LLM controller), or clearly label the screen with a "Coming Soon in Beta" banner.
- **Retest Procedure:**  
  Ensure queries either trigger intelligent backend responses or clear UI notice.

---

### Finding SEC-11: Financial Ledger Not Integrated with Payment Gateway
- **Finding ID:** `SEC-11`
- **Title:** Financial Ledger Not Integrated with Payment Gateway
- **Severity:** **Informational**
- **Affected Platform:** Backend API (`web/server/src/controllers/transactionController.js`)
- **Affected Role:** Scholarship Providers, Student Applicants
- **File Path & Line Number:** [`../web/server/src/controllers/transactionController.js`](../web/server/src/controllers/transactionController.js)
- **Description:**  
  The `Transaction` model and `transactionController.js` record transaction records, amounts, references, and disbursement statuses in MongoDB. No actual payment provider (PayMongo, GCash, Maya, Stripe, or bank API) is integrated.
- **Evidence Reference:** `EVD-SEC-11`
- **User or Business Impact:**  
  No actual money moves through the platform. Any project or capstone documentation claiming automatic bank or e-wallet disbursement is factually inaccurate.
- **Recommended Correction:**  
  Update all system documentation, presentations, and UI labels to explicitly describe this feature as an **"Internal Accounting & Disbursement Tracking Ledger"**, rather than an automated financial payment transfer gateway.
- **Retest Procedure:**  
  Review manuscript and presentation materials to confirm scope accuracy.

---

## 3. Audit Log Integrity Note

All administrative actions, verification decisions, and status transitions produce audit records that are **append-only through the exposed application API**. The REST API exposes no `PUT` or `DELETE` routes for audit log entries (`GET /api/admin/audit-logs` only). However, database-level immutability (such as cryptographic hash chaining, append-only MongoDB cluster roles, or write-once object storage like AWS S3 Object Lock) is not implemented. Direct database access could theoretically modify or truncate audit collections.

---

## 4. Duplicate Report Investigation

During Phase 1 discovery, an inspection for duplicate security documents was conducted:
- **Canonical Report:** `audit/ISKOLAR_SECURITY_AUDIT.md` (this comprehensive document).
- **Secondary File:** `docs/architecture/SECURITY.md` (a 9-line high-level architectural summary describing role-based access, path traversal, security headers, and rate limiting).
- *Determination:* The two files do **not** contain identical duplicate contents; `docs/architecture/SECURITY.md` is an initial design summary, whereas `audit/ISKOLAR_SECURITY_AUDIT.md` is the formal, in-depth security audit report. Both are preserved in accordance with read-only rules. Removal or consolidation may be performed upon user authorization.
