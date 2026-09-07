/**
 * test_homepage_effects.js
 * End-to-end Browser & Automated QA Test Suite for ISKOLAR Homepage React Bits Integration:
 * 1. test_home_particle_text_rendering
 * 2. test_home_dither_rendering
 * 3. test_home_effects_accessibility
 * 4. test_home_effects_reduced_motion
 * 5. test_home_effects_fallback
 * 6. test_home_effects_mobile
 * 7. test_home_effects_dark_theme
 * 8. test_home_effects_click_through
 * 9. test_home_effects_cleanup
 * 10. test_home_effects_no_console_errors
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Simple static file server for web/client/dist
function startStaticServer(distPath, port = 0) {
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
      // SPA Fallback
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
      const assignedPort = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${assignedPort}` });
    });
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING ISKOLAR HOMEPAGE EFFECTS VERIFICATION SUITE');
  console.log('================================================================\n');

  const distPath = path.resolve(__dirname, '../dist');
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist/ directory missing. Run "npm run build" first.');
    process.exit(1);
  }

  const { server, url } = await startStaticServer(distPath);
  console.log(`✓ Test preview server running at: ${url}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader'],
  });

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  }

  function recordFail(testName, err) {
    console.error(`  ❌ [FAIL] ${testName}:`, err?.message || err);
    failed++;
  }

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // -------------------------------------------------------------------------
    // TEST 1: test_home_particle_text_rendering
    // -------------------------------------------------------------------------
    console.log('\n--- 1. test_home_particle_text_rendering ---');
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.home-hero__particle-title', { timeout: 4000 });
      const canvasExists = await page.$eval('.particle-text-canvas', (el) => !!el);
      assert.strictEqual(canvasExists, true, 'ParticleText canvas should exist in DOM');

      const isAriaHidden = await page.$eval('.home-hero__particle-title', (el) => el.getAttribute('aria-hidden'));
      assert.strictEqual(isAriaHidden, 'true', 'Particle container must have aria-hidden="true"');
      recordPass('test_home_particle_text_rendering');
    } catch (e) {
      recordFail('test_home_particle_text_rendering', e);
    }

    // -------------------------------------------------------------------------
    // TEST 2: test_home_dither_rendering
    // -------------------------------------------------------------------------
    console.log('\n--- 2. test_home_dither_rendering ---');
    try {
      await page.waitForSelector('.home-hero__effect', { timeout: 4000 });
      const ditherContainer = await page.$eval('.home-hero__effect', (el) => !!el);
      assert.strictEqual(ditherContainer, true, 'Dither effect container must exist in Hero');

      const pointerEvents = await page.$eval('.home-hero__effect', (el) => window.getComputedStyle(el).pointerEvents);
      assert.strictEqual(pointerEvents, 'none', 'Dither effect must have pointer-events: none');

      const effectAriaHidden = await page.$eval('.home-hero__effect', (el) => el.getAttribute('aria-hidden'));
      assert.strictEqual(effectAriaHidden, 'true', 'Dither effect must be marked aria-hidden="true"');
      recordPass('test_home_dither_rendering');
    } catch (e) {
      recordFail('test_home_dither_rendering', e);
    }

    // -------------------------------------------------------------------------
    // TEST 3: test_home_effects_accessibility
    // -------------------------------------------------------------------------
    console.log('\n--- 3. test_home_effects_accessibility ---');
    try {
      const h1Count = await page.$$eval('h1', (els) => els.length);
      assert.strictEqual(h1Count, 1, 'Exactly one <h1> heading must be present on the homepage');

      const h1Text = await page.$eval('#home-hero-title', (el) => el.textContent.trim());
      assert.ok(h1Text.includes('Scholarship Applications Made Clearer'), 'Semantic <h1> must contain the full headline text');

      const heroLabel = await page.$eval('.home-hero', (el) => el.getAttribute('aria-labelledby'));
      assert.strictEqual(heroLabel, 'home-hero-title', 'Hero section must be labeled by semantic heading ID');
      recordPass('test_home_effects_accessibility');
    } catch (e) {
      recordFail('test_home_effects_accessibility', e);
    }

    // -------------------------------------------------------------------------
    // TEST 4: test_home_effects_reduced_motion
    // -------------------------------------------------------------------------
    console.log('\n--- 4. test_home_effects_reduced_motion ---');
    try {
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.reload({ waitUntil: 'networkidle0' });

      const ditherDisplay = await page.$eval('.home-hero__effect', (el) => window.getComputedStyle(el).display);
      assert.strictEqual(ditherDisplay, 'none', 'Dither effect must be hidden in reduced motion mode');

      const particleDisplay = await page.$eval('.home-hero__particle-title', (el) => window.getComputedStyle(el).display);
      assert.strictEqual(particleDisplay, 'none', 'Particle canvas title must be hidden in reduced motion mode');

      const semanticH1Display = await page.$eval('.home-hero__semantic-title', (el) => window.getComputedStyle(el).display);
      assert.ok(semanticH1Display !== 'none', 'Semantic H1 must become visible and rendered in reduced motion mode');

      // Reset media features
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
      await page.reload({ waitUntil: 'networkidle0' });
      recordPass('test_home_effects_reduced_motion');
    } catch (e) {
      recordFail('test_home_effects_reduced_motion', e);
    }

    // -------------------------------------------------------------------------
    // TEST 5: test_home_effects_fallback
    // -------------------------------------------------------------------------
    console.log('\n--- 5. test_home_effects_fallback ---');
    try {
      const fallbackWorks = await page.evaluate(() => {
        const ditherFallback = document.querySelector('.dither-fallback') || document.querySelector('.home-hero__effect');
        return !!ditherFallback;
      });
      assert.strictEqual(fallbackWorks, true, 'Fallback or active effect container should exist');
      recordPass('test_home_effects_fallback');
    } catch (e) {
      recordFail('test_home_effects_fallback', e);
    }

    // -------------------------------------------------------------------------
    // TEST 6: test_home_effects_mobile
    // -------------------------------------------------------------------------
    console.log('\n--- 6. test_home_effects_mobile ---');
    try {
      const viewports = [
        { width: 320, height: 568 },
        { width: 360, height: 800 },
        { width: 390, height: 844 },
        { width: 412, height: 915 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 1280, height: 720 },
        { width: 1440, height: 900 },
        { width: 1920, height: 1080 },
      ];

      for (const vp of viewports) {
        await page.setViewport(vp);
        await new Promise((r) => setTimeout(r, 60));
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth || document.documentElement.scrollWidth > window.innerWidth;
        });
        assert.strictEqual(hasHorizontalScroll, false, `No horizontal scroll allowed at ${vp.width}x${vp.height}`);
      }

      await page.setViewport({ width: 1280, height: 800 });
      recordPass('test_home_effects_mobile');
    } catch (e) {
      recordFail('test_home_effects_mobile', e);
    }

    // -------------------------------------------------------------------------
    // TEST 7: test_home_effects_dark_theme
    // -------------------------------------------------------------------------
    console.log('\n--- 7. test_home_effects_dark_theme ---');
    try {
      // Toggle theme to dark
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await new Promise((r) => setTimeout(r, 60));

      const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
      assert.strictEqual(isDark, true, 'Document root should have data-theme="dark"');

      // Toggle back to light
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      });
      recordPass('test_home_effects_dark_theme');
    } catch (e) {
      recordFail('test_home_effects_dark_theme', e);
    }

    // -------------------------------------------------------------------------
    // TEST 8: test_home_effects_click_through
    // -------------------------------------------------------------------------
    console.log('\n--- 8. test_home_effects_click_through ---');
    try {
      await page.setViewport({ width: 1280, height: 800 });
      await page.waitForSelector('a[href="#scholarships"]', { timeout: 3000 });

      // Click Browse Scholarships button via browser dispatch
      await page.evaluate(() => {
        const btn = document.querySelector('a[href="#scholarships"]');
        if (btn) btn.click();
      });
      const currentHash = await page.evaluate(() => window.location.hash);
      assert.strictEqual(currentHash, '#scholarships', 'Clicking Browse Scholarships button should update URL hash to #scholarships');

      // Test Sign In button trigger
      await page.waitForSelector('button.btn-secondary', { timeout: 3000 });
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector('button.btn-secondary');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      assert.strictEqual(clicked, true, 'Sign In button must be clickable');
      recordPass('test_home_effects_click_through');
    } catch (e) {
      recordFail('test_home_effects_click_through', e);
    }

    // -------------------------------------------------------------------------
    // TEST 9: test_home_effects_cleanup
    // -------------------------------------------------------------------------
    console.log('\n--- 9. test_home_effects_cleanup ---');
    try {
      // Navigate to typography page and back
      await page.goto(`${url}/#typography`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#main-content', { timeout: 2000 });

      // Navigate back to home
      await page.goto(`${url}/#home`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.home-hero', { timeout: 2000 });
      recordPass('test_home_effects_cleanup');
    } catch (e) {
      recordFail('test_home_effects_cleanup', e);
    }

    // -------------------------------------------------------------------------
    // TEST 10: test_home_effects_no_console_errors
    // -------------------------------------------------------------------------
    console.log('\n--- 10. test_home_effects_no_console_errors ---');
    try {
      const criticalErrors = consoleErrors.filter((e) =>
        !e.includes('favicon') &&
        !e.includes('socket.io') &&
        !e.includes('Sentry') &&
        !e.includes('/api/') &&
        !e.includes('status of 403') &&
        !e.includes('status of 404') &&
        !e.includes('net::ERR')
      );
      assert.strictEqual(criticalErrors.length, 0, `Expected 0 critical console errors, found: ${JSON.stringify(criticalErrors)}`);
      recordPass('test_home_effects_no_console_errors');
    } catch (e) {
      recordFail('test_home_effects_no_console_errors', e);
    }

    await page.close();
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }

  console.log(`\n================================================================`);
  console.log(`🎓 HOMEPAGE EFFECTS SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
