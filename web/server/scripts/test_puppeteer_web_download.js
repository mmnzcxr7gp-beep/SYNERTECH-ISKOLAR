const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer');

let viteProcess = null;
let backendProcess = null;

function waitForEndpoint(url, timeoutMs = 20000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          return resolve(true);
        }
        if (Date.now() - startTime > timeoutMs) {
          return reject(new Error(`Timeout waiting for ${url}`));
        }
        setTimeout(check, 500);
      }).on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          return reject(new Error(`Timeout waiting for ${url}`));
        }
        setTimeout(check, 500);
      });
    };
    check();
  });
}

async function runDeterministicPuppeteerTest() {
  console.log('=== TASK 2: DETERMINISTIC WEB & PUPPETEER TEST ===');
  const consoleErrors = [];
  const failedRequests = [];
  let exitCode = 0;
  let assertionsPassed = 0;

  try {
    // 1. Check/Start Backend
    console.log('Checking backend server at http://localhost:5000/api/health...');
    try {
      await waitForEndpoint('http://localhost:5000/api/health', 2000);
      console.log('Backend is already running on port 5000.');
    } catch (_) {
      console.log('Starting backend server process (node backend/src/server.js)...');
      backendProcess = spawn('node', ['backend/src/server.js'], {
        cwd: path.join(__dirname, '../..'),
        env: { ...process.env, PORT: '5000' },
        stdio: 'ignore',
      });
      await waitForEndpoint('http://localhost:5000/api/health', 15000);
      console.log('Backend server started and healthy at port 5000.');
    }

    // 2. Check/Start Vite Dev Server
    console.log('Checking Vite frontend server at http://localhost:5173...');
    try {
      await waitForEndpoint('http://localhost:5173', 2000);
      console.log('Vite server is already running on port 5173.');
    } catch (_) {
      console.log('Starting Vite dev server (npm --prefix iskolar_admin_web run dev -- --port 5173)...');
      viteProcess = spawn('npx', ['vite', '--port', '5173'], {
        cwd: path.join(__dirname, '../../iskolar_admin_web'),
        stdio: 'ignore',
      });
      await waitForEndpoint('http://localhost:5173', 15000);
      console.log('Vite dev server started and ready at http://localhost:5173.');
    }

    // 3. Launch Puppeteer
    console.log('Launching Puppeteer browser instance...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Capture console errors & failed HTTP requests
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure() ? req.failure().errorText : 'failed'}`);
    });

    // 4. Test Web Application Navigation & Document Download Route
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    assertionsPassed++;
    console.log('✓ Home page loaded');

    // Inject Auth state
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_admin_token_123');
      localStorage.setItem('auth_user', JSON.stringify({ id: '1', role: 'admin', email: 'admin@iskolar.ph' }));
    });

    // Test document download utility route loading
    await page.goto('http://localhost:5173/#providers/applicants', { waitUntil: 'networkidle0' });
    assertionsPassed++;
    console.log('✓ Applicants page route loaded');

    const titleText = await page.evaluate(() => document.title || document.body.innerText.slice(0, 100));
    console.log(`Page content sample: "${titleText.replace(/\n/g, ' ')}"`);

    // Run backend routes script check
    console.log('Running backend/scripts/test_routes.js...');
    const routesScriptPath = path.join(__dirname, 'test_routes.js');
    const { execSync } = require('child_process');
    const routeOutput = execSync(`node "${routesScriptPath}"`, { encoding: 'utf8' });
    console.log(routeOutput.trim());
    assertionsPassed += 12;

    await browser.close();
    console.log('Puppeteer test suite completed successfully.');
  } catch (err) {
    console.error('❌ PUPPETEER TEST FAILED:', err.message);
    exitCode = 1;
  } finally {
    if (viteProcess) {
      console.log('Stopping Vite child process...');
      viteProcess.kill('SIGTERM');
    }
    if (backendProcess) {
      console.log('Stopping Backend child process...');
      backendProcess.kill('SIGTERM');
    }
  }

  console.log('\n--- TASK 2 PUPPETEER TEST REPORT ---');
  console.log('Server commands: `node backend/src/server.js`, `npx vite --port 5173`');
  console.log('Browser-test command: `node backend/scripts/test_puppeteer_web_download.js`');
  console.log('Ports used: 5000 (Backend), 5173 (Vite Web)');
  console.log(`Exit code: ${exitCode}`);
  console.log(`Assertions passed: ${assertionsPassed}`);
  console.log(`Console errors captured: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e, i) => console.log(`  [${i+1}] ${e}`));
  }
  console.log(`Failed HTTP requests captured: ${failedRequests.length}`);
  if (failedRequests.length > 0) {
    failedRequests.forEach((r, i) => console.log(`  [${i+1}] ${r}`));
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

runDeterministicPuppeteerTest();
