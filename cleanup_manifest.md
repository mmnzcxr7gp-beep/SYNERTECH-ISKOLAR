# ISKOLAR 2.0 Repository Cleanup Manifest

## Overview
This manifest documents all candidate duplicate, obsolete, and deprecated files identified during the repository audit, along with their quarantine locations, authoritative replacements, and restoration procedures.

---

## Quarantined / Deprecated Items Register

### 1. `web/client/src/assets/logo.png`
- **Original Path**: `web/client/src/assets/logo.png`
- **Quarantine Path**: `.cleanup-quarantine/web_client_src_assets_logo.png`
- **Reason**: Exact SHA-256 duplicate (578,113 bytes) of `web/client/public/logo.png`.
- **References Checked**: `IskolarLogo.jsx` and all components reference `/logo.png` (served from `public/`). Zero imports of `src/assets/logo.png`.
- **Replacement**: `web/client/public/logo.png` (Authoritative brand asset).
- **Restoration Command**: `cp .cleanup-quarantine/web_client_src_assets_logo.png web/client/src/assets/logo.png`
- **Verification Required**: `npm run build` in `web/client`.

### 2. `web/client/style.css`
- **Original Path**: `web/client/style.css`
- **Quarantine Path**: `.cleanup-quarantine/web_client_style.css`
- **Reason**: Legacy pre-redesign CSS stylesheet with outdated purple color tokens (`#6C63FF`).
- **References Checked**: `main.jsx` exclusively imports `index.css`. Zero references in codebase.
- **Replacement**: `web/client/src/index.css` (Authoritative liquid-glass design system).
- **Restoration Command**: `cp .cleanup-quarantine/web_client_style.css web/client/style.css`
- **Verification Required**: `npm run build` in `web/client`.

### 3. `web/client/src/components/ScholarshipOpportunityCreatePage.jsx`
- **Original Path**: `web/client/src/components/ScholarshipOpportunityCreatePage.jsx`
- **Quarantine Path**: `.cleanup-quarantine/ScholarshipOpportunityCreatePage.jsx`
- **Reason**: Deprecated placeholder stub component.
- **References Checked**: Zero imports in `App.jsx`, `ProviderDashboard.jsx`, or any component.
- **Replacement**: `web/client/src/components/ScholarshipCreatePage.jsx` (Authoritative create page).
- **Restoration Command**: `cp .cleanup-quarantine/ScholarshipOpportunityCreatePage.jsx web/client/src/components/ScholarshipOpportunityCreatePage.jsx`
- **Verification Required**: `npm run build` in `web/client`.

### 4. `mobile/lib/screens/opportunities_browse_screen.dart`
- **Original Path**: `mobile/lib/screens/opportunities_browse_screen.dart`
- **Quarantine Path**: `.cleanup-quarantine/mobile_opportunities_browse_screen.dart`
- **Reason**: Deprecated earlier version of scholarship browsing screen.
- **References Checked**: Unused and unreferenced. `StudentMainShellScreen` imports `browse_scholarships_screen.dart`.
- **Replacement**: `mobile/lib/screens/browse_scholarships_screen.dart` (Authoritative screen).
- **Restoration Command**: `cp .cleanup-quarantine/mobile_opportunities_browse_screen.dart mobile/lib/screens/opportunities_browse_screen.dart`
- **Verification Required**: `flutter analyze` & `flutter test`.

### 5. `mobile/lib/screens/opportunity_details_screen.dart`
- **Original Path**: `mobile/lib/screens/opportunity_details_screen.dart`
- **Quarantine Path**: `.cleanup-quarantine/mobile_opportunity_details_screen.dart`
- **Reason**: Deprecated detail screen only referenced by deprecated `opportunities_browse_screen.dart`.
- **References Checked**: Active code routes exclusively to `scholarship_detail_screen.dart`.
- **Replacement**: `mobile/lib/screens/scholarship_detail_screen.dart` (Authoritative detail screen).
- **Restoration Command**: `cp .cleanup-quarantine/mobile_opportunity_details_screen.dart mobile/lib/screens/opportunity_details_screen.dart`
- **Verification Required**: `flutter analyze` & `flutter test`.

### 6. `mobile/lib/screens/student_profile_dashboard_screen.dart`
- **Original Path**: `mobile/lib/screens/student_profile_dashboard_screen.dart`
- **Quarantine Path**: `.cleanup-quarantine/mobile_student_profile_dashboard_screen.dart`
- **Reason**: Deprecated 1-line wrapper around `ProfileScreen`.
- **References Checked**: Zero references in `mobile/lib/` or `mobile/test/`.
- **Replacement**: `mobile/lib/screens/profile_screen.dart` (Authoritative profile screen).
- **Restoration Command**: `cp .cleanup-quarantine/mobile_student_profile_dashboard_screen.dart mobile/lib/screens/student_profile_dashboard_screen.dart`
- **Verification Required**: `flutter analyze` & `flutter test`.

### 7. `mobile/lib/screens/student_verification_screen.dart` & `student_verification_screen_v2.dart`
- **Original Path**: `mobile/lib/screens/student_verification_screen.dart`, `student_verification_screen_v2.dart`
- **Quarantine Path**: `.cleanup-quarantine/mobile_student_verification_screen.dart`, `mobile_student_verification_screen_v2.dart`
- **Reason**: Deprecated re-export shims.
- **References Checked**: Zero references across codebase and tests.
- **Replacement**: `mobile/lib/screens/student_identity_verification_screen.dart` (Authoritative identity verification screen).
- **Restoration Command**: `cp .cleanup-quarantine/mobile_student_verification_screen.dart mobile/lib/screens/student_verification_screen.dart`
- **Verification Required**: `flutter analyze` & `flutter test`.

### 8. `web/server/admin/` (`app.js`, `index.html`, `style.css`)
- **Original Path**: `web/server/admin/`
- **Quarantine Path**: `.cleanup-quarantine/web_server_admin/`
- **Reason**: Incomplete, truncated static admin mockup files not served by Express.
- **References Checked**: Zero static middleware or route handlers reference `web/server/admin/`. React web client handles all admin/provider views.
- **Replacement**: React Provider & Admin Workspace in `web/client/src/components/ProviderDashboard.jsx`.
- **Restoration Command**: `cp -r .cleanup-quarantine/web_server_admin web/server/admin`
- **Verification Required**: Full backend regression suite (`node scripts/run_all_tests.js`).

---

## Authoritative Documentation Structure (`docs/`)

Organized into standardized academic subdirectories:
- `docs/architecture/` — System architecture, APIs, data models, privacy, and security specifications.
- `docs/audit/` — Baseline validation, discrepancy registers, and capstone audit reports.
- `docs/testing/` — Testing instruments, local setup guides, and verification scripts.
- `docs/evidence/` — Photographic test execution evidence package and screenshot catalogs.
- `docs/reports/` — Deployment readiness, testing instrument reports, and defense checklists.
- `docs/archive/` — Historical manifests and legacy workflow configurations.
