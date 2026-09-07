# ISKOLAR 2.0 — Disaster Recovery & Production Rollback Procedure

**Project**: ISKOLAR 2.0 — Learning Aid and Scholarship Management Platform  
**Team**: SynerTech  
**Date**: September 6, 2026  
**Document Classification**: Operational Recovery Protocol  

---

## 1. Rollback Thresholds & Trigger Criteria

Initiate immediate emergency rollback if any of the following conditions persist for > 3 minutes following deployment:
1. **Elevated Error Rate**: API HTTP 5xx error rate exceeds 2% of total traffic.
2. **Authentication / MFA Failure**: Legitimate users are unable to complete login, OTP verification, or password reset.
3. **Data Loss / State Corruption**: Duplicate applications bypass constraints or slot balances deviate from atomic decrements.
4. **Fatal Crash Loop**: Backend container fails health checks or restarts continuously (`CrashLoopBackOff`).
5. **Security Alert**: Unauthorized administrative or provider privilege escalation detected.

---

## 2. API Backend Rollback Protocol

### Scenario A: Containerized Cloud Deployment (Render / Railway / AWS ECS)

1. **Revert Deployment Revision**:
   - Access the deployment management dashboard.
   - Select the previous stable release artifact / commit tag (e.g. `release-v1.9.8` or commit `835e4d2`).
   - Trigger **Redeploy Previous Version**.
2. **Database Compatibility Check**:
   - Schema modifications in this remediation are strictly additive (new indexes `idx_applications_scholar_student`, `idx_revoked_ttl` and collection `revokedtokens`).
   - The previous code version remains 100% compatible with these additive indexes; no database rollback or index dropping is required.
3. **Verify Restored Service**:
   - Query backend health check:
     ```bash
     curl -i https://api.iskolar.synertech.ph/api/v1/health
     ```
   - Test authentication endpoint with an authoritative test account.

---

## 3. Web Client Rollback Protocol (Vercel / Cloudflare Pages)

1. **Instant Rollback via Hosting Dashboard**:
   - Navigate to Vercel Deployments dashboard.
   - Locate the previous successful production deployment.
   - Click **Instant Rollback** / **Promote to Production**.
2. **CDN Cache Purge**:
   - Clear Cloudflare / edge cache immediately to invalidate cached HTML or JavaScript chunks:
     ```bash
     # If using Cloudflare API
     curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone_id>/purge_cache" \
          -H "Authorization: Bearer <cloudflare_token>" \
          -H "Content-Type: application/json" \
          --data '{"purge_everything":true}'
     ```

---

## 4. Mobile Application Rollback & Mitigation (Google Play / App Store)

Because native mobile client updates cannot be instantaneously undone on user devices once downloaded:

1. **Google Play Console Staged Rollout Halt**:
   - If release was in staged rollout (e.g. 10% or 20%), immediately click **Halt Rollout** in Google Play Console -> Production track.
2. **Emergency Hotfix Patch**:
   - Revert mobile code to previous commit tag:
     ```bash
     git checkout <previous_stable_tag> -- mobile/
     ```
   - Increment `versionCode` in `mobile/pubspec.yaml` (e.g. `version: 1.0.1+2` -> `version: 1.0.2+3`).
   - Build emergency hotfix:
     ```bash
     cd mobile && flutter build appbundle --release
     ```
   - Upload emergency `.aab` to Google Play Console and request expedited review.
3. **Server-Side Backward Compatibility**:
   - Backend routes maintain full backward compatibility for older mobile app builds. Even if mobile rollback is pending on user devices, backend safety validations protect against data corruption.

---

## 5. Database Backup & Point-in-Time Restore (MongoDB Atlas)

1. **Automated Continuous Backups**:
   - MongoDB Atlas provides continuous point-in-time recovery (PITR) with 1-minute granularity for M10+ tiers.
2. **Initiating Point-in-Time Restore**:
   - Open MongoDB Atlas -> Cluster -> **Backup** tab.
   - Select **Point in Time Restore**.
   - Specify the exact timestamp prior to the deployment incident (e.g. `2026-09-06 00:50:00 UTC`).
   - Restore to a dedicated recovery cluster (`iskolar-recovery-temp`).
3. **Data Verification**:
   - Connect to `iskolar-recovery-temp` and verify application, user, and scholarship collections.
   - If full cluster restore is required, update `MONGO_URI` secret in backend environment variables to point to the restored cluster and restart services.
