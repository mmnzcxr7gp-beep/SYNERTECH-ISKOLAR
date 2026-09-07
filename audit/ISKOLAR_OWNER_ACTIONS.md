# ISKOLAR 2.0 — Consolidated Owner Action Register

**Project**: ISKOLAR 2.0 — Learning Aid and Scholarship Management Platform  
**Team**: SynerTech  
**Date**: September 6, 2026  
**Auditor**: Antigravity Lead Engineer  
**Overall Readiness**: **IMPLEMENTATION VERIFIED — EXTERNAL RELEASE CHECKS BLOCKED**  
**Auditor**: Antigravity Lead Engineer  
**Purpose**: This document provides the authoritative, consolidated checklist of external credentials, hardware devices, and owner actions strictly required to transition ISKOLAR 2.0 from `IMPLEMENTATION VERIFIED — EXTERNAL RELEASE CHECKS BLOCKED` to full production deployment.

> [!IMPORTANT]
> **Safety Notice**: Never commit secret keys, private passwords, or keystore files directly into Git. Store all credentials in secure environment variables or Google Play / Cloud secrets managers as described below.

---

## 1. Consolidated Owner Action Items

### Action 1: Android Release Signing Key & Google Play Console Registration (LOCAL KEY VERIFIED)
- **Required Variable / Asset Name**: `upload-keystore.jks`, `mobile/android/key.properties` (`storePassword`, `keyPassword`, `keyAlias`, `storeFile`).
- **Required Environment / Account**: Project Owner / Mobile Release Engineer workstation; Google Play Console.
- **Current Key & Verification Status**:
  - **Git Audit Confirmed**: Git repository audit (`git log --all --full-history -- "*.jks" "*.keystore" "key.properties"`) confirmed that **0 commits** exist in Git history for any keystore. The local `upload-keystore.jks` is strictly an uncommitted, local ignored file protected by root `.gitignore` and `mobile/android/.gitignore`.
  - **Keystore & Signatures Verified**: Keystore `mobile/android/app/upload-keystore.jks` with alias `iskolar-upload` is verified valid through July 25, 2054.
    - Owner DN: `CN=Iskolar Deployment, OU=Engineering, O=Iskolar, L=Manila, ST=Metro Manila, C=PH`
    - SHA-256 Fingerprint: `ED:3C:E1:BB:E4:FC:E9:54:67:8B:51:6B:40:A6:27:43:B7:79:3B:6F:F1:7F:18:D3:FD:C7:35:45:69:ED:E5:07`
    - SHA-1 Fingerprint: `3C:D2:C3:60:F4:D3:56:56:4C:EB:56:2D:69:D7:9C:FD:BC:FC:F6:62`
  - **Release Binaries Verified**:
    - Release APK (`mobile/build/app/outputs/flutter-apk/app-release.apk`) verified with `apksigner verify --verbose` (APK Signature Scheme v2, signed by above certificate).
    - Release AAB (`mobile/build/app/outputs/bundle/release/app-release.aab`) verified with `jarsigner -verify -verbose` (valid JAR signature by above certificate).
  - **Build Enforcement**: `mobile/android/app/build.gradle.kts` throws an explicit `GradleException` if `key.properties` is missing, preventing silent unsigned release builds.
- **Why It Is Needed**: When uploading the release bundle to Google Play Console, Google Play App Signing requires the upload key signature to match the registered upload certificate to sign the app for public distribution.
- **Which Release Check It Blocks**: Google Play Console App Signing upload verification.
- **Exact Owner Actions**:
  1. For initial app setup on Google Play Console, register the upload certificate SHA-256 fingerprint (`ED:3C:E1:BB:E4:FC:E9:54:67:8B:51:6B:40:A6:27:43:B7:79:3B:6F:F1:7F:18:D3:FD:C7:35:45:69:ED:E5:07`).
  2. If an existing Google Play Console app already uses a different upload key, request an upload key reset in Play Console or provide that keystore to replace the local one.
  3. Ensure `key.properties` and `upload-keystore.jks` remain backed up securely in the team password manager.

---

### Action 2: Production SMTP Email Credentials
- **Required Variable / Asset Name**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`.
- **Required Environment / Account**: Production SMTP provider (e.g. Google Workspace, SendGrid, Amazon SES, or Postmark).
- **Why It Is Needed**: Authentication currently uses Ethereal test SMTP accounts in local development. For real users to receive OTP login codes, password reset links, and application status notifications, an authenticated production SMTP sender is required.
- **Which Release Check It Blocks**: Production email OTP delivery; live user password reset verification.
- **Exact Next Verification Step**:
  1. Populate production variables in the target hosting environment (e.g. Render, Railway, or AWS).
  2. Trigger a login with an MFA-enabled account and confirm that the 6-digit OTP arrives in a real recipient inbox within 10 seconds.
  3. Verify SPF and DKIM DNS records to prevent email delivery to spam folders.

---

### Action 3: Firebase Cloud Messaging Service Account
- **Required Variable / Asset Name**: `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH`.
- **Required Environment / Account**: Google Firebase Console -> Project Settings -> Service Accounts.
- **Why It Is Needed**: Push notifications to the Flutter mobile client (`mobile/lib/services/push_notification_service.dart`) require an authorized Firebase Admin SDK credential. Currently, the server gracefully warns and skips push notifications when unconfigured.
- **Which Release Check It Blocks**: Live mobile push notification reception on Android and iOS devices.
- **Exact Next Verification Step**:
  1. In Firebase Console, generate a private key for the Firebase Admin SDK.
  2. Provide the JSON content or file path in server environment variables.
  3. Send a test push notification from the Admin dashboard or trigger an application status update; verify that a physical Android device receives the notification banner in background and foreground states.

---

### Action 4: Cloudflare R2 Durable Object Storage Credentials
- **Required Variable / Asset Name**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (or `R2_SECRET_KEY`), `R2_BUCKET` (or `R2_BUCKET_NAME`).
- **Required Environment / Account**: Cloudflare Dashboard -> R2 Object Storage.
- **Why It Is Needed**: Durable scholarship document persistence (grades, income certificates, student IDs) requires cloud object storage. In local testing, files are managed via synthetic buffers and local file mock storage. (Note: `R2_PUBLIC_URL` is omitted; scholarship documents are private and strictly served through authenticated backend download/presigned endpoints).
- **Which Release Check It Blocks**: Production multi-instance document uploads, presigned URLs, and durable document archiving.
- **Exact Next Verification Step**:
  1. Create an R2 bucket named `iskolar-production-documents`.
  2. Configure R2 API credentials with Object Read & Write permissions.
  3. Upload a requirement document from the Flutter application; verify that the document appears in the Cloudflare R2 bucket console and can be previewed via authorized backend download.

---

### Action 5: Production MongoDB Atlas Network Access & Connection URI
- **Required Variable / Asset Name**: `MONGO_URI`.
- **Required Environment / Account**: MongoDB Atlas Project -> Network Access -> IP Access List.
- **Why It Is Needed**: The production server requires network access to the MongoDB Atlas cluster. Ephemeral cloud hosting environments (e.g. Vercel or Render) require adding the hosting provider's IP range or allowing `0.0.0.0/0` with strong database user credentials and TLS enforcement (`tls=true`).
- **Which Release Check It Blocks**: Production backend startup and TTL index provisioning.
- **Exact Next Verification Step**:
  1. Add production server outbound IP addresses to MongoDB Atlas Network Access.
  2. Set `MONGO_URI` in server environment variables.
  3. Start the backend service and verify log output: `✓ MongoDB connected to database iskolar` and `✓ Authoritative state loaded from discrete MongoDB collections`.

---

### Action 6: Redis Adapter Configuration for Realtime Horizontal Scaling
- **Required Variable / Asset Name**: `REDIS_URL`.
- **Required Environment / Account**: Production Redis service (e.g. Upstash, Redis Cloud, or AWS ElastiCache).
- **Why It Is Needed**: If more than ONE (1) backend instance is deployed behind a load balancer, Socket.IO cross-instance communication and immediate session invalidation require a shared Redis adapter (`@socket.io/redis-adapter`).
- **Which Release Check It Blocks**: Multi-instance horizontal scaling. Without Redis, deployment is strictly restricted to **ONE (1) realtime backend instance**.
- **Exact Next Verification Step**:
  1. Provision Redis instance and set `REDIS_URL` in environment secrets.
  2. Start two backend processes and verify that logout/event push on Instance A propagates immediately to clients connected to Instance B.

---

## 2. Summary of Required Configuration Variables

| Variable Name | Sensitive? | Purpose | Recommended Target Location |
|---|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas Connection String | Hosting Env Secrets |
| `JWT_SECRET` | Yes | Token Signing (256-bit random key) | Hosting Env Secrets |
| `EMAIL_HOST` | No | SMTP Server Hostname | Hosting Env Config |
| `EMAIL_PORT` | No | SMTP Server Port (e.g. 587 or 465) | Hosting Env Config |
| `EMAIL_USER` | No | SMTP Account Username / Email | Hosting Env Config |
| `EMAIL_PASSWORD` | Yes | SMTP Password or App-Specific Password | Hosting Env Secrets |
| `EMAIL_FROM` | No | Sender Display Address | Hosting Env Config |
| `FIREBASE_SERVICE_ACCOUNT_JSON`| Yes | Firebase Admin SDK Service Account | Hosting Env Secrets |
| `R2_ACCOUNT_ID` | No | Cloudflare Account Identifier | Hosting Env Config |
| `R2_ACCESS_KEY_ID` | Yes | S3-Compatible Access Key | Hosting Env Secrets |
| `R2_SECRET_ACCESS_KEY` / `R2_SECRET_KEY` | Yes | S3-Compatible Secret Key | Hosting Env Secrets |
| `R2_BUCKET` / `R2_BUCKET_NAME` | No | R2 Bucket Name | Hosting Env Config |
| `REDIS_URL` | Yes | Redis Connection URI (Mandatory for >1 instance) | Hosting Env Secrets |
