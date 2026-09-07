const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING ACCOUNT MENU KEYBOARD NAVIGATION TEST');

  const componentPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
  assert(fs.existsSync(componentPath), 'AccountActionsMenu.jsx must exist');
  const code = fs.readFileSync(componentPath, 'utf8');

  // Verify keyboard event handlers
  assert(code.includes("e.key === 'ArrowDown'"), 'Must support ArrowDown navigation');
  assert(code.includes("e.key === 'ArrowUp'"), 'Must support ArrowUp navigation');
  assert(code.includes("e.key === 'Escape'"), 'Must support Escape to close and return focus');
  assert(code.includes("e.key === 'Enter'"), 'Must support Enter to select');
  assert(code.includes("e.key === ' '"), 'Must support Space to select');
  assert(code.includes('triggerRef.current.focus()'), 'Must return focus to trigger button upon close');

  console.log('✅ [PASS] test_account_menu_keyboard passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_menu_keyboard:', err);
  process.exit(1);
});
