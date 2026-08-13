# TESTING INSTRUMENTS & VALIDATION GUIDE

**System**: Synertech ISKOLAR System Verification  
**Date**: August 1, 2026  

---

## 1. Automated Verification Checks

### Backend Module Load Test
```bash
node -e "require('./backend/src/vercelApp.js'); console.log('✓ vercelApp loads cleanly')"
```

### Web Production Build Test
```bash
npm --prefix iskolar_admin_web run build
```

---

## 2. Manual End-to-End Verification Test Plan

### Test Case E2E-001: Student Registration & Email OTP Verification
1. Open Flutter Mobile App or Web Modal.
2. Select "Student" role and fill Name, Email, Password. Accept Data Privacy Policy.
3. Submit registration. Backend dispatches 6-digit OTP via Email/Console.
4. Input OTP code. Verify account successfully transitions `emailVerified: true` and logs in.

### Test Case E2E-002: Student Scholarship Application Submission
1. Log in as verified Student.
2. Browse active scholarships and select grant (e.g. "STEM Tertiary Scholarship").
3. Upload required files (Student ID, COR).
4. System executes Tesseract.js OCR text extraction for preview.
5. Confirm application submission. Verify record created in `applications` with `pending` status.

### Test Case E2E-003: Provider Review & Decision Workflow
1. Log in on Provider Web Portal (`http://localhost:5173`).
2. Navigate to `#admin/applicants`. Verify new student application appears.
3. Open `#admin/documents` to review uploaded student IDs.
4. Click "Approve Application".
5. Verify Socket.IO emits `application-status-changed` event to student room, email notification dispatched, and student mobile app updates status to `APPROVED`.

### Test Case E2E-004: Exam & Interview Scheduling
1. On Web Portal `#admin/scheduling`, create an interview event for scholarship grant.
2. Assign student applicant.
3. Verify event saved and visible on student's mobile `schedule_screen.dart`.
