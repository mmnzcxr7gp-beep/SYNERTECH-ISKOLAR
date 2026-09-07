const { spawn } = require('child_process');
const path = require('path');

const testFiles = [
  'test_admin_account_directory.js',
  'test_admin_student_verification.js',
  'test_admin_provider_verification.js',
  'test_admin_account_edit.js',
  'test_admin_field_allowlist.js',
  'test_admin_mass_assignment_denial.js',
  'test_admin_account_suspension.js',
  'test_suspended_account_login_denial.js',
  'test_admin_account_reactivation.js',
  'test_admin_account_archival.js',
  'test_admin_account_restore.js',
  'test_admin_deletion_request.js',
  'test_admin_permanent_deletion_mfa.js',
  'test_last_admin_protection.js',
  'test_admin_self_deletion_protection.js',
  'test_cross_role_account_control_denial.js',
  'test_provider_orphan_prevention.js',
  'test_student_history_retention.js',
  'test_account_session_revocation.js',
  'test_account_owner_notification.js',
  'test_admin_account_audit_log.js',
  'test_duplicate_admin_action_idempotency.js',
  'test_concurrent_admin_edit_conflict.js',
  'test_account_restart_persistence.js'
];

async function runTest(file) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, file);
    const proc = spawn('node', [fullPath], { stdio: 'inherit' });
    proc.on('close', (code) => {
      resolve({ file, passed: code === 0, code });
    });
  });
}

async function main() {
  console.log('================================================================');
  console.log('🛡️  RUNNING 24-SUITE ISKOLAR 2.0 ADMIN ACCOUNT CONTROL VERIFICATION');
  console.log('================================================================\n');

  const results = [];
  for (const file of testFiles) {
    const res = await runTest(file);
    results.push(res);
  }

  console.log('\n================================================================');
  console.log('📊 TEST EXECUTION SUMMARY:');
  console.log('================================================================');

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((r, idx) => {
    if (r.passed) {
      passedCount++;
      console.log(`  ✅ [${idx + 1}/24] ${r.file} - PASSED`);
    } else {
      failedCount++;
      console.log(`  ❌ [${idx + 1}/24] ${r.file} - FAILED (exit code ${r.code})`);
    }
  });

  console.log('================================================================');
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test Runner Error:', err);
  process.exit(1);
});
