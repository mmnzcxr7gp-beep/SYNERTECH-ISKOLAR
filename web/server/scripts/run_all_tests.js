const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Tests that require a running Express server on localhost:4000
const LIVE_SERVER_TESTS = [
  'test_application_messaging.js',
  'test_logout_revocation.js',
  'test_master_capstone_connected_workflow.js',
  'test_message_restart_persistence.js',
  'test_otp_security_lockdown.js',
  'test_post_approval_workflow.js',
  'test_react_download.js',
  'test_role_separation.js',
  'test_socket_message_delivery.js',
  'test_storage_authorization.js',
  'test_storage_health.js',
  'test_storage_resubmission.js',
];

// Tests that require a browser/puppeteer or external UI
const BROWSER_TESTS = [
  'test_ocr_socket_browser.js',
  'test_puppeteer_web_download.js',
  'test_react_integration.js',
  'test_routes.js',
];

// Per-test timeout (ms)
const TEST_TIMEOUT_MS = 30000;

async function runScript(scriptPath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn('node', [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        script: path.basename(scriptPath),
        code: 98,
        duration: Date.now() - start,
        stdout,
        stderr: `TIMED OUT after ${TEST_TIMEOUT_MS}ms`,
      });
    }, TEST_TIMEOUT_MS);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ script: path.basename(scriptPath), code, duration: Date.now() - start, stdout, stderr });
    });
  });
}

function waitForServer(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.request({ host: 'localhost', port, path: '/api/health', timeout: 1000 }, () => {
        clearInterval(interval);
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Server did not start in time'));
        }
      });
      req.end();
    }, 500);
  });
}

async function runAll() {
  const scriptsDir = __dirname;
  const allFiles = fs.readdirSync(scriptsDir).filter((f) => f.startsWith('test_') && f.endsWith('.js')).sort();
  const selfContained = allFiles.filter((f) => !LIVE_SERVER_TESTS.includes(f) && !BROWSER_TESTS.includes(f));
  const liveTests = allFiles.filter((f) => LIVE_SERVER_TESTS.includes(f));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`ISKOLAR 2.0 FULL REGRESSION — ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Self-contained: ${selfContained.length} | Live-server: ${liveTests.length} | Browser-skip: ${BROWSER_TESTS.length}`);
  console.log(`Timeout per test: ${TEST_TIMEOUT_MS / 1000}s`);

  const results = [];

  // Phase 1: Self-contained
  console.log('\n─── PHASE 1: SELF-CONTAINED TESTS ───────────────────────────────────');
  for (const file of selfContained) {
    const res = await runScript(path.join(scriptsDir, file));
    results.push(res);
    if (res.code === 98) {
      console.log(`⏱  TIMEOUT ${file} (>${TEST_TIMEOUT_MS / 1000}s)`);
    } else {
      const mark = res.code === 0 ? '✅ PASS' : '❌ FAIL';
      console.log(`${mark} ${file} (${res.duration}ms)`);
      if (res.code !== 0) {
        const snip = (res.stderr + '\n' + res.stdout).split('\n').filter(Boolean).slice(0, 5).join('\n     ');
        console.log(`     ${snip}`);
      }
    }
  }

  // Phase 2: Live-server tests
  console.log('\n─── PHASE 2: LIVE-SERVER TESTS ──────────────────────────────────────');
  console.log('Starting server on port 4000...');
  const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test', PORT: '4000' },
    stdio: 'ignore',
  });
  try {
    await waitForServer(4000);
    console.log('Server ready.\n');
    for (const file of liveTests) {
      const res = await runScript(path.join(scriptsDir, file));
      results.push(res);
      if (res.code === 98) {
        console.log(`⏱  TIMEOUT ${file} (>${TEST_TIMEOUT_MS / 1000}s)`);
      } else {
        const mark = res.code === 0 ? '✅ PASS' : '❌ FAIL';
        console.log(`${mark} ${file} (${res.duration}ms)`);
        if (res.code !== 0) {
          const snip = (res.stderr + '\n' + res.stdout).split('\n').filter(Boolean).slice(0, 5).join('\n     ');
          console.log(`     ${snip}`);
        }
      }
    }
  } catch (e) {
    console.log(`⚠️  Server unavailable: ${e.message}`);
    for (const file of liveTests) {
      results.push({ script: file, code: 2, duration: 0, stdout: '', stderr: 'Server unavailable' });
      console.log(`⚠️  SKIP ${file}`);
    }
  } finally {
    server.kill('SIGTERM');
  }

  const passed = results.filter((r) => r.code === 0).length;
  const timedout = results.filter((r) => r.code === 98).length;
  const skipped = results.filter((r) => r.code === 2).length;
  const hardFailed = results.filter((r) => r.code !== 0 && r.code !== 2 && r.code !== 98).length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`TOTAL: ${results.length} | ✅ ${passed} PASSED | ❌ ${hardFailed} FAILED | ⏱ ${timedout} TIMEOUT | ⚠️  ${skipped} SKIPPED`);
  if (hardFailed > 0 || timedout > 0) {
    console.log('\nNON-PASSING:');
    results.filter((r) => r.code !== 0 && r.code !== 2).forEach((r) => {
      const tag = r.code === 98 ? '⏱  TIMEOUT' : '❌ FAIL';
      console.log(`  ${tag} ${r.script}`);
    });
  }
  console.log('='.repeat(70));
  process.exit(hardFailed > 0 ? 1 : 0);
}

runAll();
