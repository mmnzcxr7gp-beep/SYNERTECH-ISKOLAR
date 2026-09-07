/**
 * run_all_connectivity_audit_tests.js
 * Master Test Execution Suite for ISKOLAR 2.0 Complete Connectivity & Workflow Audit
 */

const { spawnSync } = require('child_process');
const path = require('path');

const testSuites = [
  { id: 1, name: 'test_three_role_file_upload.js', desc: 'Three-Role Upload Permissions (Student/Provider/Admin)' },
  { id: 2, name: 'test_three_role_file_view.js', desc: 'Three-Role File Viewing Authorization & Download' },
  { id: 3, name: 'test_cross_student_file_denial.js', desc: 'Cross-Student File Access Denial (403 Forbidden)' },
  { id: 4, name: 'test_cross_provider_file_denial.js', desc: 'Cross-Provider Document Isolation (403 Forbidden)' },
  { id: 5, name: 'test_admin_file_audit.js', desc: 'Administrator File Access Audit Record Generation' },
  { id: 6, name: 'test_multipart_contract.js', desc: 'Multipart Contracts, MIME & Magic Bytes Validation' },
  { id: 7, name: 'test_r2_upload_and_retrieval.js', desc: 'Storage / R2 Upload, Privacy & Cryptographic Hash Integrity' },
  { id: 8, name: 'test_r2_ocr_pipeline.js', desc: 'Storage-to-OCR Pipeline, Field Mapping & Fallback Trigger' },
  { id: 9, name: 'test_document_versioning.js', desc: 'Document Versioning (v1 & v2 Dual Preservation)' },
  { id: 10, name: 'test_orphan_cleanup.js', desc: 'Orphan File Cleanup & Rollback on Transaction Failures' },
  { id: 11, name: 'test_otp_security.js', desc: 'Cryptographic OTP Generation, Expiration & Lockout Limits' },
  { id: 12, name: 'test_mfa_bypass.js', desc: 'MFA Intermediate Token Isolation & Bypass Prevention' },
  { id: 13, name: 'test_notification_persistence.js', desc: 'Notification Persistence & Read State Schema' },
  { id: 14, name: 'test_notification_authorization.js', desc: 'Notification Tenant Isolation & Deep-Link Authorization' },
  { id: 15, name: 'test_socket_recovery.js', desc: 'Offline/Reconnection Socket Missed Notification Recovery' },
  { id: 16, name: 'test_complete_three_role_workflow.js', desc: 'End-to-End Three-Role Complete Connected Workflow' },
  { id: 17, name: 'test_restart_persistence.js', desc: 'Entity State Survival Across Server & Database Restarts' },
];

async function runAll() {
  console.log('================================================================');
  console.log('🛡️  ISKOLAR 2.0 CONNECTIVITY, AUDIT & SECURITY MASTER SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const suite of testSuites) {
    const scriptPath = path.join(__dirname, suite.name);
    const start = Date.now();
    const proc = spawnSync(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test', ALLOW_TEST_OVERRIDE: 'true' },
      encoding: 'utf8',
    });
    const duration = Date.now() - start;

    if (proc.status === 0) {
      passed++;
      results.push({ name: suite.name, desc: suite.desc, status: 'PASS', duration });
      console.log(`  ✅ [PASS] (${duration}ms) ${suite.name} - ${suite.desc}`);
    } else {
      failed++;
      results.push({ name: suite.name, desc: suite.desc, status: 'FAIL', duration, error: proc.stderr || proc.stdout });
      console.error(`  ❌ [FAIL] (${duration}ms) ${suite.name} - ${suite.desc}`);
      if (proc.stdout) console.log(proc.stdout.trim());
      if (proc.stderr) console.error(proc.stderr.trim());
    }
  }

  console.log('\n================================================================');
  console.log(`🎓 MASTER AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${testSuites.length})`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runAll();
