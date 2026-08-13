const fs = require('fs');
const path = require('path');

const bundlePath = '/Users/samirianvilalaluna/.gemini/antigravity-ide/brain/720c5652-5d67-4618-81fd-60722826fb93/.system_generated/steps/854/content.md';
const content = fs.readFileSync(bundlePath, 'utf8');

// Find all occurrences of localhost:4000
console.log('--- Search for localhost:4000 ---');
let idx = 0;
while (true) {
  idx = content.indexOf('localhost:4000', idx);
  if (idx === -1) break;
  console.log(`Found localhost:4000 at index ${idx}:`);
  console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 100)));
  idx += 14;
}

// Find all occurrences of backend-five-iota
console.log('\n--- Search for backend-five-iota ---');
idx = 0;
while (true) {
  idx = content.indexOf('backend-five-iota', idx);
  if (idx === -1) break;
  console.log(`Found backend-five-iota at index ${idx}:`);
  console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 100)));
  idx += 17;
}
