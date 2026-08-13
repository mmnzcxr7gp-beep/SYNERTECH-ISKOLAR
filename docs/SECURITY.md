# SYNERTECH ISKOLAR - Security & Hardening Documentation

## Security Architecture Highlights
1. **Role-Based & Object-Level Access Control**: Enforces role restrictions (`student`, `sponsor`, `admin`) via `roleMiddleware.js` and document ownership via object-level checks.
2. **Path Traversal Defense**: All document download requests validate filename patterns against null bytes, parent path navigations (`../`, `..%2f`), and absolute filesystem paths.
3. **HTTP Security Headers**: Powered by `helmet` and custom `securityHeaders` middleware.
4. **Rate Limiting**: Configured endpoint limiters for `/api/auth/login`, `/api/auth/send-otp`, `/api/auth/register`, `/api/ocr/extract`, and `/uploads/`.
5. **No Secret Exposure**: All credentials managed through `.env.example` templates; sensitive keys excluded from version control via `.gitignore`.
