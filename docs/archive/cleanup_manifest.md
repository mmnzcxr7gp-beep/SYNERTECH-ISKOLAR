# SYNERTECH ISKOLAR - Physical Restructuring & Cleanup Manifest

## 1. Physical Structural Migration Map
- `iskolar_admin_web` / `iskolar-web/client` -> `web/client/`
- `backend` / `iskolar-web/server` -> `web/server/`
- `iskolar_mobile` / `iskolar-mobile` -> `mobile/`
- Documentation -> `docs/`
- Test Fixtures -> `tests/fixtures/`
- Legacy Demo Assets -> `../SYNERTECH-ISKOLAR-quarantine/` (Outside workspace)

## 2. Documentation Inventory & Categorization
- `docs/ARCHITECTURE.md`: KEEP (Canonical architecture specs)
- `docs/API.md`: KEEP (Canonical API reference)
- `docs/AUTHENTICATION.md`: KEEP (Canonical auth & role separation documentation)
- `docs/OCR_AND_DOCUMENT_CHECKING.md`: KEEP (Canonical OCR workflow and human review boundaries)
- `docs/PRIVACY.md`: KEEP (Canonical Data Privacy Act rules and consent flow)
- `docs/SECURITY.md`: KEEP (Canonical security hardening and path traversal defenses)
- `docs/TESTING.md`: KEEP (Canonical test execution guide)
- `docs/LOCAL_SETUP.md`: KEEP (Canonical developer installation instructions)
- `docs/DEPLOYMENT_READINESS.md`: KEEP (Canonical deployment audit specs)
- `capstone_audit_report.md`: ARCHIVE / OBSOLETE (Agent progress reports isolated)

## 3. Quarantine Location & Restore Path
- Location: `/Users/samirianvilalaluna/Downloads/SYNERTECH-ISKOLAR-quarantine/`
- Subfolders: `unused_react/`, `unused_backend/`, `outdated_docs/`
- Restore Manifest: `/Users/samirianvilalaluna/Downloads/SYNERTECH-ISKOLAR-quarantine/RESTORE.md`

## 4. Empirical Test Verification
- Role Separation: 22/22 PASSED
- E2E Integration: 60/60 PASSED
- Document Authorization: 18/18 PASSED
- OCR & Socket.IO Room Isolation: 10/10 PASSED
- React Production Build: Built in 5.76s (0 errors)
- Flutter Analyze: No issues found (0 warnings, 0 errors)
- Flutter Unit & Widget Tests: 9/9 PASSED
