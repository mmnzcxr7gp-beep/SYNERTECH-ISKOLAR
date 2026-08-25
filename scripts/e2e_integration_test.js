#!/usr/bin/env node
/**
 * ISKOLAR End-to-End Integration Suite (Root Runner)
 */
const path = require('path');
const targetScript = path.join(__dirname, '../web/server/scripts/e2e_integration_test.js');

const { spawn } = require('child_process');
const child = spawn('node', [targetScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TEST_BASE_URL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4000',
  },
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
