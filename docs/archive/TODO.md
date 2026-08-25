# Completed fixes

## Security
- [x] Removed live MongoDB credentials from .env (now blank template)
- [x] Removed Vercel OIDC tokens from admin web .env files
- [x] Replaced hardcoded `'super-secret'` JWT fallback — now requires `JWT_SECRET` env var
- [x] Added JWT_SECRET validation in authMiddleware and generateToken
- [x] Removed hardcoded credentials from tmp scripts (use env var or localhost fallback)
- [x] Fixed CORS to use whitelist via `CORS_ORIGINS` env var
- [x] Removed hardcoded admin credentials from create_admin.js (env-only now)
- [x] Added `uploads/` and `backend.json` to .gitignore
- [x] Added helmet security headers
- [x] Added rate limiting (100 req/15min global, 20 req/15min auth)
- [x] Added request body size limit (1mb)
- [x] Fixed stack trace leaking in production error handler

## Compilation/Build
- [x] Fixed `?variable` syntax in Flutter auth_service.dart and transaction_service.dart (invalid Dart)
- [x] Fixed `initialValue` → `value` in Flutter register_screen.dart DropdownButtonFormField
- [x] Added missing `path` import in backend scholarshipController.js
- [x] Installed `@vitejs/plugin-react` and configured in vite.config.js
- [x] Admin web production build now succeeds

## Backend Code Quality
- [x] Fixed global variable leak (`ensureArrayExists` without declaration)
- [x] Fixed all silent catch blocks in authController to use centralized error handler
- [x] Fixed getProfile function signature to include `next` parameter
- [x] Fixed all authController catch blocks to call `next(err)` instead of `res.status(500)`
- [x] Added admin role check to transaction status update route
- [x] Fixed userController to require password (no default `TempPass123!`)
- [x] Enhanced changePassword validation to match registration strength rules
- [x] Added `next` parameter to all authController functions that use it
- [x] Removed test/tmp/scratch files (10 files)

## Admin Web
- [x] Fixed VITE_API_URL in production .env files (was empty, now set to production URL)
- [x] Standardized socket.js to use shared apiBaseUrl config
- [x] Removed fallback localhost hardcoding in socket.js
- [x] Removed orphaned files (main.js, style.css, ReportsPage.jsx.bak, production.env)
- [x] Fixed Navbar.jsx silent catch

## Flutter Mobile
- [x] Fixed all deprecated `withOpacity()` → `withValues(alpha:)` calls
- [x] Fixed integer alpha values (0-255) to float (0.0-1.0)
- [x] Removed duplicate import in student_verification_screen.dart
- [x] Fixed broken widget_test.dart (was testing non-existent counter app)
