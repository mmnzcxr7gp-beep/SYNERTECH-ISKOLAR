# SYNERTECH ISKOLAR - API Documentation

## Base URL
- Development: `http://localhost:4000/api`
- Versioned Alias: `http://localhost:4000/api/v1`

## Key API Endpoints

### 1. Authentication & Registration
- `POST /api/auth/register` - Registers student or provider accounts. Enforces pre-registration privacy consent.
- `POST /api/auth/login` - Authenticates users. Accepts `skipMfa` parameter in development or returns `mfaToken`.
- `POST /api/auth/send-otp` / `verify-otp` - Generates and verifies single-use 6-digit email OTPs.
- `GET /api/auth/me` - Retrieves authenticated user profile.

### 2. Scholarships
- `GET /api/scholarships` - Lists scholarships (filtered by provider for sponsors, public active list for students).
- `POST /api/scholarships` - Creates scholarship opportunity (Provider/Admin only).
- `PUT /api/scholarships/:id` - Updates scholarship opportunity (Owner Provider only).

### 3. Applications & Documents
- `GET /api/scholarship-applications` - Lists student applications.
- `POST /api/scholarship-applications/:scholarshipId/submit` - Submits application with attached document metadata.
- `POST /api/documents/upload` - Uploads document file with MIME and file size validation.
- `GET /uploads/:filename` - Retrieves protected file asset with mandatory JWT and object-level authorization check.

### 4. OCR Processing & Confirmation
- `POST /api/ocr/extract` - Processes uploaded document image buffer using `tesseract.js` and returns extracted fields.
- `POST /api/ocr/confirm` - Persists student-confirmed/corrected fields to MongoDB.

### 5. Scheduling & Real-Time Events
- `POST /api/schedules` - Schedules exam or interview for assigned applicants.
- `GET /api/schedules` - Lists scheduled events for authenticated user.
- `GET /api/notifications` - Lists notifications.
