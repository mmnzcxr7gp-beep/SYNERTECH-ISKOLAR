# ISKOLAR 2.0 — Production Deployment & Operations Architecture Guide

**Project**: ISKOLAR 2.0 — Learning Aid and Scholarship Management Platform  
**Team**: SynerTech  
**Date**: September 6, 2026  
**Document Classification**: Engineering Operations Guide  

---

## 1. System Architecture & Component Inventory

ISKOLAR 2.0 is comprised of three core deployment targets:

1. **Backend API Service (`web/server`)**:
   - **Runtime**: Node.js 24 LTS (v24.14.0+, Active Maintenance LTS)
   - **Framework**: Express.js with Socket.IO real-time engine
   - **Database**: MongoDB Atlas v6.0+ (M10+ recommended for production with replica set support)
   - **Session & Invalidation Engine**: Native MongoDB TTL indexed collections (`revokedtokens`) with change stream distributed socket invalidation
   - **Real-Time Scaling Constraint**: If `REDIS_URL` is NOT configured, deployment MUST be strictly restricted to **ONE (1) realtime backend instance**. Cross-instance realtime push events and immediate socket disconnect require a shared Socket.IO Redis adapter (`@socket.io/redis-adapter`). Running multiple instances without Redis will result in partitioned socket rooms and is a release blocker for horizontal scaling.
   - **Primary Concrete Target**: **Render Web Service (`render.yaml`)** in region `singapore` with persistent Node.js runtime, native WebSocket support, and long-running worker capability.
   - *Alternative Targets*: AWS ECS Fargate, Railway, or Google Cloud Run with session affinity enabled.
   - *Hosting Notice on Serverless (e.g. Vercel Serverless)*: Serverless functions have execution timeout limits (10s–60s) and do not support long-lived stateful WebSocket connections or multi-instance Change Stream listeners without external broker infrastructure (e.g. Redis adapter). The persistent Render runtime defined in `render.yaml` is the canonical production deployment target for the API.

2. **Web Management Portal (`web/client`)**:
   - **Runtime / Framework**: React 18 + Vite SPA + Tailwind CSS
   - **Hosting Target**: Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront
   - **Routing / Rewrites**: Requires single-page application (SPA) rewrite rule directing all non-asset routes `/*` to `/index.html`.

3. **Mobile Client (`mobile`)**:
   - **Runtime / Framework**: Flutter 3.x (Dart 3.x)
   - **Platforms**: Android (API level 24 to 34), iOS (iOS 15.0+)
   - **Distribution**: Google Play Store (`.aab` release bundle) and Apple App Store.

---

## 2. Environment Variables & Secret Configuration

Configure the following variables in your hosting environment secret store (do not commit to Git):

### 2.1 Backend API Service (`web/server/.env`)

```ini
# Server Core
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://iskolar.synertech.ph
API_PREFIX=/api

# Database
MONGO_URI=mongodb+srv://<db_user>:<db_password>@cluster0.bmsc3s6.mongodb.net/iskolar?retryWrites=true&w=majority&appName=Cluster0

# Authentication & Cryptography
JWT_SECRET=super_secure_random_64_character_hex_string_here
JWT_EXPIRES_IN=7d
MFA_ENFORCE_ADMIN=true

# SMTP Mail Delivery
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=<your_sendgrid_api_key>
EMAIL_FROM=no-reply@iskolar.synertech.ph

# Push Notifications (Firebase Admin SDK)
FIREBASE_SERVICE_ACCOUNT_PATH=/etc/secrets/firebase-service-account.json

# Cloudflare R2 Durable Document Storage (Private Bucket)
R2_ACCOUNT_ID=<your_cloudflare_account_id>
R2_ACCESS_KEY_ID=<your_r2_access_key_id>
R2_SECRET_ACCESS_KEY=<your_r2_secret_key>
R2_BUCKET=iskolar-production-documents

# Observability & Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 2.2 Web Client (`web/client/.env.production`)

```ini
VITE_API_URL=https://api.iskolar.synertech.ph
VITE_SOCKET_URL=https://api.iskolar.synertech.ph
```

---

## 3. Step-by-Step Deployment Procedure

### 3.1 Backend Deployment (Render / Railway / Container Host)

1. **Pre-Deployment Checks**:
   - Verify Node.js version: `node -v` (Must be >= 24.0.0, Node.js 24 LTS).
   - Ensure MongoDB Atlas IP access list allows traffic from the production container's outbound IPs.
2. **Build and Start Command**:
   ```bash
   cd web/server
   npm ci --production=false
   # Verify legacy application uniqueness (read-only inventory by default)
   node scripts/migrate_legacy_duplicate_applications.js --mongo-uri="$MONGO_URI"
   # Start production server (auto-runs ensureIndexes and fails closed if unique constraints are violated)
   npm start
   ```
3. **Health Verification**:
   - Query the unauthenticated health endpoint:
     ```bash
     curl -i https://api.iskolar.synertech.ph/api/v1/health
     ```
   - Expect HTTP `200 OK` with JSON: `{"status":"ok"}`. Health endpoint must never expose database connection strings or internal service credentials.

### 3.2 Web Frontend Deployment (Vercel / Cloudflare Pages)

1. **Build Step**:
   ```bash
   cd web/client
   npm ci
   npm run build
   ```
2. **SPA Routing Configuration**:
   Ensure `vercel.json` or hosting rewrite directs all paths to `index.html`:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://api.iskolar.synertech.ph/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
3. **Security Headers**:
   Ensure response headers contain:
   - `Content-Security-Policy`: Restricts scripts, frames, and connect endpoints.
   - `X-Frame-Options: SAMEORIGIN`
   - `X-Content-Type-Options: nosniff`

### 3.3 Flutter Android Release Build

1. **Prerequisite**: Complete owner action for upload key setup as documented in [audit/ISKOLAR_OWNER_ACTIONS.md](audit/ISKOLAR_OWNER_ACTIONS.md).
2. **Clean & Build**:
   ```bash
   cd mobile
   flutter clean
   flutter pub get
   flutter build appbundle --release
   ```
3. **Artifact Location**:
   - Output bundle generated at: `mobile/build/app/outputs/bundle/release/app-release.aab`.
4. **Verification**:
   - Inspect bundle signature using `jarsigner -verify -verbose -certs mobile/build/app/outputs/bundle/release/app-release.aab`.

---

## 4. OCR Resource, Memory & Scaling Requirements

- **Worker Memory**: Tesseract OCR image processing requires at least 1 GB dedicated RAM per worker process.
- **Request Size Limiting**: Express file upload body limit is capped at 10 MB per document to prevent buffer exhaustion attacks.
- **Asynchronous Execution**: In production, heavy multi-page OCR operations should be offloaded to worker queues (e.g. BullMQ / Redis) rather than blocking the main Express event loop.

---

## 5. Socket.IO & WebSocket Instance Coordination

When scaling the backend across more than one instance:
- Configure `@socket.io/redis-adapter` to synchronize WebSocket events, rooms, and broadcast messages across instances.
- Ensure reverse proxy (e.g. Nginx or AWS ALB) enables cookie-based sticky sessions for the HTTP long-polling fallback phase:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_http_version 1.1;
  ```
