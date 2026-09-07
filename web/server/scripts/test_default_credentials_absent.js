const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startTestServer } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_default_credentials_absent...');
  const env = await startTestServer();

  try {
    // 1. Scan controllers, models, and routes for hardcoded credentials
    const srcDir = path.join(__dirname, '../src');
    const sensitivePatterns = [
      /password\s*===\s*['"]Password123!['"]/i,
      /password\s*===\s*['"]admin123['"]/i,
      /password\s*===\s*['"]password['"]/i,
      /password\s*===\s*['"]12345678['"]/i,
      /password\s*===\s*['"]IskolarPass123!['"]/i,
    ];

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.js') && !entry.name.includes('.test.')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of sensitivePatterns) {
            assert(
              !pattern.test(content),
              `Hardcoded credential pattern ${pattern} found in source file: ${fullPath}`
            );
          }
        }
      }
    }

    scanDir(srcDir);

    console.log('✅ [PASS] test_default_credentials_absent: Zero default/predictable credentials exist in source code');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_default_credentials_absent:', err);
  process.exit(1);
});
