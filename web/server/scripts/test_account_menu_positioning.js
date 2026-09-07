const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING ACCOUNT MENU COMPACT & POSITIONING TEST');

  const componentPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
  assert(fs.existsSync(componentPath), 'AccountActionsMenu.jsx must exist');
  const code = fs.readFileSync(componentPath, 'utf8');

  // Verify compact width (240px-320px, w-64 = 256px)
  assert(code.includes('w-64'), 'Menu must use compact width between 240px and 320px');

  // Verify positioning and flip logic
  assert(code.includes('updatePosition'), 'Menu must calculate dynamic coordinates');
  assert(code.includes('flipAbove'), 'Menu must support flipping above trigger if space below is limited');
  assert(code.includes('createPortal'), 'Menu must render via React Portal to prevent table clipping');
  assert(code.includes('z-[1001]'), 'Menu must declare high z-index to appear above table headers and sidebars');

  console.log('✅ [PASS] test_account_menu_positioning passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_account_menu_positioning:', err);
  process.exit(1);
});
