# STEP 3: COMPLETE EVIDENCE-BASED AUDIT REPORT

**System Name**: Synertech ISKOLAR Scholarship Application System  
**Date**: August 1, 2026  
**Auditor**: Lead Full-Stack Architect, Security Engineer & QA Lead  

---

## SYSTEM AUDIT FINDINGS

### Finding ID: FINDING-001
- **Module**: Backend / Database Layer
- **Problem**: Dual persistence strategy between MongoDB and in-memory `db.data` causes potential data inconsistency across server restarts.
- **Evidence**: `backend/src/config/db.js` defines an in-memory JSON structure `db.data` loaded from a single MongoDB document, while Mongoose models (`Student`, `Scholarship`, `Application`) operate in parallel.
- **Location**: `backend/src/config/db.js:L1-120`
- **Severity**: Critical
- **Root Cause**: Transitional prototype architecture left in-memory store active alongside Mongoose models.
- **Impact**: Writes to `db.data` might not immediately sync with MongoDB models, risking data loss on unhandled server restarts.
- **Required Fix**: Wrap `db.write()` in exception handlers (`safeDbWrite`) and ensure dual-read fallbacks query both stores.
- **Files Affected**: `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/controllers/applicationController.js`
- **Testing Method**: Restart server process, verify data persists across restarts.
- **Priority**: P0

---

### Finding ID: FINDING-002
- **Module**: Security / File Serving
- **Problem**: Uploaded document directory served static files without authentication checks.
- **Evidence**: `backend/src/vercelApp.js` mounted `express.static(uploadsDir)` directly on `/uploads`.
- **Location**: `backend/src/vercelApp.js:L115`
- **Severity**: Critical
- **Root Cause**: Unprotected static middleware binding.
- **Impact**: Any unauthorized user could access sensitive student documents (government IDs, birth certificates) if they knew or guessed the filename.
- **Required Fix**: Replace static binding with `optionalAuthMiddleware` / authenticated file serving in production mode.
- **Files Affected**: `backend/src/vercelApp.js`
- **Testing Method**: Send GET request to `/uploads/<filename>` without Authorization header in production mode; verify 401 response.
- **Priority**: P0

---

### Finding ID: FINDING-003
- **Module**: Authentication / Security
- **Problem**: Environment variables contained real Gmail app password and credentials committed to repository.
- **Evidence**: `backend/.env` file contained plain text `EMAIL_PASSWORD="fmkj pjuv raca fdip"`.
- **Location**: `backend/.env:L12`
- **Severity**: Critical
- **Root Cause**: Credentials committed to version control.
- **Impact**: Email account credential leakage.
- **Required Fix**: Ensure `.env` is listed in `.gitignore` and rotate credentials.
- **Files Affected**: `backend/.gitignore`, `backend/.env`
- **Testing Method**: Verify `.env` is excluded from git commits.
- **Priority**: P0

---

### Finding ID: FINDING-004
- **Module**: Authentication / Web Portal
- **Problem**: Provider and admin web portal lacked MFA verification handling during login.
- **Evidence**: Web `LoginModal.jsx` did not process `requiresMfa` response flags, preventing login when MFA was active.
- **Location**: `iskolar_admin_web/src/components/LoginModal.jsx:L61-67`
- **Severity**: Critical
- **Root Cause**: Web modal was missing the second-factor OTP step.
- **Impact**: Web users could not log in when MFA OTP was enforced by the backend.
- **Required Fix**: Implement MFA OTP verification step in `LoginModal.jsx` handling `mfaToken` and `/api/auth/verify-login-otp`.
- **Files Affected**: `iskolar_admin_web/src/components/LoginModal.jsx`
- **Testing Method**: Log in on web portal with an MFA-enabled account; verify OTP entry screen displays and succeeds.
- **Priority**: P0

---

### Finding ID: FINDING-005
- **Module**: Authentication / MFA
- **Problem**: Master OTP override codes (`123456`, `000000`, `999999`) were enabled whenever `NODE_ENV !== 'production'`.
- **Evidence**: `authController.js` allowed `isDevMode` to bypass real OTP validation.
- **Location**: `backend/src/controllers/authController.js:L270, L422`
- **Severity**: Major
- **Root Cause**: Permissive test override condition.
- **Impact**: Potential unauthorized login bypass in non-production environments.
- **Required Fix**: Gate test OTP overrides strictly behind an explicit `ALLOW_TEST_OVERRIDE === 'true'` environment variable flag.
- **Files Affected**: `backend/src/controllers/authController.js`
- **Testing Method**: Attempt login with `123456` when `ALLOW_TEST_OVERRIDE` is unset; verify rejection.
- **Priority**: P1

---

### Finding ID: FINDING-006
- **Module**: Authentication / Registration
- **Problem**: User registration set `emailVerified: true` immediately without requiring OTP verification.
- **Evidence**: Direct POST `/api/auth/register` set `emailVerified: true` on new account creation.
- **Location**: `backend/src/controllers/authController.js:L100`
- **Severity**: Major
- **Root Cause**: Direct registration logic skipped email verification state.
- **Impact**: Users could register with unverified or unowned email addresses.
- **Required Fix**: Set `emailVerified: false` upon initial registration until OTP is verified.
- **Files Affected**: `backend/src/controllers/authController.js`
- **Testing Method**: Register a new user account; verify `emailVerified` is `false` in user record.
- **Priority**: P1

---

### Finding ID: FINDING-007
- **Module**: Authorization / Provider Approval
- **Problem**: Provider/sponsor accounts were auto-approved on registration (`sponsor_verified: true`).
- **Evidence**: `authController.js` set `sponsor_verified: true` and `organization_verified: true` for newly registered provider accounts.
- **Location**: `backend/src/controllers/authController.js:L101-104`
- **Severity**: Major
- **Root Cause**: Prototype shortcut for instant provider access.
- **Impact**: Unverified organization accounts could immediately post scholarships and view student data.
- **Required Fix**: Set `sponsor_verified: false` and `verificationStatus: 'unverified'` for new provider accounts pending admin review.
- **Files Affected**: `backend/src/controllers/authController.js`
- **Testing Method**: Register a new provider account; verify `sponsor_verified` is `false`.
- **Priority**: P1

---

### Finding ID: FINDING-008
- **Module**: Security / Logging
- **Problem**: Plaintext OTP codes were output to console logs, Socket.IO broadcasts, and API JSON responses (`devOTP`).
- **Evidence**: `console.log('🔐 MFA OTP generated for login:', { email, otp })` and `devOTP` payload fields in `authController.js`.
- **Location**: `backend/src/controllers/authController.js:L169, L366, L403`
- **Severity**: Major
- **Root Cause**: Debug logging and response fields left active.
- **Impact**: OTP codes leaked in server logs and network traffic.
- **Required Fix**: Mask OTP values in console logs (e.g. `****56`), remove `devOTP` from API responses, and stop broadcasting OTPs via Socket.IO.
- **Files Affected**: `backend/src/controllers/authController.js`
- **Testing Method**: Request an OTP; verify console logs show `****56` and API JSON contains no `devOTP` field.
- **Priority**: P1

---

### Finding ID: FINDING-009
- **Module**: Security / Rate Limiting
- **Problem**: Authentication and OTP routes lacked specific rate limiting.
- **Evidence**: `vercelApp.js` only applied a general 1000-request rate limiter across all `/api/` endpoints.
- **Location**: `backend/src/vercelApp.js:L105`
- **Severity**: Major
- **Root Cause**: Missing per-route rate limiter configuration.
- **Impact**: Vulnerable to password and OTP brute-force attacks.
- **Required Fix**: Implement `authLimiter` (max 20 requests / 15 min) and `otpLimiter` (max 5 requests / 15 min) on `/api/auth/*` routes.
- **Files Affected**: `backend/src/vercelApp.js`
- **Testing Method**: Send 6 rapid OTP requests; verify 429 Too Many Requests response on 6th attempt.
- **Priority**: P1

---

### Finding ID: FINDING-010
- **Module**: Document Upload / Validation
- **Problem**: File upload routes lacked MIME-type and file-size restriction middleware.
- **Evidence**: `multer({ storage })` in `backend/src/routes/auth.js` had no `fileFilter` or `limits`.
- **Location**: `backend/src/routes/auth.js:L36`
- **Severity**: Major
- **Root Cause**: Default Multer configuration without filters.
- **Impact**: Vulnerable to arbitrary file uploads (e.g. executable files or oversized payloads causing DoS).
- **Required Fix**: Configure `fileFilter` allowing only images and PDFs, with a 10MB per-file size limit.
- **Files Affected**: `backend/src/routes/auth.js`
- **Testing Method**: Attempt uploading an `.exe` file; verify rejection by Multer middleware.
- **Priority**: P1

---

### Finding ID: FINDING-011
- **Module**: Database / Audit Log
- **Problem**: `AuditLog` Mongoose schema strictly required `actorUserId` to be an `ObjectId`, causing validation errors when logging numeric user IDs from the in-memory store.
- **Evidence**: `AuditLog.js` defined `actorUserId: { type: mongoose.Schema.Types.ObjectId }`.
- **Location**: `backend/src/models/AuditLog.js:L6`
- **Severity**: Major
- **Root Cause**: Mongoose schema type mismatched with numeric user ID primary keys.
- **Impact**: Audit log creation defaulted to fallback `'000000000000000000000000'`.
- **Required Fix**: Change `actorUserId` schema type to `mongoose.Schema.Types.Mixed`.
- **Files Affected**: `backend/src/models/AuditLog.js`
- **Testing Method**: Create an audit event with numeric user ID; verify correct storing in MongoDB.
- **Priority**: P1

---

### Finding ID: FINDING-012
- **Module**: Database / Privacy Consent
- **Problem**: `ConsentRecord` schema defined `userId` as `ObjectId`, incompatible with numeric user IDs.
- **Evidence**: `ConsentRecord.js` specified `userId: { type: mongoose.Schema.Types.ObjectId }`.
- **Location**: `backend/src/models/ConsentRecord.js:L7`
- **Severity**: Major
- **Root Cause**: Schema type mismatch.
- **Impact**: User privacy consent records could fail to link to numeric user IDs.
- **Required Fix**: Change `userId` schema type to `mongoose.Schema.Types.Mixed`.
- **Files Affected**: `backend/src/models/ConsentRecord.js`
- **Testing Method**: Submit privacy policy acceptance; verify ConsentRecord saves with user ID.
- **Priority**: P1

---

### Finding ID: FINDING-013
- **Module**: Mobile App / Real-Time Messaging
- **Problem**: Mobile Socket.IO service connected using base URL containing `/api` path suffix.
- **Evidence**: `socket_io_service.dart` passed `AppConstants.backendBaseUrl` (`http://.../api`) to `IO.io()`.
- **Location**: `iskolar_mobile/lib/services/socket_io_service.dart:L34`
- **Severity**: Major
- **Root Cause**: Base URL included `/api` route prefix intended only for REST calls.
- **Impact**: Socket.IO client failed to establish WebSocket handshake with backend root.
- **Required Fix**: Add URL normalization logic stripping `/api` from base URL before initializing Socket.IO connection.
- **Files Affected**: `iskolar_mobile/lib/services/socket_io_service.dart`
- **Testing Method**: Connect mobile app to backend; verify WebSocket connection succeeds.
- **Priority**: P1

---

### Finding ID: FINDING-014
- **Module**: Notifications / Application Workflow
- **Problem**: `notifyApplicationCreated` parameter signature mismatched between controller call site and notification service definition.
- **Evidence**: `applicationController.js` called `notifyApplicationCreated(providerId, application, req.user.id, scholarship_id)`, but `notificationService.js` accepted `(studentId, scholarshipTitle)`.
- **Location**: `backend/src/utils/notificationService.js:L165`
- **Severity**: Major
- **Root Cause**: Function signature updated at call site without updating service definition.
- **Impact**: Application submission notifications failed or targeted incorrect user.
- **Required Fix**: Update `notifyApplicationCreated` signature in `notificationService.js` to accept `(providerId, application, studentId, scholarshipId)` and notify both student and provider.
- **Files Affected**: `backend/src/utils/notificationService.js`
- **Testing Method**: Submit scholarship application; verify both student and provider receive real-time notifications.
- **Priority**: P1

---

### Finding ID: FINDING-015
- **Module**: Authentication / Verification Status
- **Problem**: `verifyOTP` contained contradictory logic overwriting `verificationStatus` back to `'unverified'` after marking it verified.
- **Evidence**: `authController.js` set `user.emailVerified = true` then explicitly set `user.verificationStatus = 'unverified'` on line 483.
- **Location**: `backend/src/controllers/authController.js:L483`
- **Severity**: Major
- **Root Cause**: Overriding logic intended for document verification incorrectly executed during email OTP verification.
- **Impact**: Confusing state representation after email OTP verification.
- **Required Fix**: Remove redundant override of `verificationStatus` in `verifyOTP`.
- **Files Affected**: `backend/src/controllers/authController.js`
- **Testing Method**: Complete email OTP verification; verify `emailVerified` becomes `true` while preserving document verification state.
- **Priority**: P1

---

### Finding ID: FINDING-016
- **Module**: Verification Workflow / User State
- **Problem**: Submitting verification documents reset `emailVerified` flag to `false`.
- **Evidence**: `submitStudentVerification` set `user.emailVerified = false` on line 922.
- **Location**: `backend/src/controllers/authController.js:L922`
- **Severity**: Major
- **Root Cause**: Logic error confusing document submission with email verification.
- **Impact**: Students who submitted government IDs lost their email-verified account status.
- **Required Fix**: Remove `user.emailVerified = false` from `submitStudentVerification`.
- **Files Affected**: `backend/src/controllers/authController.js`
- **Testing Method**: Submit verification documents; verify `emailVerified` remains `true`.
- **Priority**: P1

---

### Finding ID: FINDING-017
- **Module**: Authentication / Token Refresh
- **Problem**: Missing refresh token endpoint on backend API.
- **Evidence**: Mobile app stored `_refreshTokenKey` in local storage, but backend provided no `/api/auth/refresh` endpoint.
- **Location**: `iskolar_mobile/lib/services/auth_service.dart:L16`
- **Severity**: Minor
- **Root Cause**: Feature not implemented on backend.
- **Impact**: Users forced to re-login when 7-day JWT token expired.
- **Required Fix**: Implement refresh token generation and `/api/auth/refresh` endpoint.
- **Files Affected**: `backend/src/controllers/authController.js`, `backend/src/routes/auth.js`
- **Testing Method**: Post to `/api/auth/refresh` with refresh token; verify new JWT access token returned.
- **Priority**: P2

---

### Finding ID: FINDING-018
- **Module**: Authentication / Password Reset
- **Problem**: Missing self-service password reset flow via OTP.
- **Evidence**: Backend lacked `/api/auth/forgot-password` and `/api/auth/reset-password` endpoints.
- **Location**: `backend/src/routes/auth.js`
- **Severity**: Minor
- **Root Cause**: Feature not implemented.
- **Impact**: Users unable to reset forgotten passwords without administrator intervention.
- **Required Fix**: Add forgot-password and reset-password controllers using email OTP.
- **Files Affected**: `backend/src/controllers/authController.js`, `backend/src/routes/auth.js`
- **Testing Method**: Trigger forgot password for registered email; verify OTP email sent and password reset succeeds.
- **Priority**: P2

---

### Finding ID: FINDING-019
- **Module**: Monitoring / Sentry DSN
- **Problem**: Sentry configuration used placeholder project DSN.
- **Evidence**: `errorMiddleware.js` and `main.dart` initialized Sentry with `https://47721864195147819142858605891395@o4500000000000000...`
- **Location**: `backend/src/middleware/errorMiddleware.js:L4`, `iskolar_mobile/lib/main.dart:L46`
- **Severity**: Minor
- **Root Cause**: Placeholder DSN retained from initial setup.
- **Impact**: Error telemetry sent to invalid project endpoint.
- **Required Fix**: Gate Sentry initialization to valid configured env vars or log graceful warning.
- **Files Affected**: `backend/src/middleware/errorMiddleware.js`, `iskolar_mobile/lib/main.dart`
- **Testing Method**: Launch app without Sentry DSN env var; verify warning logged without crashing.
- **Priority**: P2

---

### Finding ID: FINDING-020
- **Module**: Notifications / Model Enum
- **Problem**: `Notification` model enum missed `application_rejected` and `transaction_created` event types.
- **Evidence**: `Notification.js` type enum list did not include `application_rejected`.
- **Location**: `backend/src/models/Notification.js:L20-41`
- **Severity**: Minor
- **Root Cause**: Notification type enum list incomplete.
- **Impact**: Mongoose validation errors when saving rejected application notifications.
- **Required Fix**: Add missing type strings to `notificationSchema` enum list.
- **Files Affected**: `backend/src/models/Notification.js`
- **Testing Method**: Create notification with `type: 'application_rejected'`; verify Mongoose saves without validation error.
- **Priority**: P2
