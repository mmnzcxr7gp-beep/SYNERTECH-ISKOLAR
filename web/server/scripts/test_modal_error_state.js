const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 RUNNING MODAL ERROR STATE HANDLING TEST');

  const modalPath = path.join(__dirname, '../../client/src/components/AdminAccountDetailModal.jsx');
  assert(fs.existsSync(modalPath), 'AdminAccountDetailModal.jsx must exist');
  const code = fs.readFileSync(modalPath, 'utf8');

  // Verify visible error UI with Retry and Close actions
  assert(code.includes('error ?'), 'Component must render error state branch');
  assert(code.includes('Retry Loading'), 'Component must provide Retry Loading action on failure');
  assert(code.includes('Close'), 'Component must provide Close action on failure');
  assert(!code.includes('return null') || code.includes('if (!isOpen) return null'), 'Component must never return null or empty black screen when error occurs');

  console.log('✅ [PASS] test_modal_error_state passed successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_modal_error_state:', err);
  process.exit(1);
});
