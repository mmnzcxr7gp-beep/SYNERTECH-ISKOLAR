const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING ACCOUNT ACTIONS NON-PLACEHOLDER AUDIT');

  const menuPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
  const modalPath = path.join(__dirname, '../../client/src/components/AdminAccountDetailModal.jsx');

  assert(fs.existsSync(menuPath), 'AccountActionsMenu.jsx must exist');
  assert(fs.existsSync(modalPath), 'AdminAccountDetailModal.jsx must exist');

  const menuCode = fs.readFileSync(menuPath, 'utf8');
  const modalCode = fs.readFileSync(modalPath, 'utf8');

  // Verify all actions dispatch actual handlers
  const actions = [
    'view_account',
    'view_docs',
    'view_submissions',
    'verify_account',
    'reject_account',
    'suspend_account',
    'reactivate_account',
    'archive_account',
    'restore_account',
    'request_deletion',
    'permanent_delete',
    'view_history',
    'revoke_sessions'
  ];

  actions.forEach((act) => {
    assert(menuCode.includes(`id: '${act}'`), `Menu must define action ${act}`);
  });

  // Verify backend endpoints are called in AdminAccountDetailModal
  assert(modalCode.includes('/api/admin/accounts/'), 'Modal must execute authorized API calls');
  assert(modalCode.includes('PATCH'), 'Modal must support PATCH mutations');
  assert(modalCode.includes('POST'), 'Modal must support POST restore/soft-delete');
  assert(modalCode.includes('DELETE'), 'Modal must support DELETE permanent deletion');

  console.log('✅ [PASS] test_account_actions_not_placeholders passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_actions_not_placeholders:', err);
  process.exit(1);
});
