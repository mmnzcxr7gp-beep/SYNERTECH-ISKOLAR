const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  const menuComponentPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
  assert(fs.existsSync(menuComponentPath), 'AccountActionsMenu.jsx must exist');
  const code = fs.readFileSync(menuComponentPath, 'utf8');

  // Verify Escape key handling
  assert(code.includes("e.key === 'Escape'"), 'Must handle Escape key to close menu');

  // Verify ArrowDown and ArrowUp navigation
  assert(code.includes("e.key === 'ArrowDown'"), 'Must handle ArrowDown key');
  assert(code.includes("e.key === 'ArrowUp'"), 'Must handle ArrowUp key');

  // Verify Enter and Space trigger handling
  assert(code.includes("e.key === 'Enter'") && code.includes("e.key === ' '"), 'Must handle Enter and Space to open menu and execute action');

  // Verify focus return logic
  assert(code.includes('triggerRef.current.focus()'), 'Must return focus to trigger after closing or action execution');

  // Verify outside click handling
  assert(code.includes('mousedown') && code.includes('touchstart'), 'Must attach outside click listeners for mouse and touch');

  console.log('✅ [PASS] test_account_action_menu_keyboard passed successfully');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_account_action_menu_keyboard:', err);
  process.exit(1);
});
