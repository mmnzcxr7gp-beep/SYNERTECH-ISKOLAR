const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_PATH = path.join(__dirname, '../../web/client/dist');
const OUTPUT_DIR = path.join(__dirname, '../../audit/screenshots/web');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function startStaticServer(distPath, port = 5174) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(distPath, reqUrl);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distPath, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function captureWebScreenshots() {
  console.log('🚀 Starting Audit Web Screenshots Capture...');
  const { server, port } = await startStaticServer(DIST_PATH, 5174);
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Static server listening at ${baseUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  async function setAuthState(role = 'admin') {
    await page.evaluate((r) => {
      const users = {
        admin: { id: 1, name: 'Chief Administrator', email: 'admin@iskolar.ph', role: 'admin', token: 'fake_admin_token' },
        provider: { id: 2, name: 'Gokongwei Foundation Admin', email: 'provider@gokongwei.org', role: 'provider', token: 'fake_provider_token' },
      };
      const user = users[r] || users.admin;
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_token', user.token);
      localStorage.setItem(`${r}_token`, user.token);
    }, role);
  }

  async function setTheme(isDark = false) {
    await page.evaluate((dark) => {
      if (dark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }, isDark);
    await new Promise((r) => setTimeout(r, 200));
  }

  async function takeScreenshot(filename, width, height, isDark = false) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await setTheme(isDark);
    await new Promise((r) => setTimeout(r, 400));
    const filepath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`  ✓ Captured ${filename} (${width}x${height} ${isDark ? 'Dark' : 'Light'})`);
  }

  try {
    // 1. Landing Page (Desktop 1440x900, 1280x800, 1024x768, Tablet 768x1024, Mobile 390x844)
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await takeScreenshot('web_landing_hero_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_landing_hero_dark_1440x900.png', 1440, 900, true);
    await takeScreenshot('web_landing_hero_light_1280x800.png', 1280, 800, false);
    await takeScreenshot('web_landing_hero_light_1024x768.png', 1024, 768, false);
    await takeScreenshot('web_landing_hero_tablet_768x1024.png', 768, 1024, false);
    await takeScreenshot('web_landing_hero_mobile_390x844.png', 390, 844, false);

    // 2. Login Modal
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const loginBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Login') || b.textContent.includes('Partner Portal') || b.textContent.includes('Sign In'));
      if (loginBtn) loginBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await takeScreenshot('web_login_modal_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_login_modal_dark_1440x900.png', 1440, 900, true);

    // 3. Provider Portal
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await setAuthState('provider');
    await page.goto(`${baseUrl}/#providers`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await takeScreenshot('web_provider_dashboard_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_provider_dashboard_dark_1440x900.png', 1440, 900, true);
    await takeScreenshot('web_provider_dashboard_1280x800.png', 1280, 800, false);
    await takeScreenshot('web_provider_dashboard_1024x768.png', 1024, 768, false);

    // 4. Provider Applicants & Ranking
    await page.goto(`${baseUrl}/#applicants`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await takeScreenshot('web_applicant_ranking_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_applicant_ranking_dark_1440x900.png', 1440, 900, true);

    // 5. Provider Scheduling
    await page.goto(`${baseUrl}/#scheduling`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await takeScreenshot('web_scheduling_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_scheduling_dark_1440x900.png', 1440, 900, true);

    // 6. Admin Portal
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await setAuthState('admin');
    await page.goto(`${baseUrl}/#admin`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await takeScreenshot('web_admin_dashboard_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_admin_dashboard_dark_1440x900.png', 1440, 900, true);
    await takeScreenshot('web_admin_dashboard_1280x800.png', 1280, 800, false);
    await takeScreenshot('web_admin_dashboard_1024x768.png', 1024, 768, false);

    // 7. Admin Reports & Analytics
    await page.goto(`${baseUrl}/#reports`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await takeScreenshot('web_admin_reports_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_admin_reports_dark_1440x900.png', 1440, 900, true);

    // 8. Typography System Documentation Page
    await page.goto(`${baseUrl}/#typography`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await takeScreenshot('web_typography_system_light_1440x900.png', 1440, 900, false);
    await takeScreenshot('web_typography_system_dark_1440x900.png', 1440, 900, true);

    console.log('\n🎉 All Web Audit Screenshots Successfully Captured!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

captureWebScreenshots();
