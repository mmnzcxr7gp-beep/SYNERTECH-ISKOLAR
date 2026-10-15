# ISKOLAR — Unified Scholarship Management & Verification Platform

**Creator and Lead Developer:** Sam Irian Villaluna  
**Organization:** SYNERTECH  
**Platform Classification:** Institutional Digital Scholarship Desk & Mobile Application  

---

## 1. Project Purpose & Ecosystem Overview

**ISKOLAR** is a centralized, transparent scholarship discovery, application intake, document verification, and administrative governance ecosystem designed specifically for Filipino college and tertiary students. It bridges tertiary students seeking financial aid with verified institutional providers—including philanthropic foundations, non-profit organizations, corporations, and government agencies (e.g., CHED, DOST, LGUs).

### Core Objectives
1. **Centralize Grant Discovery**: Aggregate verified Philippine scholarship grants into a structured, searchable catalog, eliminating scattered announcements on social media and physical bulletin boards.
2. **Automate Document Inspection with Human Authority**: Utilize Optical Character Recognition (OCR) via Tesseract.js to scan Philippine national IDs and academic transcripts (GWA detection). Extracted data requires explicit student confirmation and human reviewer validation; automated checks never issue final decisions.
3. **Streamline Provider Case Management**: Provide scholarship sponsors with a work-first workspace to manage grant programs, intake applications across 14 workflow stages, schedule panel examinations and interviews, request document resubmissions, and issue formal awards.
4. **Enforce Strict Privacy & Regulatory Compliance**: Maintain compliance with the **Philippine Data Privacy Act of 2012 (Republic Act No. 10173)** through mandatory pre-registration privacy consent, private encrypted cloud object storage (Cloudflare R2), object-level document authorization, distributed session revocation, and tamper-evident audit logging.

---

## 2. Architectural Role Separation & Responsibilities

The system enforces strict platform and operational isolation based on user role:

| Role | Operational Interface | Client Repository / Directory | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Student / Applicant** | Flutter Mobile Application | `mobile/` (`isko-mobile`) | Student onboarding, email OTP verification, scholarship discovery, application submission, document upload with OCR confirmation, status tracking, interview acknowledgment, and in-thread messaging. |
| **Scholarship Provider** | React Web Portal | `web/client/` (`isko-web`) | Organization profile management, grant program authoring, 14-stage applicant pipeline review, side-by-side OCR and document inspection, interview/exam scheduling, and award decisions. |
| **Platform Administrator** | React Web Portal | `web/client/` (`isko-web`) | Sponsor accreditation approvals, student and provider account oversight (suspension, reactivation), cross-program moderation, immutable audit log inspection, and infrastructure monitoring. |
| **Shared Backend API** | Express REST API Server | `web/server/` | Centralized REST API, Socket.IO real-time event pipeline, JWT authentication, role guards, MongoDB data access, Cloudflare R2 proxy, Nodemailer SMTP, and Tesseract OCR worker. |

> [!IMPORTANT]
> **Students are strictly restricted from the web portal.** Submitting student credentials on the web portal triggers the `StudentRedirectNotice` view, which guides the student to download the official mobile client.

---

## 3. Technology Stack

### Frontend Web Portal (`web/client`)
- **Runtime & Framework**: React 18.2, Vite 5.4 SPA
- **Styling & Tokens**: Vanilla CSS Design System, Tailwind CSS 3.4
- **Animation & Layout**: Framer Motion 10.12 (with `prefers-reduced-motion` compliance)
- **Visual Engines**: Three.js WebGL GPU shader (`Dither.jsx`) & Canvas particle engine (`ParticleText.jsx`)
- **Real-Time Client**: Socket.IO Client 4.7
- **Observability**: Sentry Browser SDK 10.68
- **Icons & Accessibility**: Custom SVG icon suite (`Icons.jsx`), WCAG 2.1 AA compliant keyboard navigation and visible focus rings

### Backend API Server (`web/server`)
- **Runtime**: Node.js 24 LTS (`v24.14.0+`), Express 4.18
- **Database Engine**: MongoDB Atlas v6.0+ / Mongoose 8.0 with local fallback resilience
- **Durable Document Storage**: Cloudflare R2 (S3 API via `@aws-sdk/client-s3` v3)
- **OCR Engine**: Tesseract.js 7.0 with local language models (`eng.traineddata`)
- **Real-Time WebSocket**: Socket.IO 4.7
- **Security & Headers**: Helmet 8.2, CORS, express-rate-limit 8.5, bcrypt 5.1, jsonwebtoken 9.0
- **Email Delivery**: Nodemailer 9.0 via Gmail SMTP (SSL 465)

### Mobile Client (`mobile`)
- **Framework**: Flutter 3.x / Dart SDK ^3.10.0
- **Design Pattern**: Material 3 Design, Provider state management
- **Push Notifications**: Firebase Cloud Messaging (FCM) client integration (`google-services.json`)
- **Storage**: Secure local storage via `shared_preferences`

---

## 4. Repository Structure

```text
iskolar-capstone-main/
├── render.yaml                          # Render infrastructure blueprint (backend web service)
├── README.md                            # Authoritative master platform documentation
├── web/
│   ├── client/                          # React Web Management Portal (isko-web)
│   │   ├── index.html                   # HTML entry point, SEO metadata, theme bootstrap
│   │   ├── vite.config.mjs              # Vite bundling, chunk splitting, dev proxy
│   │   ├── vercel.json                  # Vercel SPA rewrites, CSP, caching headers
│   │   ├── package.json                 # React dependencies and scripts
│   │   ├── .env.example                 # Client environment template
│   │   ├── tests/                       # Puppeteer automated visual QA & interaction suite
│   │   └── src/
│   │       ├── main.jsx                 # React root and error monitoring
│   │       ├── App.jsx                  # Hash router shell & role authorization guards
│   │       ├── index.css                # Enterprise design tokens & tabular numeral styles
│   │       ├── config/api.js            # Base URL resolution & dynamic endpoints
│   │       ├── services/api.js          # Resilient fetch, interceptors, session expiry
│   │       └── components/              # UI components, modals, workspaces, and pages
│   └── server/                          # Centralized Express REST API Server (backend)
│       ├── server.js                    # Server bootstrap, port binding & graceful shutdown
│       ├── package.json                 # Server dependencies, scripts, engines
│       ├── check_mongo.js               # Diagnostic connection script (Atlas + Local)
│       ├── .env.example                 # Backend environment variable template
│       ├── src/
│       │   ├── vercelApp.js             # Express app builder, CORS, Socket.IO configuration
│       │   ├── config/db.js             # Resilient MongoDB connection & local fallback
│       │   ├── middleware/              # JWT auth, role guards, security headers, rate limiters
│       │   ├── models/                  # 27 Mongoose schemas (User, Scholarship, Document, etc.)
│       │   ├── routes/                  # 20 Express route modules
│       │   ├── controllers/             # Business logic controllers
│       │   ├── services/                # Cloudflare R2 storage & Nodemailer email services
│       │   └── utils/                   # Token revocation, OCR parser, logger
│       └── scripts/                     # Security, isolation, and integration test suites
└── mobile/                              # Flutter Student Mobile Client (isko-mobile)
    ├── pubspec.yaml                     # Flutter package dependencies
    ├── .env.example                     # Mobile environment variable template
    ├── android/                         # Android native project & google-services.json
    ├── ios/                             # iOS native project configuration
    ├── lib/                             # Dart application source code
    │   ├── main.dart                    # Application bootstrap & FCM initialization
    │   ├── screens/                     # Student UI screens
    │   ├── services/                    # ApiService, AuthService, PushNotificationService
    │   └── utils/                       # App constants, validators, storage helpers
    └── test/                            # Flutter unit, widget, and multi-scale layout tests
```

---

## 5. Local Setup & Quickstart

### Prerequisites
- **Node.js**: Version 20.x or 24.x LTS (`node -v`)
- **npm**: Version 9.x or higher
- **MongoDB**: Active MongoDB Atlas cluster or local instance running on `mongodb://127.0.0.1:27017`
- **Flutter SDK** (for mobile development): Flutter 3.x / Dart ^3.10.0

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/mmnzcxr7gp-beep/SYNERTECH-ISKOLAR.git
cd SYNERTECH-ISKOLAR

# Configure Backend Environment
cp web/server/.env.example web/server/.env

# Configure Frontend Environment
cp web/client/.env.example web/client/.env

# Configure Mobile Environment
cp mobile/.env.example mobile/.env
```

### Step 2: Install Dependencies & Run Database Check
```bash
# Backend dependencies
cd web/server
npm install

# Test database connectivity
npm run check:mongo

# Frontend dependencies
cd ../client
npm install
```

### Step 3: Run the Development Servers
In separate terminal sessions:

```bash
# Terminal 1: Launch Backend API Server (Port 4000)
cd web/server
npm start

# Terminal 2: Launch Frontend Web Portal (Port 5173)
cd web/client
npm run dev

# Terminal 3: Launch Flutter Mobile Client (Emulator / Device)
cd mobile
flutter pub get
flutter run
```

---

## 6. Environment Variables Reference

### Backend API (`web/server/.env`)
```ini
# Core Configuration
PORT=4000
NODE_ENV=production                       # "development", "test", or "production"
JWT_SECRET=your-random-64-char-hex-secret
JWT_EXPIRES_IN=7d

# MongoDB Database Connection
# Connection format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
MONGO_URI=mongodb+srv://<db_user>:<db_password>@cluster0.bmsc3s6.mongodb.net/iskolar?retryWrites=true&w=majority

# Cloudflare R2 Storage (Private Bucket)
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=iskolar-documents
R2_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_REGION=auto

# Email Delivery (Gmail SMTP with App Password)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-account@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM="ISKOLAR System <your-account@gmail.com>"

# CORS Allowed Origins
CORS_ORIGINS=https://iskolar.vercel.app,https://iskolar.ph,https://iskolar.pages.dev

# Security & Testing Guards
ALLOW_TEST_OVERRIDE=false                 # MUST remain false in production
```

### Frontend Client (`web/client/.env`)
```ini
# Express API Endpoint (empty string in production to utilize same-origin Vercel proxy)
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
VITE_ENV=development
```

### Mobile Client (`mobile/.env`)
```ini
API_BASE_URL=http://10.0.2.2:4000          # Android emulator loopback (use live HTTPS for device)
SOCKET_URL=http://10.0.2.2:4000
ENVIRONMENT=development
```

---

## 7. Cloud Services & Connections Architecture

### Connection Topology
```text
Browser (React Web Desk) ──────┐
                               ├──> [Vercel Edge Proxy] ──> [Render Backend :4000]
Flutter Mobile Client (Android)┘                                     │
                                            ┌────────────────────────┼────────────────────────┐
                                            ▼                        ▼                        ▼
                                    [MongoDB Atlas]          [Cloudflare R2]          [Gmail SMTP]
                                  (27 Collections)          (Private Documents)      (MFA / OTP Email)
```

1. **Frontend Base URL Resolution (`web/client/src/services/api.js`)**:
   - In production on Vercel (`*.vercel.app` or custom domains), base URL resolves to `""` (relative paths). The `vercel.json` reverse proxy rewrites `/api/*` requests directly to `https://iskolar-api.onrender.com/api/*`, eliminating CORS preflight overhead and securing browser communication.
   - In local development, falls back directly to `http://localhost:4000`.

2. **MongoDB Atlas & Local Failover (`web/server/src/config/db.js`)**:
   - Primary connection targets MongoDB Atlas (`cluster0.bmsc3s6.mongodb.net`).
   - If the client workstation IP is not on the Atlas Network Access allowlist (`SSL alert number 80`), the driver logs a warning and transparently falls back to local MongoDB (`mongodb://127.0.0.1:27017/iskolar`).
   - All collections enforce strict unique compound constraints (`idx_applications_scholar_student` on `scholarshipId` + `studentId`) to prevent duplicate submissions under concurrency.

3. **Cloudflare R2 Durable Storage (`web/server/src/services/storageService.js`)**:
   - S3-compatible, zero-egress fee private bucket (`iskolar-documents`).
   - Uploaded student requirements (COR, TOR, Philippine IDs) are stored with private S3 ACLs and never made publicly accessible.
   - Retrieval occurs via authorized Express streaming endpoints (`/api/documents/:id/download`) enforcing JWT verification and document ownership checks.
   - Tested and verified: upload, byte-for-byte SHA-256 hash match, non-overwriting versioning (v1, v2), and clean deletion.

4. **SMTP Email & OTP Verification (`web/server/src/services/emailService.js`)**:
   - Sends cryptographically secure 6-digit OTP codes via Gmail SSL SMTP (`smtp.gmail.com:465`).
   - Codes expire strictly in 5 minutes via MongoDB native TTL index (`expiresAt_1`), are locked after 5 failed attempts, and are immediately deleted upon successful verification.

---

## 8. Verification & Test Commands

### 1. Backend Security & Integration Test Suites
Execute the full backend automated verification suites:

```bash
cd web/server
npm test
```

This runs 7 discrete security and integration suites:
1. `test_document_authenticity_and_ocr.js`: Document authenticity scoring and anti-hallucination verification.
2. `test_sec01_sec02_sec03_remediation.js`: Backdoor removal, server-enforced MFA, and keystore exclusion.
3. `test_sec04_through_sec11_hardening.js`: Transport security, session revocation, schema input validation, and privacy consent.
4. `test_capacity_multi_scholarship_isolation.js`: Atomic slot decrement and scholarship capacity bounds.
5. `test_concurrent_duplicate_submissions.js`: Two-process concurrent submission conflict handling (HTTP 409).
6. `test_concurrency_and_distributed_sessions.js`: Distributed multi-process token revocation and store-outage recovery.
7. `test_master_capstone_connected_workflow.js`: Complete 10-step multi-role lifecycle (register -> discover -> apply -> request info -> resubmit -> schedule -> approve -> in-thread message -> audit log).

### 2. Frontend Production Build & Visual QA Suite
```bash
cd web/client

# Production bundle compilation
npm run build

# End-to-end Puppeteer visual QA & interaction suite (10/10 tests)
node tests/test_homepage_effects.js
```

### 3. Flutter Mobile Client Analysis & Tests
```bash
cd mobile

# Static code analysis
flutter analyze

# Unit and widget test suite (105 tests)
flutter test
```

---

## 9. Production Deployment Guide

### Backend Deployment (Render)
The backend is configured as a persistent Node.js Web Service via `render.yaml`:
- **Repository Root Directory**: `web/server`
- **Runtime**: Node.js 24 LTS (`v24.14.0`)
- **Build Command**: `npm install --omit=dev`
- **Start Command**: `node server.js`
- **Health Check Path**: `/api/health/readiness`
- **Region**: `singapore`
- **Environment Secrets**: Set in Render Dashboard: `MONGO_URI`, `JWT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `EMAIL_USER`, `EMAIL_PASSWORD`.

### Frontend Deployment (Vercel)
The web client is deployed as a Single Page Application:
- **Root Directory**: `web/client`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Configuration (`vercel.json`)**:
  - SPA URL rewrites routing `/(.*)` to `/index.html`
  - API proxy rewrites routing `/api/:match*` to `https://iskolar-api.onrender.com/api/:match*`
  - Strict Content-Security-Policy (CSP) and HSTS headers

### Verified Production Destinations
- **Custom Production Domain**: `https://iskolar.org` (and `https://www.iskolar.org`)
- **Custom Production API**: `https://api.iskolar.org` (or proxied via `https://iskolar.org/api`)
- **Vercel Fallback Portal**: `https://client-gamma-hazel-97.vercel.app` (or `https://iskolar.vercel.app`)
- **Render Direct API**: `https://iskolar-api.onrender.com`

### Custom Domain Setup & DNS Mapping (`iskolar.org`)

#### 1. DNS Records to Configure at Domain Registrar / Cloudflare DNS:
| Type | Host / Name | Target / Destination | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (`iskolar.org`) | `76.76.21.21` | Auto / 300s | Directs apex domain to Vercel Global Edge CDN |
| **CNAME** | `www` (`www.iskolar.org`) | `cname.vercel-dns.com` | Auto / 300s | Directs WWW subdomain to Vercel with automatic redirect |
| **CNAME** | `api` (`api.iskolar.org`) | `iskolar-api.onrender.com` | Auto / 300s | Direct backend routing to Render Web Service |

#### 2. Vercel Dashboard Binding (Frontend):
1. Navigate to **Vercel Dashboard** -> Project `client-gamma-hazel-97` (or `iskolar`) -> **Settings** -> **Domains**.
2. Enter `iskolar.org` and click **Add**.
3. Select the recommended setting to automatically redirect `www.iskolar.org` to `iskolar.org`.
4. Vercel validates DNS propagation and automatically provisions an edge SSL/TLS certificate.

#### 3. Render Dashboard Binding (Backend):
1. Navigate to **Render Dashboard** -> Web Service `iskolar-api` -> **Settings** -> **Custom Domains**.
2. Click **Add Custom Domain** and enter `api.iskolar.org`.
3. Render automatically verifies the CNAME pointing to `iskolar-api.onrender.com` and provisions an SSL certificate.

---

## 10. Operational Recovery & Rollback Procedures

### Thresholds for Emergency Rollback
Trigger rollback immediately if:
- API HTTP 5xx error rate exceeds 2% over 3 consecutive minutes.
- Legitimate users cannot complete authentication, MFA, or registration OTP verification.
- Duplicate applications bypass database unique constraints.
- Backend service enters a crash loop (`CrashLoopBackOff`).

### Backend Rollback Protocol (Render)
1. Navigate to Render Dashboard -> `iskolar-api` -> **Deploys**.
2. Select the previous stable commit release.
3. Click **Rollback to this deploy**.
4. Database schema changes are strictly additive; no database rollback or index dropping is required.
5. Verify health: `curl -i https://iskolar-api.onrender.com/api/health/readiness`.

### Frontend Rollback Protocol (Vercel)
1. Open Vercel Dashboard -> Project -> **Deployments**.
2. Select the previous successful deployment and click **Promote to Production** (Instant Rollback).
3. Invalidate edge cache if custom DNS or Cloudflare CDN is active.

### Mobile Rollback Protocol (Google Play)
1. Open Google Play Console -> Release -> **Production track**.
2. If staged rollout is active, click **Halt Rollout**.
3. If hotfix is required, increment `versionCode` in `mobile/pubspec.yaml`, run `flutter build appbundle --release`, and submit an emergency hotfix build.
4. Server API routes maintain backward compatibility with older client builds.

---

## 11. Known Limitations & Troubleshooting

### Known Limitations
1. **Single-Instance Real-Time WebSockets**: In the absence of an external Redis broker (`REDIS_URL`), the backend must run as a single realtime instance. Horizontal multi-instance socket broadcasting requires configuring `@socket.io/redis-adapter`.
2. **MongoDB Atlas IP Whitelisting**: Connections to MongoDB Atlas fail with `SSL alert number 80` if the host or cloud provider public IP is not added to the Atlas Network Access allowlist (`0.0.0.0/0` or static outbound IPs).
3. **FCM Push Notifications**: Android FCM push requires `FIREBASE_SERVICE_ACCOUNT_JSON` configured in the backend environment. If absent, the backend logs a warning and gracefully degrades without crashing.

### Troubleshooting
| Symptom | Cause | Remediation |
| :--- | :--- | :--- |
| `SSL alert number 80` on startup | Workstation or host IP not in MongoDB Atlas allowlist | Add current public IP or `0.0.0.0/0` in MongoDB Atlas Network Access; server falls back to local MongoDB automatically. |
| Student login blocked on web | Architectural role separation | Intended behavior. Students must use the Flutter mobile application. |
| Document upload fails with 401 | Missing or expired JWT token | Re-authenticate on provider portal or mobile app to refresh the Bearer token. |
| Email OTP code not received | Daily Google App Password quota exceeded or bad credentials | Verify `EMAIL_USER` and `EMAIL_PASSWORD` in `web/server/.env` and test with `node scripts/test_gmail_otp_sender.js`. |
| Port 4000 already in use | Stale Node.js background process | Terminate existing process: `lsof -ti:4000 \| xargs kill -9`. |

---

## 12. Attribution & Copyright

**Created, designed, developed, and maintained by Sam Irian Villaluna · SYNERTECH.**  
*All intellectual property, system architecture, and platform rights reserved.*
