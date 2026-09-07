const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING MODAL OVERLAY & Z-INDEX LAYERING TEST');

  const modalPath = path.join(__dirname, '../../client/src/components/AdminAccountDetailModal.jsx');
  const confirmPath = path.join(__dirname, '../../client/src/components/ConfirmationDialog.jsx');

  assert(fs.existsSync(modalPath), 'AdminAccountDetailModal.jsx must exist');
  assert(fs.existsSync(confirmPath), 'ConfirmationDialog.jsx must exist');

  const modalCode = fs.readFileSync(modalPath, 'utf8');
  const confirmCode = fs.readFileSync(confirmPath, 'utf8');

  // Verify proper fixed layering
  assert(modalCode.includes('fixed inset-0'), 'Modal must declare fixed inset-0 overlay');
  assert(modalCode.includes('z-[1000]'), 'Modal backdrop must declare z-index 1000+');
  assert(modalCode.includes('z-[1001]'), 'Modal dialog container must declare higher z-index than backdrop');
  assert(confirmCode.includes('fixed inset-0'), 'ConfirmationDialog must declare fixed inset-0 overlay');

  console.log('✅ [PASS] test_modal_overlay_layering passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_modal_overlay_layering:', err);
  process.exit(1);
});
