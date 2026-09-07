# ISKOLAR 2.0 — Production Release Checklist & Requirement Traceability

**Project**: ISKOLAR 2.0 — Learning Aid and Scholarship Management Platform  
**Team**: SynerTech  
**Evaluator**: Lead Software & Security Engineer  
**Date**: September 6, 2026  
**Target Platform**: Android APK/AAB (Flutter) & Web Portal (React Vite + Node.js Express API on MongoDB Atlas)  
**Overall Readiness**: **IMPLEMENTATION VERIFIED — EXTERNAL RELEASE CHECKS BLOCKED**  

---

## 1. Traceability & Requirement Acceptance Matrix

| Requirement / Finding | Documented Rule / Goal | Verification Suite / Test Method | Result / Evidence File | Implementation Status |
|---|---|---|---|---|
| **SEC-01: Authentication Backdoor** | Remove hardcoded `Password123!` fallback. Strict bcrypt comparison against database in all environments. | [test_sec01_sec02_sec03_remediation.js](web/server/scripts/test_sec01_sec02_sec03_remediation.js) (Cases 1.1–1.6) | `audit/evidence/test_sec01_sec02_sec03.log` (6/6 Passed) | **LIVE VERIFIED** |
| **SEC-02: Client MFA Bypass** | Disallow `skipMfa`. Server-side enforcement of MFA. Challenge token isolation. Single-use OTPs with 5-attempt rate limit. | [test_sec01_sec02_sec03_remediation.js](web/server/scripts/test_sec01_sec02_sec03_remediation.js) (Cases 2.1–2.11) | `audit/evidence/test_sec01_sec02_sec03.log` (11/11 Passed) | **LIVE VERIFIED** |
| **SEC-03: Signing Keystore Audit** | 0 commits in Git history; local `.gitignore` rules verified; explicit error on missing release keys in `build.gradle.kts` without debug fallback. | [test_sec01_sec02_sec03_remediation.js](web/server/scripts/test_sec01_sec02_sec03_remediation.js) (Cases 3.1–3.5) & release build test | `audit/evidence/test_sec01_sec02_sec03.log` & `android_release_build.log` | **LOCAL KEY SECURED (NO GIT EXPOSURE) — SIGNING PENDING OWNER KEY** |
| **SEC-04: Cleartext Transport** | Prohibit HTTP cleartext traffic in mobile release manifests. Debug variant scopes emulator loopback. Enforce HSTS on API. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Cases 1.1–1.4) | `audit/evidence/test_sec04_through_sec11.log` (4/4 Passed) | **LIVE VERIFIED** |
| **SEC-05: Session Revocation** | Shared revocation backed by MongoDB TTL collection. Invalidate JWT on logout and suspension across distributed nodes. Disconnect sockets. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Cases 2.1–2.2) | `audit/evidence/test_sec04_through_sec11.log` (2/2 Passed) | **LIVE VERIFIED** |
| **SEC-06: Inconsistent API Validation** | Positive slots, ISO deadline formats, required titles. Parity between `/users/:id/status` and `/accounts/:id/suspend`. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Cases 3.1–3.3) | `audit/evidence/test_sec04_through_sec11.log` (3/3 Passed) | **LIVE VERIFIED** |
| **SEC-07: DB Concurrency & Duplicate Prevention** | Compound unique indexes; safe duplicate inspection preserving records; in-flight submission lock; atomic 1-slot capacity limits; idempotent retries. | [test_concurrency_and_distributed_sessions.js](web/server/scripts/test_concurrency_and_distributed_sessions.js) (Cases 1.1–1.4) | `audit/evidence/test_concurrency_distributed.log` (4/4 Passed) | **LIVE VERIFIED** |
| **SEC-08: Config & Secret Exposure** | Sanitize `.env.example` templates of real DB credentials and hostnames. Verify client web bundle does not leak private env keys. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Cases 5.1–5.2) | `audit/evidence/test_sec04_through_sec11.log` (2/2 Passed) | **LIVE VERIFIED** |
| **SEC-09: Modal Accessibility** | Web dialog focus trap (Tab cycling), `role="dialog"`, `aria-modal="true"`, Escape dismissal, initial focus, focus restoration. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Cases 6.1–6.2) | `audit/evidence/test_sec04_through_sec11.log` (2/2 Passed) | **LIVE VERIFIED** |
| **SEC-10: Truthful Chatbot Assistant** | Dynamic scholarship answering from database without student record exposure. No fake LLM claims. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Cases 7.1–7.3) | `audit/evidence/test_sec04_through_sec11.log` (3/3 Passed) | **LIVE VERIFIED** |
| **SEC-11: Financial Assistance Ledger** | Informational scholarship disbursement ledger. Role-based transaction posting and balance calculation without banking gateway. | [test_sec04_through_sec11_hardening.js](web/server/scripts/test_sec04_through_sec11_hardening.js) (Case 8.1) | `audit/evidence/test_sec04_through_sec11.log` (1/1 Passed) | **LIVE VERIFIED** |
| **BLOCKER 1: Multi-Scholarship Capacity Isolation** | Eliminate overwritten `$or` bug; unified `approvalService.js` atomic capacity reservation & approval; prove approving Scholarship B never alters Scholarship A `approved_count`. | [test_capacity_multi_scholarship_isolation.js](web/server/scripts/test_capacity_multi_scholarship_isolation.js) (Cases 1–5) | `audit/evidence/test_capacity_isolation.log` (5/5 Passed) | **LIVE VERIFIED** |
| **BLOCKER 2: Single Source of Truth** | Remove `db.data` as production authority; remove `iskolar_state` aggregate document; replace in-memory ID counters with atomic MongoDB counters (`createAtomicId`); fail closed when DB unavailable. | `db.js`, `approvalService.js`, `applicationWorkflowController.js` | Direct MongoDB collection queries | **LIVE VERIFIED** |
| **BLOCKER 3 & 4: Two-Process Duplicate Concurrency & Fail-Closed** | Real two-process cross-port concurrency test; exactly 1 succeeds (201), duplicate rejected (409 Conflict); `ensureIndexes` fails closed with typed `MandatoryUniqueIndexError`; `/health/readiness` returns 503 (`not_ready`). | [test_concurrent_duplicate_submissions.js](web/server/scripts/test_concurrent_duplicate_submissions.js) (Cases 1–9) | `audit/evidence/test_concurrent_duplicates.log` (9/9 Passed) | **LIVE VERIFIED** |
| **BLOCKER 5: Safe Duplicate Migration** | Default to read-only dry run; refuse automatic `.env` loading; require `--confirm-target-env`, `--confirmed-backup-id`, `--approve-plan`; post-migration verification. | [migrate_legacy_duplicate_applications.js](web/server/scripts/migrate_legacy_duplicate_applications.js) | `--dry-run` and safety gate CLI verification | **LIVE VERIFIED** |
| **CONCURRENCY: Multi-Instance Distributed Revocation** | Server A logout immediately invalidates JWT and disconnects sockets on Server B. Admin suspension on Server A blocks access on Server B. | [test_concurrency_and_distributed_sessions.js](web/server/scripts/test_concurrency_and_distributed_sessions.js) (Cases 2.1–2.6) | `audit/evidence/test_concurrency_distributed.log` (6/6 Passed) | **LIVE VERIFIED** |
| **Workflow: Master Connected Capstone Journey** | End-to-end multi-role flow (verification, publish, apply, upload, OCR, more info, resubmit, interview, award, audit log). | [test_master_capstone_connected_workflow.js](web/server/scripts/test_master_capstone_connected_workflow.js) (Steps 1–18) | `audit/evidence/test_master_connected_workflow.log` (27/27 Passed) | **LIVE VERIFIED** |

---

## 2. Platform & Infrastructure Verification Summary

| Component | Target Environment | Build / Test Command | Exit Code | Verified Status |
|---|---|---|---|---|
| **Node.js Express Backend** | Node.js 24 LTS (v24.14.0) on Render (Singapore) | `npm --prefix web/server test`<br>(Runs all 6 suites: SEC-01..03, SEC-04..11, Capacity Isolation, Concurrent Duplicates, Distributed Sessions, Master Workflow) | 0 | **READY (ALL 89 TESTS PASSED)** |
| **Realtime Engine (Socket.IO)** | Single-Instance default / Redis for horizontal scaling | Startup check for `REDIS_URL` | 0 | **VERIFIED (RESTRICTED TO 1 INSTANCE WITHOUT REDIS)** |
| **React Web Client** | Vite SPA on Vercel (`web/client/vercel.json`) | `npm --prefix web/client test`<br>`npm --prefix web/client run build` | 0<br>0 | **READY (ALL 10 TESTS PASSED, BUILT)** |
| **Flutter Mobile Client** | Android SDK 34+ / Kotlin DSL / Flutter 3.44 | `flutter analyze --no-pub`<br>`flutter test`<br>`jarsigner -verify -verbose -certs app-release.aab` | 0<br>0<br>0 | **READY (ALL 81 TESTS PASSED, RELEASE AAB VERIFIED)** |
| **Cloudflare R2 Storage** | Cloudflare R2 S3-Compatible Bucket | Storage service integration test (Local filesystem driver verified) | 0 | **CONFIGURED (PENDING OWNER PROD CREDENTIALS)** |
| **Email Service** | SMTP / Ethereal Test | Live Ethereal SMTP delivery test (Masking verified) | 0 | **LIVE VERIFIED (DEV/TEST MODE)** |
| **Firebase Cloud Messaging** | Google FCM Push Service | `pushNotificationService.js` initialization | 0 | **CONFIGURED (PENDING OWNER SERVICE ACCOUNT)** |
| **SMS Service** | Twilio / PhilSMS Gateway | `smsService.js` test suite | 0 | **IMPLEMENTED (MOCKED IN DEV)** |

---

## 3. Release Gate Blockers & Owner Actions

The following external configuration items are the remaining dependencies preventing the platform from transitioning from `IMPLEMENTATION VERIFIED — EXTERNAL RELEASE CHECKS BLOCKED` to `READY FOR DEPLOYMENT APPROVAL`:

1. **Android Release Upload Key Registration (Local Artifacts Verified)**:
   - **Status**: Keystore `mobile/android/app/upload-keystore.jks` and `mobile/android/key.properties` are locally configured and verified with 0 Git history commits. Both `mobile/build/app/outputs/flutter-apk/app-release.apk` (v2 signature) and `mobile/build/app/outputs/bundle/release/app-release.aab` (JAR signature) are verified signed with `CN=Iskolar Deployment, OU=Engineering, O=Iskolar, L=Manila, ST=Metro Manila, C=PH` (SHA-256: `ED:3C:E1:BB:E4:FC:E9:54:67:8B:51:6B:40:A6:27:43:B7:79:3B:6F:F1:7F:18:D3:FD:C7:35:45:69:ED:E5:07`).
   - **Remaining Action**: Register upload certificate fingerprint in Google Play Console App Signing.
2. **Production SMTP Configuration**:
   - **Reason**: Ethereal test SMTP was successfully used for end-to-end testing and OTP masking verified. Live production delivery requires real SMTP credentials (`EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_FROM`).
3. **Firebase Cloud Messaging Service Account**:
   - **Reason**: Push notification dispatch to physical Android/iOS devices requires `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH`.
4. **Cloudflare R2 Production Bucket Credentials**:
   - **Reason**: Real object storage requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (or `R2_SECRET_KEY`), and `R2_BUCKET` (or `R2_BUCKET_NAME`).
5. **MongoDB Atlas Production Network Whitelisting**:
   - **Reason**: Render / production backend IP must be whitelisted in MongoDB Atlas Network Access with strong database user credentials and TLS.
