# SYNERTECH ISKOLAR - Authentication & Role Isolation

## Authentication Pipeline

```text
Student Registration:  Form -> Privacy Popup -> Explicit Acceptance -> API Validation -> Email OTP -> OTP Verify -> MFA -> Session
Provider Registration: Form -> Privacy Popup -> Explicit Acceptance -> API Validation -> Email OTP -> OTP Verify -> Admin Approval -> Login -> MFA -> Session
```

## Role Separation Rules
1. **Student Role**:
   - Access limited to Flutter Mobile Application.
   - Accessing React Web Portal returns `HTTP 403 Forbidden` with platform guidance notice.
2. **Provider / Sponsor Role**:
   - Access limited to React Web Portal for their own organization's scope.
   - Attempting mobile access renders `SponsorAdminNoticeScreen`.
3. **Administrator Role**:
   - Web portal access for user management, provider approvals, audit logs, and system settings.

## Security Measures
- **Password Security**: Passwords hashed using `bcrypt` (salt rounds = 10); never logged or exposed in API responses.
- **JWT Tokens**: Signed using `JWT_SECRET` with configurable expiration.
- **OTP Behavior**: Single-use 6-digit verification codes expiring in 10 minutes. Master test OTP (`123456`) is explicitly disabled in non-override environments.
