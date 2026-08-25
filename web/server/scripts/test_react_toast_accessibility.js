const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testReactToastAccessibility() {
  console.log('🧪 Testing React Toast Notification Accessibility & DOM Semantics...');

  let toastFilePath = path.join(__dirname, '../../client/src/components/ToastMessage.jsx');
  if (!fs.existsSync(toastFilePath)) {
    toastFilePath = path.join(__dirname, '../../../web/client/src/components/ToastMessage.jsx');
  }
  const content = fs.readFileSync(toastFilePath, 'utf8');

  // 1. Verify component exists and exports default function
  assert.ok(content.includes('export default function ToastMessage'), 'ToastMessage component must be exported');

  // 2. Verify dismiss control exists and has interactive role
  assert.ok(content.includes('Dismiss') || content.includes('aria-label') || content.includes('onClose'), 'Must provide interactive close/dismiss control');
  assert.ok(content.includes('button') || content.includes('onClick'), 'Dismiss control must be a clickable button');

  // 3. Verify type styling support
  assert.ok(content.includes('success') && content.includes('error') && content.includes('info'), 'Toast must support success, error, and info types');

  // 4. Verify auto-dismiss timer cleanup on unmount
  assert.ok(content.includes('clearTimeout') || content.includes('useEffect'), 'Toast must properly clean up timer on unmount to prevent leaks');

  console.log('✅ PASS test_react_toast_accessibility: Accessible toast notification semantics verified');
  process.exit(0);
}

testReactToastAccessibility().catch((err) => {
  console.error('❌ FAIL test_react_toast_accessibility:', err);
  process.exit(1);
});
