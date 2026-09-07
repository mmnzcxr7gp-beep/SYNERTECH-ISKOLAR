const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING MODAL REACT PORTAL RENDERING TEST');

  const modalPath = path.join(__dirname, '../../client/src/components/AdminAccountDetailModal.jsx');
  const confirmPath = path.join(__dirname, '../../client/src/components/ConfirmationDialog.jsx');

  assert(fs.existsSync(modalPath), 'AdminAccountDetailModal.jsx must exist');
  assert(fs.existsSync(confirmPath), 'ConfirmationDialog.jsx must exist');

  const modalCode = fs.readFileSync(modalPath, 'utf8');
  const confirmCode = fs.readFileSync(confirmPath, 'utf8');

  // Verify createPortal usage to escape parent stacking context
  assert(modalCode.includes('createPortal('), 'AdminAccountDetailModal must use createPortal');
  assert(modalCode.includes('document.body'), 'AdminAccountDetailModal must mount to document.body');

  assert(confirmCode.includes('createPortal('), 'ConfirmationDialog must use createPortal');
  assert(confirmCode.includes('document.body'), 'ConfirmationDialog must mount to document.body');

  console.log('✅ [PASS] test_modal_portal_rendering passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_modal_portal_rendering:', err);
  process.exit(1);
});
