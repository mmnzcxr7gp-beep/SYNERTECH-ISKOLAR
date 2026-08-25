# REQUIRES_CLIENT_CONFIRMATION

This document tracks all unresolved business facts, role boundaries, workflow details, and oral defense feedback for **ISKOLAR: Learning Aid and Resources (Scholar Application)**.

> [!IMPORTANT]
> To prevent false business rules from being hardcoded into production, these items are managed through configurable system settings and domain models. When formal client/panel confirmation is received, update the corresponding config/enum mappings accordingly.

---

## 1. Program Management & Role Responsibilities
- [x] **Item 1: Who creates scholarship programs?**
  - *Current Implementation*: Authorized Scholarship Providers / Sponsors and System Administrators can create and publish programs.
  - *Status*: Configurable via role permissions (`admin`, `provider`).
- [x] **Item 2: Who verifies uploaded documents?**
  - *Current Implementation*: Assigned Staff / Scholarship Officers and Administrators verify applicant documents.
  - *Status*: Configurable via role permissions (`admin`, `staff`).
- [x] **Item 3: Who schedules exams and interviews?**
  - *Current Implementation*: Authorized Staff or Program Providers schedule assessment events.
  - *Status*: Configurable via role permissions (`staff`, `provider`).
- [x] **Item 4: Who makes the final scholarship decision?**
  - *Current Implementation*: Program Provider or System Administrator records final decision (`APPROVED`, `DENIED`, `WAITLISTED`, `DISQUALIFIED`).
  - *Status*: Configurable via role permissions (`admin`, `provider`).

---

## 2. Scholarship Rules & Eligibility Configuration
- [ ] **Item 5: Exact scholarship program names and types.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Seeded with pilot scholarship programs (e.g. Academic Excellence, Financial Assistance, STEM Merit).
- [ ] **Item 6: Specific eligibility criteria per program.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Uses rule evaluator supporting minimum GPA, income threshold, year level, and course filters.
- [ ] **Item 7: Required documents per scholarship.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Uses dynamic required document array on program configuration (e.g., Student ID, Form 137 / Transcript, Certificate of Indigency).
- [ ] **Item 8: Application windows and deadlines.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Supported via start/end dates on `ScholarshipProgram` schema.
- [ ] **Item 9: Benefits description and slot limits.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Configurable per program on backend.
- [ ] **Item 10: Selection and scoring process.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Supported via weighted criterion matrix (Academic 40%, Need 40%, Interview 20%) with tie-breaker logic.

---

## 3. Technology & Panel Feedback Items
- [x] **Item 11: Primary document types for initial OCR implementation.**
  - *Current Implementation*: Student ID Card and Report Card / Transcript of Records.
  - *Status*: Standardized using Tesseract OCR abstraction and `OcrExtraction` model.
- [x] **Item 12: Evidence for document verification beyond applicant matching.**
  - *Current Implementation*: OCR confidence ratings, file checksum duplicate detection, and authorized human reviewer remarks.
  - *Status*: Implemented in layered verification pipeline.
- [x] **Item 13: Second-Factor (MFA) Method.**
  - *Current Implementation*: Email OTP with attempt limits and expiration.
  - *Status*: Standardized on Email OTP.
- [ ] **Item 14: Exact failed transaction from the oral defense.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. System now protects all database state transitions with idempotency checks, atomic updates, and rollback logging.
- [ ] **Item 15: Exact meaning of panel's authentication/novelty comment.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Solved via explicit RBAC, short-lived tokens, audit logging, and OCR verification.
- [x] **Item 16: Rank visibility for applicants.**
  - *Current Implementation*: Applicants view their application status stage and general progress, not other applicants' scores or numerical ranks unless authorized by program policy.
  - *Status*: Implemented with privacy protection.
- [x] **Item 17: Waitlisting support.**
  - *Current Implementation*: Included as a canonical application state (`WAITLISTED`).
  - *Status*: Supported.
- [ ] **Item 18: Data retention and deletion/correction process.**
  - *Status*: `REQUIRES_CLIENT_CONFIRMATION`. Configured with retention policies and consent revision history (`ConsentRecord`).
