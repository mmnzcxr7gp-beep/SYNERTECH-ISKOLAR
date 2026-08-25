# SYSTEM SETUP & LOCAL DEVELOPMENT GUIDE

**System**: Synertech ISKOLAR Scholarship Application System  
**Prerequisites**: Node.js v18+, npm 9+, Flutter SDK 3.x, Git  

---

## 1. Backend API Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env from template
cp .env.example .env

# 4. Configure environment variables in .env:
# MONGO_URI="mongodb+srv://..."
# JWT_SECRET="your-secure-jwt-secret"
# EMAIL_USER="your-gmail-address@gmail.com"
# EMAIL_PASSWORD="your-gmail-app-password"

# 5. Launch development server
npm run dev
# Backend will start on http://localhost:4000
```

---

## 2. Provider Web Portal Setup

```bash
# 1. Navigate to web portal directory
cd iskolar_admin_web

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
# Web Portal will open at http://localhost:5173

# 4. Build for production
npm run build
```

---

## 3. Flutter Mobile App Setup

```bash
# 1. Navigate to mobile directory
cd iskolar_mobile

# 2. Fetch Flutter package dependencies
flutter pub get

# 3. Launch on connected Android/iOS emulator or Chrome web
flutter run

# 4. Build Android APK
flutter build apk --release
```

---

## 4. Environment Variables Checklist (`backend/.env`)

- `PORT`: API port (default `4000`)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for signing JWT tokens
- `EMAIL_USER`: Transactional Gmail account
- `EMAIL_PASSWORD`: Gmail App Password (2FA enabled)
- `CORS_ORIGINS`: Allowed origins (e.g. `http://localhost:5173`)
- `ALLOW_TEST_OVERRIDE`: Set `true` ONLY in test environments to enable test OTP codes
