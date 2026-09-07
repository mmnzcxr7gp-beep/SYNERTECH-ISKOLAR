# ISKOLAR 2.0 – Technical Remediation Plan

**System:** ISKOLAR 2.0 (Learning Aid and Scholarship Management Platform)  
**Development Team:** SynerTech  
**Date:** September 6, 2026  
**Auditor:** Senior Full-Stack Software Auditor, Cybersecurity Reviewer, QA Engineer  

---

> [!IMPORTANT]
> **READ-ONLY AUDIT POLICY ENFORCEMENT:**  
> In accordance with Operating Rule 12, **no source code changes have been applied during this audit**. This remediation plan outlines the exact, verified code changes ready to be executed upon explicit user authorization.

---

## 1. Remediation Priority Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ISKOLAR REMEDIATION ROADMAP                     │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Phase 1 (P0 / P1) │ Critical & High   │ Backdoor, MFA bypass, Keystore │
│ Phase 2 (P2)      │ Medium Hardening  │ Cleartext, Revocation, Schema  │
│ Phase 3 (P3)      │ Low & Compliance  │ Env sanitization, Modal A11y   │
│ Phase 4 (Info)    │ Scope Alignment   │ Chatbot disclosure, Ledger docs│
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 2. Phase 1 — Immediate Security Fixes (P0 / P1 - High Severity)

### Fix 1.1: Remove Hardcoded Backdoor Password in `authController.js`
- **Finding Reference:** `SEC-01` (Evidence: `EVD-SEC-01`)
- **Target File:** [`../web/server/src/controllers/authController.js:150-152`](../web/server/src/controllers/authController.js#L150-L152)
- **Current Vulnerable Code:**
  ```javascript
  if (!ok && process.env.NODE_ENV !== 'production' && password === 'Password123!') {
    ok = true;
  }
  ```
- **Proposed Correction:**
  Delete lines 150-152 entirely. Ensure authentication solely checks:
  ```javascript
  if (user.password) {
    ok = bcrypt.compareSync(password, user.password);
  }
  ```
- **Verification / Retest:**  
  Attempt login with `Password123!` against accounts whose actual password is not that string. Verify server returns HTTP 401 in all environments.

---

### Fix 1.2: Enforce Server-Side Multi-Factor Authentication Control
- **Finding Reference:** `SEC-02` (Evidence: `EVD-SEC-02`)
- **Target File:** [`../web/server/src/controllers/authController.js:188`](../web/server/src/controllers/authController.js#L188)
- **Current Vulnerable Code:**
  ```javascript
  const isSmtpConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  if (!skipMfa && isSmtpConfigured) { ... }
  ```
- **Proposed Correction:**
  Disallow client-side `skipMfa` bypass in production and staging environments:
  ```javascript
  const isSmtpConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  const allowDevBypass = process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_OVERRIDE === 'true';
  const shouldRequireMfa = isSmtpConfigured && (!skipMfa || !allowDevBypass);

  if (shouldRequireMfa) { ... }
  ```
- **Verification / Retest:**  
  Send `POST /api/auth/login` with `"skipMfa": true` on a standard deployment; confirm the response requires MFA (`requiresMfa: true`).

---

### Fix 1.3: Remove Android Signing Keystore from Source Control
- **Finding Reference:** `SEC-03` (Evidence: `EVD-SEC-03`)
- **Target File:** [`../mobile/android/app/upload-keystore.jks`](../mobile/android/app/upload-keystore.jks)
- **Proposed Correction:**
  1. Add to `.gitignore`:
     ```gitignore
     *.jks
     *.keystore
     key.properties
     ```
  2. Untrack the file:
     ```bash
     git rm --cached mobile/android/app/upload-keystore.jks
     ```
  3. Store signing credentials in environment variables or CI/CD secret manager (GitHub Actions Secrets).
- **Verification / Retest:**  
  Verify `git status` shows `upload-keystore.jks` removed from tracking.

---

## 3. Phase 2 — Architectural Hardening (P2 - Medium Severity)

### Fix 2.1: Disallow Cleartext Traffic in Android Manifest
- **Finding Reference:** `SEC-04` (Evidence: `EVD-SEC-04`)
- **Target File:** [`../mobile/android/app/src/main/AndroidManifest.xml:14`](../mobile/android/app/src/main/AndroidManifest.xml#L14)
- **Proposed Correction:**
  Replace `android:usesCleartextTraffic="true"` with `false`, and reference a debug network security config:
  ```xml
  <application
      android:label="iskolar_mobile"
      android:name="${applicationName}"
      android:icon="@mipmap/ic_launcher"
      android:usesCleartextTraffic="false"
      android:networkSecurityConfig="@xml/network_security_config">
  ```
- **Verification / Retest:**  
  Build release APK and verify that all traffic to non-HTTPS endpoints is blocked.

---

### Fix 2.2: Distribute Token Revocation via Redis or MongoDB
- **Finding Reference:** `SEC-05` (Evidence: `EVD-SEC-05`)
- **Target File:** [`../web/server/src/middleware/authMiddleware.js:26-34`](../web/server/src/middleware/authMiddleware.js#L26-L34)
- **Proposed Correction:**
  Replace in-memory `Set` with a persistent collection or Redis client:
  ```javascript
  const revokeToken = async (token, exp) => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.collection('revoked_tokens').insertOne({
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(exp * 1000),
      });
    }
  };
  ```
  With a MongoDB TTL index: `db.revoked_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })`.
- **Verification / Retest:**  
  Verify that logging out on one server node immediately invalidates the token on all other nodes.

---

### Fix 2.3: Unify Validation on `POST /api/scholarships`
- **Finding Reference:** `SEC-06` (Evidence: `EVD-SEC-06`)
- **Target File:** [`../web/server/src/routes/scholarships.js:14-20`](../web/server/src/routes/scholarships.js#L14-L20)
- **Proposed Correction:**
  Import `validateOpportunity` and attach it to the route:
  ```javascript
  const { validateOpportunity } = require('./scholarshipOpportunities');

  router.post(
    '/',
    authMiddleware,
    roleMiddleware(['sponsor', 'provider', 'admin']),
    sponsorVerification,
    validateOpportunity,
    createScholarship
  );
  ```
- **Verification / Retest:**  
  Send `POST /api/scholarships` with `slots: -5`; confirm HTTP 400 Bad Request is returned.

---

### Fix 2.4: Paginate and Query-Scope `db.read()`
- **Finding Reference:** `SEC-07` (Evidence: `EVD-SEC-07`)
- **Target File:** [`../web/server/src/config/db.js:53-108`](../web/server/src/config/db.js#L53-L108)
- **Proposed Correction:**
  Avoid wholesale `.find({}).toArray()` of all collections into the Node heap on each sync cycle. Replace with on-demand indexed Mongoose queries and Redis caching for read-heavy operations.
- **Verification / Retest:**  
  Monitor memory heap usage under heavy load; confirm process RSS remains stable.

---

## 4. Phase 3 — Accessibility & Environmental Cleanliness (P3 - Low Severity)

### Fix 3.1: Clean Example Environment Files
- **Finding Reference:** `SEC-08` (Evidence: `EVD-SEC-08`)
- **Target File:** [`../web/server/.env.example:4,16`](../web/server/.env.example#L4)
- **Proposed Correction:**
  Replace specific usernames, emails, and Atlas cluster URLs with generic templates:
  ```env
  MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/iskolar?retryWrites=true&w=majority"
  EMAIL_USER="your-email@gmail.com"
  ```
- **Verification / Retest:**  
  Inspect `.env.example` to confirm no personal or infrastructure details remain.

---

### Fix 3.2: Modal Dialog Keyboard Trap & Escape Key
- **Finding Reference:** `SEC-09` (Evidence: `EVD-SEC-09`)
- **Target File:** [`../web/client/src/components/LoginModal.jsx`](../web/client/src/components/LoginModal.jsx)
- **Proposed Correction:**
  Add key listener for Escape and trap focus:
  ```javascript
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  ```
- **Verification / Retest:**  
  Open modal; press Escape; confirm modal closes cleanly.

---

## 5. Phase 4 — Documentation & Scope Realignment (Informational)

### Fix 4.1: Mobile Chatbot Status Clarification
- **Finding Reference:** `SEC-10` (Evidence: `EVD-SEC-10`)
- **Target File:** [`../mobile/lib/screens/chatbot_page.dart`](../mobile/lib/screens/chatbot_page.dart)
- **Proposed Action:**  
  Add an in-app banner: *"ISKOLAR Assistant Beta – Automated inquiry answering coming soon"*, or connect the screen to a live knowledge base webhook.

---

### Fix 4.2: Financial Feature Scope Documentation
- **Finding Reference:** `SEC-11` (Evidence: `EVD-SEC-11`)
- **Target File:** System Documentation & Manuscript
- **Proposed Action:**  
  Clarify that the "Disbursement" feature is an **Internal Scholarship Accounting & Allocation Ledger**, not a real-time banking wire transfer service.

---

## 6. Execution Options for User Review

The user may select one of the following execution options:
1. **Critical and High fixes only**: Remediate SEC-01 (backdoor password), SEC-02 (MFA skip), and SEC-03 (keystore in Git).
2. **All verified fixes**: Remediate SEC-01 through SEC-09.
3. **Step-by-step remediation plan**: Interactive walkthrough with user sign-off on each commit.
4. **Test automation implementation**: Expand test suite with additional automated coverage for negative/boundary tests.
