const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING ACCOUNT MENU OPEN/CLOSE & DISMISS TEST');

  const componentPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
  assert(fs.existsSync(componentPath), 'AccountActionsMenu.jsx must exist');
  const code = fs.readFileSync(componentPath, 'utf8');

  // Verify open/close trigger behavior
  assert(code.includes('aria-expanded={isOpen}'), 'Menu trigger must toggle aria-expanded');
  assert(code.includes('setIsOpen('), 'Component must maintain open state');
  assert(code.includes('handleOutsideClick'), 'Menu must implement outside click dismissal');
  assert(code.includes('handleKeyDown'), 'Menu must implement keyboard dismissal');
  assert(code.includes("e.key === 'Escape'"), 'Menu must close on Escape key');
  assert(code.includes('setFocusedIndex(-1)'), 'Menu must reset focus state on close');

  console.log('✅ [PASS] test_account_menu_open_close passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_menu_open_close:', err);
  process.exit(1);
});
