/**
 * capture_all_web_routes.js
 * 
 * Generates verified JWTs for real Provider and Admin users,
 * loads them into Chrome via CDP, and captures real live screenshots
 * of every module and workspace view.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(__dirname, '../../..');
const EVIDENCE = path.join(ROOT, 'docs/evidence');
const JWT_SECRET = process.env.JWT_SECRET || 'iskolar_jwt_secret_dev_2026';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

class ChromeClient {
  constructor(port = 9222) {
    this.port = port;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    for (let i = 0; i < 20; i++) {
      try {
        const json = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${this.port}/json/list`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
          }).on('error', reject);
        });
        const page = json.find(p => p.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          this.ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise(resolve => this.ws.on('open', resolve));
          this.ws.on('message', msg => {
            const res = JSON.parse(msg);
            if (res.id && this.callbacks.has(res.id)) {
              const cb = this.callbacks.get(res.id);
              this.callbacks.delete(res.id);
              if (res.error) cb.reject(res.error);
              else cb.resolve(res.result);
            }
          });
          return;
        }
      } catch (e) {
        await sleep(500);
      }
    }
    throw new Error('Could not connect to Chrome DevTools WebSocket');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await sleep(2500);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await sleep(400);
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return res && res.result ? res.result.value : null;
  }

  async captureScreenshot(outputPathJpg) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const tmpPng = '/tmp/cdp_out_' + Date.now() + '.png';
    fs.writeFileSync(tmpPng, Buffer.from(res.data, 'base64'));
    execSync(`sips -s format jpeg "${tmpPng}" --out "${outputPathJpg}"`, { stdio: 'ignore' });
    fs.unlinkSync(tmpPng);
    console.log(`🌐 [Web] Captured: ${path.basename(outputPathJpg)} (${(fs.statSync(outputPathJpg).size / 1024).toFixed(1)} KB)`);
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('================================================================');
  console.log('🚀 CAPTURING REAL PROVIDER & ADMIN WEB PORTAL SCREENS');
  console.log('================================================================\n');

  ensureDir(path.join(EVIDENCE, '03-provider-web'));
  ensureDir(path.join(EVIDENCE, '04-admin-web'));
  ensureDir(path.join(EVIDENCE, '06-ocr-manual-review'));
  ensureDir(path.join(EVIDENCE, '08-scheduling'));

  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:5173/'
  ]);

  await sleep(2000);
  const client = new ChromeClient(9222);
  await client.connect();
  await client.setViewport(1440, 900);

  // ---------------------------------------------------------------------------
  // 1. PROVIDER WORKSPACE CAPTURES
  // ---------------------------------------------------------------------------
  console.log('🏢 1. Capturing Real Provider Workspace Routes...');
  const providerUser = {
    id: 9,
    email: 'gokongwei.brothers@iskolar.ph',
    name: 'Gokongwei Brothers Foundation',
    role: 'provider',
    accountStatus: 'ACTIVE'
  };
  const providerToken = jwt.sign(providerUser, JWT_SECRET, { expiresIn: '1d' });

  await client.navigate('http://localhost:5173/');
  await client.evaluate(`
    localStorage.setItem('auth_token', '${providerToken}');
    localStorage.setItem('provider_token', '${providerToken}');
    localStorage.setItem('auth_user', JSON.stringify(${JSON.stringify(providerUser)}));
  `);

  // Provider Overview
  await client.navigate('http://localhost:5173/#providers');
  await client.captureScreenshot(path.join(EVIDENCE, '03-provider-web/040-provider-web-dashboard-overview.jpg'));

  // Provider Scholarships
  await client.navigate('http://localhost:5173/#providers/scholarships');
  await client.captureScreenshot(path.join(EVIDENCE, '03-provider-web/041-provider-web-scholarships-tab.jpg'));

  // Provider Applicants
  await client.navigate('http://localhost:5173/#providers/applicants');
  await client.captureScreenshot(path.join(EVIDENCE, '03-provider-web/042-provider-web-applicants-queue.jpg'));

  // Provider OCR Verification
  await client.navigate('http://localhost:5173/#providers/verification');
  await client.captureScreenshot(path.join(EVIDENCE, '06-ocr-manual-review/101-provider-ocr-verification-page.jpg'));

  // Provider Scheduling
  await client.navigate('http://localhost:5173/#providers/scheduling');
  await client.captureScreenshot(path.join(EVIDENCE, '08-scheduling/140-provider-scheduling-interviews.jpg'));

  // Provider Reports
  await client.navigate('http://localhost:5173/#providers/reports');
  await client.captureScreenshot(path.join(EVIDENCE, '03-provider-web/043-provider-web-reports.jpg'));

  // Provider Settings
  await client.navigate('http://localhost:5173/#providers/settings');
  await client.captureScreenshot(path.join(EVIDENCE, '03-provider-web/044-provider-web-settings.jpg'));

  // ---------------------------------------------------------------------------
  // 2. ADMINISTRATOR WORKSPACE CAPTURES
  // ---------------------------------------------------------------------------
  console.log('\n🛡️ 2. Capturing Real Administrator Workspace Routes...');
  const adminUser = {
    id: 1,
    email: 'admin@iskolar.ph',
    name: 'System Administrator',
    role: 'admin',
    accountStatus: 'ACTIVE'
  };
  const adminToken = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '1d' });

  await client.navigate('http://localhost:5173/');
  await client.evaluate(`
    localStorage.setItem('auth_token', '${adminToken}');
    localStorage.setItem('admin_token', '${adminToken}');
    localStorage.setItem('auth_user', JSON.stringify(${JSON.stringify(adminUser)}));
  `);

  // Admin Overview
  await client.navigate('http://localhost:5173/#admin');
  await client.captureScreenshot(path.join(EVIDENCE, '04-admin-web/060-admin-web-overview.jpg'));

  // Admin Provider Approvals
  await client.navigate('http://localhost:5173/#admin/approvals');
  await client.captureScreenshot(path.join(EVIDENCE, '04-admin-web/061-admin-web-provider-approvals.jpg'));

  // Admin Students Oversight
  await client.navigate('http://localhost:5173/#admin/students');
  await client.captureScreenshot(path.join(EVIDENCE, '04-admin-web/062-admin-web-students-oversight.jpg'));

  // Admin Audit Logs
  await client.navigate('http://localhost:5173/#admin/audit');
  await client.captureScreenshot(path.join(EVIDENCE, '04-admin-web/063-admin-web-audit-logs.jpg'));

  // Admin System Reports
  await client.navigate('http://localhost:5173/#admin/reports');
  await client.captureScreenshot(path.join(EVIDENCE, '04-admin-web/064-admin-web-system-reports.jpg'));

  // Admin System Settings / Health
  await client.navigate('http://localhost:5173/#admin/settings');
  await client.captureScreenshot(path.join(EVIDENCE, '04-admin-web/065-admin-web-system-health.jpg'));

  await client.close();
  chrome.kill();

  console.log('\n================================================================');
  console.log('🎉 ALL REAL WEB WORKSPACE SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal web capture failure:', err);
  process.exit(1);
});
