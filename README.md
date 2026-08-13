# SYNERTECH ISKOLAR - Scholarship Management System

## Platform Overview
**SYNERTECH ISKOLAR** is a centralized scholarship application and management system. It connects student applicants with scholarship sponsors and administrators through a unified, real-time platform.

## Architectural Role Separation
- **Flutter Mobile Application (`isko-mobile`)**: Exclusively for **Students**.
- **React Web Application (`isko-web`)**: Exclusively for **Scholarship Providers/Sponsors** and **Administrators**.
- **Shared Server API**: Centralized Express API (`backend`) serving both mobile and web clients.
- **Shared Database**: One authoritative MongoDB database for users, applications, scholarships, schedules, notifications, document metadata, and audit logs.

## Repository Organization Strategy
The system is structured into two clean target repositories:
1. **`isko-web`**: Contains the React provider/admin web portal (`iskolar_admin_web`), shared Express API server (`backend`), system documentation, and backend test scripts.
2. **`isko-mobile`**: Contains the Flutter student mobile application (`iskolar_mobile`), Dart models, screens, services, widgets, and mobile test suites.

## System Verification Commands
```bash
# 1. Backend Role Separation & Platform Restriction Tests
cd backend && node scripts/test_role_separation.js

# 2. Backend End-to-End Integration Suite (60 tests)
cd backend && node scripts/e2e_integration_test.js

# 3. Document Authorization & Path Traversal Suite
cd backend && node scripts/test_document_authorization.js

# 4. OTP Security Lockdown Verification
cd backend && node scripts/test_otp_security_lockdown.js

# 5. Flutter Mobile Analysis & Tests
cd iskolar_mobile && flutter analyze && flutter test

# 6. React Web Application Build
cd iskolar_admin_web && npm run build
```

## Non-Negotiable Security Rules
- No secret keys, passwords, OTPs, or database credentials committed.
- Environment variables configured via `.env.example` files.
- Role-based route guards and object-level document authorization enforced on backend.
- Remote Git operations (commit, push, repo creation) executed only upon explicit user permission.
