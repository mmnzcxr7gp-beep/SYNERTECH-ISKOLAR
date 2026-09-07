const { spawn } = require('child_process');
const path = require('path');

const required28Tests = [
  'test_account_transition_matrix.js',
  'test_admin_verify_student_end_to_end.js',
  'test_admin_verify_provider_end_to_end.js',
  'test_verify_duplicate_request.js',
  'test_verify_concurrent_request.js',
  'test_information_request_lifecycle.js',
  'test_rejection_access_denial.js',
  'test_suspend_active_student_session.js',
  'test_suspend_active_provider_session.js',
  'test_reactivation_fresh_login.js',
  'test_edit_field_allowlist.js',
  'test_edit_mass_assignment_denial.js',
  'test_edit_concurrent_conflict.js',
  'test_archive_restore_lifecycle.js',
  'test_deletion_impact_preview.js',
  'test_permanent_deletion_mfa.js',
  'test_last_admin_protection.js',
  'test_admin_self_deletion_protection.js',
  'test_provider_orphan_prevention.js',
  'test_student_history_retention.js',
  'test_all_admin_actions_authorization_matrix.js',
  'test_admin_action_notification_matrix.js',
  'test_admin_action_socket_recovery.js',
  'test_admin_action_multi_device_sync.js',
  'test_admin_action_database_failure.js',
  'test_admin_action_restart_interruption.js',
  'test_admin_action_refresh_persistence.js',
  'test_admin_action_restart_persistence.js'
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
  console.log('🛡️  RUNNING 28 EXHAUSTIVE ISKOLAR 2.0 ADMIN ACCOUNT LIFECYCLE TESTS');
  console.log('================================================================\n');

  const results = [];
  for (let i = 0; i < required28Tests.length; i++) {
    const file = required28Tests[i];
    const res = await runTest(file);
    results.push(res);
  }

  console.log('\n================================================================');
  console.log('📊 28 EXHAUSTIVE ADMIN ACCOUNT LIFECYCLE TEST SUMMARY:');
  console.log('================================================================');
  let passedCount = 0;
  results.forEach((r, idx) => {
    const status = r.passed ? 'PASSED' : 'FAILED';
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} [${idx + 1}/${results.length}] ${r.file} - ${status} (exit code: ${r.code})`);
    if (r.passed) passedCount++;
  });
  console.log('================================================================');
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
  console.log('================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
