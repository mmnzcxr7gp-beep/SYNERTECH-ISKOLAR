const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🧪 Running test_report_secret_redaction...');

  const docsDir = path.join(__dirname, '../../../docs');
  const sensitivePatterns = [
    /Password123!/i,
    /mongodb\+srv:\/\/[^:]+:[^@]+@/i,
    /cfat_[a-zA-Z0-9_-]{20,}/i,
    /cfb7c976b350be701314ec1fdc77ab5fe2ed6898a31bd6c33aeb92b5ace9f141/i,
    /a8b2141aa0b295c357cbb85537541f25/i,
  ];

  let inspectedFiles = 0;

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.md')) {
        inspectedFiles++;
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of sensitivePatterns) {
          assert(
            !pattern.test(content),
            `Unredacted secret pattern ${pattern} found in documentation/report file: ${fullPath}`
          );
        }
      }
    }
  }

  scanDirectory(docsDir);

  console.log(`📊 Inspected ${inspectedFiles} documentation/report file(s).`);
  console.log('✅ [PASS] test_report_secret_redaction: All public reports and documentation are free of raw secrets');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_report_secret_redaction:', err);
  process.exit(1);
});
