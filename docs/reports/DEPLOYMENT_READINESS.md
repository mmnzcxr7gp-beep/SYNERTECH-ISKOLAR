# ISKOLAR PRODUCTION DEPLOYMENT-READINESS PACKAGE

---

## 1. Environment Variable Checklist

### Express Backend (`backend/.env`)
| Variable | Description | Production Requirement |
|---|---|---|
| `PORT` | Listening port | Number (e.g. `4000`) |
| `NODE_ENV` | Environment mode | Must be set to `production` |
| `MONGO_URI` | MongoDB connection URI | Must be valid MongoDB Atlas/replica set connection URI (no placeholders) |
| `JWT_SECRET` | Secret key for signing JWT tokens | Random string (min 32 chars, e.g. `openssl rand -hex 32`) |
| `CORS_ORIGINS` | Allowed CORS origins | Comma-separated HTTPS production domain(s) (e.g. `https://iskolar.ph,https://admin.iskolar.ph`) |
| `ALLOW_TEST_OVERRIDE` | Test OTP override flag | Must NOT be set in production (defaults to false) |
| `EMAIL_USER` | SMTP Email address | Valid production SMTP account (e.g. `notifications@iskolar.ph`) |
| `EMAIL_PASSWORD` | SMTP Application Password | Secure application password for SMTP server |
| `N8N_WEBHOOK_URL` | n8n event webhook URL | Webhook endpoint for n8n workflow execution |
| `SENTRY_DSN` | Sentry Error Tracking DSN | Production Sentry DSN key |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase admin JSON | Absolute path to production Firebase service account credentials |

### React Web Portal (`iskolar_admin_web/.env`)
| Variable | Description | Production Requirement |
|---|---|---|
| `VITE_API_URL` | Backend API Base URL | Public HTTPS API endpoint (e.g. `https://api.iskolar.ph`) |
| `VITE_SENTRY_DSN` | Sentry Error Tracking DSN | Production Sentry React DSN key |

---

## 2. Production Build Commands

```bash
# Backend Production Launch
cd backend
npm ci --only=production
NODE_ENV=production node server.js

# React Web Portal Production Build
cd iskolar_admin_web
npm ci
npm run build
# Serve static dist/ using NGINX or Caddy

# Flutter Student Mobile App Build
cd iskolar_mobile
flutter pub get
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

---

## 3. Database Backup & Restore Instructions

```bash
# MongoDB Dump (Backup)
mongodump --uri="mongodb+srv://<REDACTED_URI>/iskolar_prod" --out=/backups/$(date +%F)

# MongoDB Restore
mongorestore --uri="mongodb+srv://<REDACTED_URI>/iskolar_prod" /backups/2026-08-12/iskolar_prod
```

---

## 4. Persistent Storage Requirement
- Local disk storage (`/uploads/`) is suitable only for single-node local/staging operation.
- For production multi-node load balanced environments, configure object storage using `storageService.js` abstraction (AWS S3, Cloudflare R2, or Google Cloud Storage).

---

## 5. Security & Infrastructure Checklists

### CORS Checklist
- [x] Restrict `CORS_ORIGINS` to trusted HTTPS production domains.
- [x] Disable wildcard origin (`*`) in production.

### HTTPS Requirement
- [x] Enforce TLS 1.3 / HTTPS across all HTTP and WebSocket connections.
- [x] Set HSTS headers (`Strict-Transport-Security`).

### Health Check Endpoint
- Lightweight liveness: `GET /api/health`
- Deep infrastructure health: `GET /api/health/deep`
- System services status: `GET /api/admin/system-health`

### Rollback Checklist
1. Revert Git release tag to previous stable commit.
2. Redeploy frontend `dist/` bundle to CDN/Nginx.
3. Restart Node server with previous version image.
4. Execute Mongo schema rollback migration if index changes occurred.
