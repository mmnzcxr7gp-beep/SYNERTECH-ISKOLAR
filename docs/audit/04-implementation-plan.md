# STEP 4: IMPLEMENTATION PLAN & TASK SPECIFICATION

**System Name**: Synertech ISKOLAR Scholarship Application System  
**Date**: August 1, 2026  
**Lead Architect**: Full-Stack Security & Software Architect  

---

## IMPLEMENTATION ORDER & TASKS

### Phase 1: Build & Security Blockers (P0)

#### TASK-001: Protect Uploaded File Access (`/uploads`)
- **Related Finding**: FINDING-002
- **Objective**: Secure uploaded government IDs and certificates against unauthenticated access.
- **Files Affected**: `backend/src/vercelApp.js`, `backend/src/middleware/authMiddleware.js`
- **Database Impact**: None
- **API Contract Impact**: `/uploads/*` requires JWT header in production mode.
- **Steps**:
  1. Bind `optionalAuthMiddleware` to `/uploads` mount path in `vercelApp.js`.
  2. Block requests missing `req.user` when `NODE_ENV === 'production'`.
- **Validation**: `curl -I http://localhost:4000/uploads/test.pdf` returns 401 in production mode without token.
- **Definition of Done**: File access enforced with authorization.

#### TASK-002: Credential & Environment Isolation
- **Related Finding**: FINDING-003
- **Objective**: Ensure credentials are not tracked in git repo.
- **Files Affected**: `backend/.gitignore`
- **Steps**:
  1. Add `.env` explicitly to `backend/.gitignore`.
  2. Rotate sensitive secrets in production deployment.
- **Definition of Done**: `.env` is ignored by git.

#### TASK-003: Web Portal MFA OTP Verification
- **Related Finding**: FINDING-004
- **Objective**: Enable providers/admins to complete MFA OTP verification on web login.
- **Files Affected**: `iskolar_admin_web/src/components/LoginModal.jsx`
- **Steps**:
  1. Catch `requiresMfa: true` response in `handleLoginSubmit`.
  2. Render OTP input form when `mfaToken` is set.
  3. Send OTP to `/api/auth/verify-login-otp`.
- **Validation**: Web login prompt displays OTP input field and completes login on correct OTP.
- **Definition of Done**: Web portal supports end-to-end MFA.

#### TASK-004: Dual-Write Resilience & Error Handling
- **Related Finding**: FINDING-001
- **Objective**: Prevent database write failures from crashing API requests.
- **Files Affected**: `backend/src/controllers/authController.js`, `backend/src/config/db.js`
- **Steps**: Wrap `db.write()` calls in `safeDbWrite` try-catch functions.
- **Definition of Done**: DB writes execute safely without throwing unhandled promise rejections.

---

### Phase 2: Required Features & Integrity Fixes (P1)

#### TASK-005: Gate Test MFA Overrides
- **Related Finding**: FINDING-005
- **Files**: `backend/src/controllers/authController.js`
- **Steps**: Check `process.env.ALLOW_TEST_OVERRIDE === 'true'` before applying master OTP bypass.

#### TASK-006: Initial Registration Verification State
- **Related Finding**: FINDING-006
- **Files**: `backend/src/controllers/authController.js`
- **Steps**: Set `emailVerified: false` on newly registered users.

#### TASK-007: Provider Account Review Workflow
- **Related Finding**: FINDING-007
- **Files**: `backend/src/controllers/authController.js`
- **Steps**: Set `sponsor_verified: false` and `verificationStatus: 'unverified'` for new provider registrations.

#### TASK-008: Mask OTPs in Server Logs & Responses
- **Related Finding**: FINDING-008
- **Files**: `backend/src/controllers/authController.js`
- **Steps**: Mask OTP values (`****56`), remove `devOTP` from JSON responses, stop Socket.IO OTP emissions.

#### TASK-009: Endpoint-Specific Rate Limiting
- **Related Finding**: FINDING-009
- **Files**: `backend/src/vercelApp.js`
- **Steps**: Add `authLimiter` (20/15min) and `otpLimiter` (5/15min) middleware.

#### TASK-010: Multer Upload Security & Size Limits
- **Related Finding**: FINDING-010
- **Files**: `backend/src/routes/auth.js`
- **Steps**: Add `fileFilter` allowing images/PDFs and set `limits.fileSize = 10MB`.

#### TASK-011 & TASK-012: Mongoose Schema Type Compatibility
- **Related Findings**: FINDING-011, FINDING-012
- **Files**: `backend/src/models/AuditLog.js`, `backend/src/models/ConsentRecord.js`
- **Steps**: Update `actorUserId` and `userId` fields to `mongoose.Schema.Types.Mixed`.

#### TASK-013: Mobile Socket.IO URL Base Normalization
- **Related Finding**: FINDING-013
- **Files**: `iskolar_mobile/lib/services/socket_io_service.dart`
- **Steps**: Strip `/api` suffix from backend URL before initiating Socket.IO connections.

#### TASK-014: Notification Function Signature Alignment
- **Related Finding**: FINDING-014
- **Files**: `backend/src/utils/notificationService.js`
- **Steps**: Update `notifyApplicationCreated` signature to `(providerId, application, studentId, scholarshipId)`.

#### TASK-015 & TASK-016: User Verification State Logic Cleanup
- **Related Findings**: FINDING-015, FINDING-016
- **Files**: `backend/src/controllers/authController.js`
- **Steps**: Remove contradictory `verificationStatus` resets after OTP verify and preserve `emailVerified` during document uploads.

---

### Phase 3: System Enhancements (P2)

#### TASK-017 to TASK-020: Enums, Sentry, & Telemetry Refinements
- **Related Findings**: FINDING-017, FINDING-018, FINDING-019, FINDING-020
- **Files**: `backend/src/models/Notification.js`, `backend/src/middleware/errorMiddleware.js`
- **Steps**: Update `Notification` type enum, configure Sentry fallbacks.
