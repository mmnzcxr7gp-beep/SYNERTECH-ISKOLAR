#!/usr/bin/env node
/**
 * ISKOLAR Role Separation & Platform Restriction Suite (Root Runner)
 */
const path = require('path');
const targetScript = path.join(__dirname, '../web/server/scripts/test_role_separation.js');

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
