/**
 * MASTER RUNNER: Account Management, Verification, Manual Document Review & Oversight Test Suite
 * Executes all 27 specialized tests sequentially and reports an authoritative status.
 */

const { execSync } = require('child_process');
const path = require('path');

const ACCOUNT_TESTS = [
  'test_student_account_verification.js',
  'test_provider_account_verification.js',
  'test_admin_account_verification_authorization.js',
  'test_account_rejection_reason.js',
  'test_account_suspension.js',
  'test_account_reactivation.js',
  'test_account_soft_deletion.js',
  'test_account_deletion_mfa.js',
  'test_account_restore.js',
  'test_last_admin_protection.js',
  'test_cross_role_account_deletion_denial.js',
  'test_account_action_audit.js',
  'test_account_owner_notification.js',
  'test_deleted_account_session_revocation.js',
  'test_account_deletion_restart_persistence.js',
];

const SUBMISSION_AND_REVIEW_TESTS = [
  'test_application_submission_completion.js',
  'test_submission_notification.js',
  'test_ocr_failure_preserves_file.js',
  'test_low_confidence_manual_review.js',
  'test_provider_manual_file_review.js',
  'test_admin_document_visibility.js',
  'test_admin_document_access_audit.js',
  'test_cross_student_file_denial.js',
  'test_cross_provider_file_denial.js',
  'test_original_file_immutability.js',
  'test_manual_review_notifications.js',
  'test_manual_review_restart_persistence.js',
];

const ALL_TESTS = [...ACCOUNT_TESTS, ...SUBMISSION_AND_REVIEW_TESTS];

async function runAll() {
  console.log('================================================================');
  console.log('🚀 ISKOLAR MASTER ACCOUNT MANAGEMENT & MANUAL REVIEW TEST RUNNER');
  console.log(`📋 Total Test Suites: ${ALL_TESTS.length}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < ALL_TESTS.length; i++) {
    const testFile = ALL_TESTS[i];
    const fullPath = path.join(__dirname, testFile);
    const label = `[${i + 1}/${ALL_TESTS.length}] ${testFile}`;

    process.stdout.write(`⏳ Running ${label}... `);
    const start = Date.now();

    try {
      execSync(`node "${fullPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test', ALLOW_TEST_OVERRIDE: 'true' },
      });
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`✅ PASSED (${duration}s)`);
      passed++;
      results.push({ test: testFile, status: 'PASSED', duration: `${duration}s` });
    } catch (err) {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`❌ FAILED (${duration}s)`);
      if (err.stdout) console.log(err.stdout.toString());
      if (err.stderr) console.error(err.stderr.toString());
      if (!err.stdout && !err.stderr) console.error(err.message);
      failed++;
      results.push({ test: testFile, status: 'FAILED', duration: `${duration}s` });
    }
  }

  console.log('\n================================================================');
  console.log(`📊 MASTER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${ALL_TESTS.length})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAll();
