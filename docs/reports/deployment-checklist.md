# PRODUCTION DEPLOYMENT CHECKLIST

**System**: Synertech ISKOLAR System  
**Environment**: Production  

---

## Pre-Deployment Audit Steps

- [x] **Git Security**: Verify `.env` is listed in `.gitignore` and no real credentials exist in commit history.
- [x] **Rate Limiting**: Confirm route-level rate limiting enabled on `/api/auth/login` (max 20/15min) and `/api/auth/*-otp` (max 5/15min).
- [x] **Protected Storage**: Ensure `/uploads` endpoint enforces authentication middleware in production (`NODE_ENV=production`).
- [x] **MFA Overrides**: Verify `ALLOW_TEST_OVERRIDE` is set to `false` or unconfigured in production environment.
- [x] **Multer File Filters**: Verify file size limits (10MB) and MIME-type restriction (images and PDFs only) are active on file upload endpoints.
- [x] **Log Confidentiality**: Verify OTP values and passwords are fully masked in console logging and API responses.
- [x] **Schema Types**: Ensure `AuditLog` and `ConsentRecord` models accept both `ObjectId` and numeric user IDs.
- [x] **Web Build**: Run `npm --prefix iskolar_admin_web run build` and ensure 0 compilation errors.
- [x] **Backend Syntax**: Execute `node -e "require('./backend/src/vercelApp.js')"` to verify clean load.
