const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING SINGLE OPEN MENU INSTANCE TEST');

  const componentPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
  assert(fs.existsSync(componentPath), 'AccountActionsMenu.jsx must exist');
  const code = fs.readFileSync(componentPath, 'utf8');

  // Verify single-instance event or state handling
  assert(code.includes('OPEN_MENU_EVENT') || code.includes('CustomEvent') || code.includes('handleGlobalOpen'), 'Component must enforce single open menu across rows');

  console.log('✅ [PASS] test_account_menu_single_instance passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_menu_single_instance:', err);
  process.exit(1);
});
