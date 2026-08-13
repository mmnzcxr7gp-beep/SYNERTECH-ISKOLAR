const puppeteer = require('puppeteer');

async function testRoutes() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const BASE_URL = 'http://localhost:5173';

  async function setAuth(role = 'admin') {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.evaluate((r) => {
      const user = { id: 1, name: 'System Admin', email: 'admin@iskolar.ph', role: r };
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_token', 'mock_token');
    }, role);
  }

  await setAuth('admin');

  const routes = [
    '#admin/create',
    '#admin/applicants',
    '#admin/documents',
    '#admin/opportunities',
    '#admin/scheduling',
    '#admin/reports',
    '#admin/settings',
    '#admin/scholarships',
    '#features',
    '#about',
    '#download',
    '#provider-info'
  ];

  for (const r of routes) {
    await page.goto(`${BASE_URL}/${r}`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(res => setTimeout(res, 500));
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 150).replace(/\n/g, ' '));
    console.log(`Route ${r.padEnd(20)} -> ${pageText}`);
  }

  await browser.close();
}

testRoutes();
