# SYSTEM ARCHITECTURE DOCUMENTATION

**System**: Synertech ISKOLAR Scholarship Application System  
**Version**: 1.0.0 (Production & Defense Ready)  
**Date**: August 1, 2026  

---

## 1. High-Level Architecture Overview

The Synertech ISKOLAR System utilizes a 3-tier architecture with a unified backend and database servicing both the Flutter Mobile App (Students) and the React Web Portal (Providers/Admins).

```
+-----------------------------------+       +------------------------------------+
|   Student Mobile App (Flutter)    |       |   Provider Web Portal (React/Vite) |
|   - Registration / MFA            |       |   - Dashboard / Applicants Table   |
|   - Profile & Document Upload     |       |   - Document Verification          |
|   - OCR Field Review              |       |   - Scholarship Grant Management   |
|   - Status & Schedule Tracking    |       |   - Exam & Interview Scheduling    |
+-----------------+-----------------+       +-----------------+------------------+
                  |                                           |
                  | REST HTTP + WebSockets (Socket.IO)        | REST HTTP + WebSockets
                  v                                           v
+--------------------------------------------------------------------------------+
|                        Node.js / Express Backend API                           |
|  - Auth & Security Middleware (JWT, Rate Limiter, Protected File Access)       |
|  - Application & Document Controller Logic                                     |
|  - Tesseract.js OCR Text Extraction Engine                                     |
|  - Real-time Event Broadcaster (Socket.IO) & FCM Push Gateway                  |
+----------------------------------------+---------------------------------------+
                                         |
                                         v
+--------------------------------------------------------------------------------+
|                            Database & Storage Tier                             |
|  - MongoDB Atlas (Mongoose Schemas: User, Student, Provider, Application, etc) |
|  - In-Memory Dual-Persistence Layer (db.data app_state)                        |
|  - Secure Document Storage (/uploads)                                          |
+--------------------------------------------------------------------------------+
```

---

## 2. Component Subsystems

### 2.1 Backend API Service (`backend/`)
- **Port**: `4000`
- **Routing**: Express Router mounting endpoints on `/api/*`
- **Authentication**: JWT Bearer token authentication with role-based authorization (`student`, `provider`, `admin`).
- **Real-Time Layer**: Socket.IO server emitting events to user rooms (`user_{id}`) and administrative rooms (`admin_room`).
- **OCR Engine**: Tesseract.js worker thread running text extraction against uploaded image buffers.

### 2.2 Provider Web Portal (`iskolar_admin_web/`)
- **Port**: `5173` (Vite Dev Server)
- **State & Router**: Hash-based client router (`#admin/applicants`, `#admin/scholarships`, `#providers`).
- **Styling**: TailwindCSS with glassmorphism UI overlay components.

### 2.3 Student Mobile App (`iskolar_mobile/`)
- **Framework**: Flutter 3.x (Android, iOS, Web)
- **State Management**: Provider (`ChangeNotifierProvider`) for theme and authentication state.
- **Networking**: `http` package for REST calls, `socket_io_client` for real-time WebSocket notifications.

---

## 3. Data Flow Workflows

### 3.1 Application Submission Flow
1. Student fills profile & selects a scholarship on Flutter Mobile App.
2. Student uploads required files (`file_0`, `file_1`, etc.).
3. Backend processes files via Multer, generates Tesseract.js OCR extractions, and stores document metadata in `db.data.documents`.
4. Application record is created in `db.data.applications` with status `pending`.
5. Socket.IO emits `new-application` event to provider room; FCM push notification dispatched to provider.

### 3.2 Review & Approval Flow
1. Provider views application on React Web Portal (`ApplicantsPage.jsx`).
2. Provider inspects uploaded documents (`DocumentVerificationPage.jsx`).
3. Provider approves application; API calls `/api/applications/:id/status` with `status: "approved"`.
4. Backend triggers Socket.IO event `application-status-changed`, sends transactional email via Nodemailer/Ethereal, and calls n8n automation webhook.
5. Student receives instant push/WebSocket notification on Flutter Mobile App.
