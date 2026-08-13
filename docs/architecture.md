# SYNERTECH ISKOLAR - System Architecture Documentation

## Platform Topology
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SYNERTECH ISKOLAR ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────────┘
  
  [ Flutter Student Mobile App ]                 [ React Provider / Admin Portal ]
      (Students Only - Mobile)                      (Providers & Admins - Web)
                 │                                               │
                 │ HTTP / REST / Multipart                       │ HTTP / REST
                 │ Socket.IO Notifications                       │ Socket.IO Events
                 └───────────────────────┬───────────────────────┘
                                         ▼
                        ┌─────────────────────────────────┐
                        │     Shared Express API Server    │
                        │           (Port 4000)           │
                        └────────────────┬────────────────┘
                                         │ Mongoose ORM
                                         ▼
                        ┌─────────────────────────────────┐
                        │     Shared MongoDB Database     │
                        │   (Authoritative Data Store)    │
                        └─────────────────────────────────┘
```

## Architectural Component Breakdown

### 1. Flutter Mobile Application (`iskolar_mobile`)
- **Target Audience**: Students only.
- **Key Modules**: Student Onboarding, Registration with Pre-submission Privacy Consent, Email OTP Verification, Identity Verification, Scholarship Discovery, Application Form & Document Upload, OCR Review & Confirmation, Application Status Timeline Tracking, Schedule Notifications, and Student Profile Management.
- **Access Control**: Blocked for Providers and Administrators; attempts render `SponsorAdminNoticeScreen`.

### 2. React Web Portal (`iskolar_admin_web`)
- **Target Audience**: Scholarship Providers/Sponsors and System Administrators only.
- **Key Modules**: Provider Registration & Admin Approval, Dashboard Metrics & Accessible Visualizations, Scholarship Creation & Management, Applicant Review, Protected Document Verification, Interview & Exam Scheduling, Audit Logs, and System Settings.
- **Access Control**: Blocked for Students; attempts render `StudentRedirectNotice`.

### 3. Shared Express API Backend (`backend`)
- **Port**: 4000
- **Responsibilities**: REST API routing, JWT authentication & role-based middleware, object-level document authorization (`/uploads/:filename`), rate limiting, OCR processing via `tesseract.js`, Socket.IO room management, and audit logging.

### 4. Authoritative MongoDB Database
- **Role**: Single source of truth for all users, applications, documents, OCR extractions, schedules, and notifications.
- **Persistence**: All data persists across backend server restarts.
