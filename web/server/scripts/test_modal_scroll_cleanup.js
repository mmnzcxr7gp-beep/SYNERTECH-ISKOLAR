const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING BODY SCROLL LOCK & CLEANUP TEST');

  const modalPath = path.join(__dirname, '../../client/src/components/AdminAccountDetailModal.jsx');
  const confirmPath = path.join(__dirname, '../../client/src/components/ConfirmationDialog.jsx');

  assert(fs.existsSync(modalPath), 'AdminAccountDetailModal.jsx must exist');
  assert(fs.existsSync(confirmPath), 'ConfirmationDialog.jsx must exist');

  const modalCode = fs.readFileSync(modalPath, 'utf8');
  const confirmCode = fs.readFileSync(confirmPath, 'utf8');

  // Verify body scroll lock on mount and restoration on unmount/close
  assert(modalCode.includes("document.body.style.overflow = 'hidden'"), 'Modal must lock body scroll when opened');
  assert(modalCode.includes("document.body.style.overflow = ''"), 'Modal must restore body scroll when closed');

  assert(confirmCode.includes("document.body.style.overflow = 'hidden'"), 'ConfirmationDialog must lock body scroll when opened');
  assert(confirmCode.includes("document.body.style.overflow = ''"), 'ConfirmationDialog must restore body scroll when closed');

  console.log('✅ [PASS] test_modal_scroll_cleanup passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_modal_scroll_cleanup:', err);
  process.exit(1);
});
