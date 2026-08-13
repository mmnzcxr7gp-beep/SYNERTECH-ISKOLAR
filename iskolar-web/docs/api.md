# API SPECIFICATION & ENDPOINT REFERENCE

**System**: Synertech ISKOLAR Backend API  
**Base URL**: `http://localhost:4000/api`  
**Authentication**: HTTP Bearer JWT Header (`Authorization: Bearer <token>`)  

---

## 1. Authentication Endpoints (`/api/auth`)

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/auth/register` | POST | Public | Register new student/provider account. Sends OTP to email. |
| `/auth/login` | POST | Public | Login with email/password. Returns JWT or `{ requiresMfa: true, mfaToken }`. |
| `/auth/verify-login-otp` | POST | Public | Complete MFA login using `mfaToken` and 6-digit OTP. |
| `/auth/send-otp` | POST | Public | Dispatch email OTP for verification. |
| `/auth/verify-otp` | POST | Public | Verify registration OTP code. |
| `/auth/me` | GET | Bearer Token | Retrieve current authenticated user profile & verification status. |
| `/auth/student/profile` | PUT | Bearer Token | Update student profile fields (school, course, yearLevel, GPA). |
| `/auth/me/photo` | POST | Bearer Token | Upload user profile picture. |
| `/auth/me/photo` | DELETE | Bearer Token | Delete user profile picture. |

---

## 2. Scholarship Endpoints (`/api/scholarships`)

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/scholarships` | GET | Public | List all active/open scholarship grants with criteria & sponsor details. |
| `/scholarships/:id` | GET | Public | Fetch detailed information for a specific scholarship grant. |
| `/scholarships` | POST | Provider/Admin | Create a new scholarship grant with requirements & criteria. |
| `/scholarships/:id` | PUT | Provider/Admin | Update scholarship grant details or slots. |
| `/scholarships/:id` | DELETE | Provider/Admin | Delete/Archive a scholarship grant. |

---

## 3. Application Endpoints (`/api/applications`)

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/applications` | GET | Bearer Token | Fetch applications (Students see own applications; Providers see applications for their grants). |
| `/applications/submit` | POST | Student | Submit scholarship application with uploaded requirement files (`file_0`, `file_1`). |
| `/applications/:id/status` | PUT | Provider/Admin | Update application status (`approved`, `rejected`, `pending`) & trigger notifications/email. |

---

## 4. OCR Processing Endpoints (`/api/ocr`)

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/ocr/extract` | POST | Bearer Token | Upload image document for Tesseract.js OCR text & field extraction. |
| `/ocr/verify` | POST | Bearer Token | Cross-check extracted OCR data against profile data for discrepancies. |
| `/ocr/confirm` | POST | Bearer Token | Confirm OCR extractions and save verified fields. |

---

## 5. Scheduling Endpoints (`/api/schedules`)

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/schedules` | GET | Bearer Token | Fetch assigned exam or interview schedules for current user. |
| `/schedules` | POST | Provider/Admin | Create an exam or panel interview schedule and assign applicants. |
| `/schedules/:id` | PUT | Provider/Admin | Update schedule date, time, venue, or assigned applicants. |

---

## 6. Notification Endpoints (`/api/notifications`)

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/notifications` | GET | Bearer Token | Get user notifications with pagination & unread count. |
| `/notifications/:id/read` | PUT | Bearer Token | Mark specific notification as read. |
| `/notifications/read-all` | PUT | Bearer Token | Mark all notifications as read. |
