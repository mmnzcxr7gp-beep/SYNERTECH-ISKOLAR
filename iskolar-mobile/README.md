# ISKOLAR Student Mobile Application (`isko-mobile`)

## Project Purpose
The **ISKOLAR Mobile Application** is built exclusively for **Students**. It provides an intuitive, mobile-first interface for discovering scholarships, submitting applications, uploading required documents, reviewing extracted OCR data, tracking application timelines, receiving real-time interview/exam schedules, and managing student profiles.

## Supported Roles
- **Students**: Complete student onboarding, registration, email OTP verification, identity verification, scholarship browsing, document upload with OCR confirmation, status tracking, and schedule notifications.
- *Note*: **Provider and Administrator operations are strictly excluded.** Attempting to log in with sponsor or admin credentials displays a guidance screen directing the user to the React Web Portal.

## Architecture
- **Framework**: Flutter 3.x / Dart SDK ^3.10.0
- **State & Theme**: Material 3 Design, Provider pattern, custom glassmorphism widgets.
- **Backend Connection**: HTTP REST API (`http://10.0.2.2:4000` on Android emulator / `http://localhost:4000` on iOS simulator).
- **Database**: Connects to the authoritative MongoDB database via the shared Express server.
- **Real-Time Updates**: Socket.IO client (`socket_io_client`) for push notifications on status updates, document corrections, and schedules.

## Directory Structure
```text
isko-mobile/
├── android/            # Android native project configuration
├── ios/                # iOS native project configuration
├── assets/             # Images, icons, and static assets
├── lib/
│   ├── config/         # API endpoints and constant definitions
│   ├── models/         # User, Scholarship, Application, Document Dart models
│   ├── screens/        # Student screens (Home, Discovery, Status, Upload, Profile)
│   ├── services/       # ApiService, AuthService, SocketIoService, OcrService
│   ├── theme/          # ISKOLAR theme definitions and color tokens
│   ├── utils/          # Storage helpers and validators
│   └── widgets/        # Reusable UI widgets (GlassCard, VerificationBadge, Buttons)
├── test/               # Flutter unit and widget tests
├── integration_test/   # Flutter end-to-end integration tests
├── .env.example
├── pubspec.yaml
└── README.md
```

## Local Setup & Development
```bash
# Fetch pub dependencies
flutter pub get

# Run static analysis
flutter analyze

# Run unit and widget tests
flutter test

# Run application on emulator or connected device
flutter run
```

## Environment Variables (`.env.example`)
| Variable | Description | Default |
|---|---|---|
| `API_BASE_URL` | Express API Server Endpoint | `http://10.0.2.2:4000` |
| `SOCKET_URL` | Socket.IO Server Endpoint | `http://10.0.2.2:4000` |
| `ENVIRONMENT` | Environment Name | `development` |
| `SENTRY_DSN` | Sentry Mobile Crash Monitoring | Placeholder |

## Security & Privacy Behavior
- **Pre-Registration Privacy Policy**: Mandatory popup modal requires explicit agreement before student registration API submission.
- **Credential Storage**: JWT tokens and account session details stored securely via `shared_preferences`.
- **Protected Uploads**: Files uploaded through multipart endpoints with file size, MIME type, and extension validation on backend.

## Connection Architecture
```text
[Flutter Student App] ──┐
                        ├──> [Express API Server :4000] <──> [MongoDB Database]
[React Provider Portal] ─┘
```
Applications created in the Flutter app appear immediately on the provider web portal under the exact same MongoDB application ID. Provider decisions and schedule updates trigger real-time Socket.IO events delivered directly to the mobile app.
