# ISKOLAR Provider & Administrator Web Portal (`isko-web`)

## Project Purpose
The **ISKOLAR Web Application** serves as the authoritative portal for **Scholarship Providers (Sponsors)** and **System Administrators**. It provides tools for scholarship opportunity publishing, document review, applicant selection, interview & exam scheduling, verification, and audit logging.

## Supported Roles
- **Scholarship Providers / Sponsors**: Manage organization profiles, create and edit scholarships, review student applicants, verify documents, request resubmissions, schedule interviews/exams, and issue application decisions.
- **Administrators**: Verify pending provider applications, manage system users, oversee platform scholarships, review audit logs, and configure system settings.
- *Note*: **Student login and registration are strictly excluded from the web portal.** Entering valid student credentials displays a clear redirection notice guiding students to the ISKOLAR Mobile Application.

## Architecture
- **Framework**: React 18 + Vite + TailwindCSS + Framer Motion.
- **Backend API**: Connected to the centralized Express backend API (`http://localhost:4000`).
- **Database**: Reads and writes through the backend to the shared MongoDB database.
- **Real-Time Communication**: Socket.IO client for live applicant updates, schedule changes, and document verification notifications.

## Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- Running ISKOLAR Express Backend on port 4000

## Directory Structure
```text
isko-web/
├── client/ (iskolar_admin_web)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/       # UI components, modals, and page views
│   │   ├── config/           # API and client settings
│   │   ├── contexts/         # React Contexts (Theme, Auth)
│   │   ├── utils/            # Helper functions
│   │   ├── App.jsx           # Main router shell & role guard
│   │   ├── index.css         # Liquid-glass design system CSS
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   ├── package.json
│   └── .env.example
├── server/ (backend)
│   ├── src/
│   │   ├── config/           # MongoDB and Mongoose config
│   │   ├── controllers/      # Auth, scholarship, schedule controllers
│   │   ├── middleware/       # JWT auth, role check, rate limiting
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express API endpoints
│   │   ├── services/         # Storage and notification services
│   │   └── utils/            # Logger, verification helpers
│   ├── scripts/              # Integration and role security tests
│   ├── package.json
│   └── .env.example
├── docs/
└── README.md
```

## Local Setup & Development
```bash
# Install dependencies
npm install

# Setup environment configuration
cp .env.example .env

# Start local development server
npm run dev
```

## Environment Variables (`.env.example`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Express API Base URL | `http://localhost:4000` |
| `VITE_SENTRY_DSN` | Sentry Error Monitoring DSN | Placeholder |
| `VITE_ENV` | Client Environment | `development` |

## Build & Test Commands
```bash
# Test production build compilation
npm run build

# Preview production build
npm run preview
```

## Security & Privacy Behavior
- **Role Isolation**: Strictly blocks student operational sessions on web.
- **Pre-Registration Privacy Policy**: Mandatory modal popup requesting explicit agreement before provider registration submission.
- **Protected File Access**: Document downloads require valid Authorization bearer tokens with object-level authorization.

## Connection Architecture
```text
[Flutter Student App] ──┐
                        ├──> [Express API Server :4000] <──> [MongoDB Database]
[React Provider Portal] ─┘
```
Both clients communicate with the same Express server and MongoDB database to ensure real-time synchronization of applications, schedules, and decisions.
