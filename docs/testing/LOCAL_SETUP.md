# SYNERTECH ISKOLAR - Local Setup & Development Guide

## Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- Flutter SDK >= 3.10.x
- MongoDB (Local instance or MongoDB Atlas cluster URI)

## Step-by-Step Local Environment Setup

### 1. Express API Backend (`backend`)
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Backend runs on `http://localhost:4000`.

### 2. React Web Portal (`iskolar_admin_web`)
```bash
cd iskolar_admin_web
cp .env.example .env
npm install
npm run dev
```
Web portal runs on `http://localhost:5173`.

### 3. Flutter Student Mobile App (`iskolar_mobile`)
```bash
cd iskolar_mobile
cp .env.example .env
flutter pub get
flutter run
```
Connect Android emulator (`http://10.0.2.2:4000`) or iOS simulator (`http://localhost:4000`).
