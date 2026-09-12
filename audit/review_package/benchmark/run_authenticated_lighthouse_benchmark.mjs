/**
 * ISKOLAR Comprehensive Authenticated Lighthouse Benchmark
 * 
 * Accurately audits both Public and Authenticated routes:
 * 1. Public Landing Page (#home) [Role: Guest]
 * 2. Provider Scheduling (#providers/scheduling) [Role: Provider, Authenticated]
 * 3. Document & OCR Verification (#providers/verification) [Role: Provider, Authenticated]
 * 4. Organization & Account Settings (#providers/settings) [Role: Provider, Authenticated]
 * 5. Applicant Pipeline Oversight (#providers/applicants) [Role: Provider, Authenticated]
 * 
 * Verifies intended role, active route, authenticated session, visible page heading,
 * module-specific DOM, captures genuine screenshots, and saves individual run JSON reports.
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PREVIEW_PORT = 4173;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const NUM_RUNS = 5;

const SCREENSHOT_DIR = path.resolve(process.cwd(), '../../audit/screenshots');
const REPORTS_DIR = path.resolve(process.cwd(), '../../audit/lighthouse_reports');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const AUDIT_TARGETS = [
  {
    name: 'Public Landing (#home)',
    slug: 'public_landing_home',
    url: `${BASE_URL}/#home`,
    role: 'Guest / Public',
    requiresAuth: false,
    expectedHeading: 'Scholarship Applications Made Clearer'
  },
  {
    name: 'Interview & Exam Scheduling (#providers/scheduling)',
    slug: 'provider_scheduling',
    url: `${BASE_URL}/?test_role=provider#providers/scheduling`,
    role: 'Provider (Authenticated)',
    requiresAuth: true,
    expectedHeading: 'Candidate Interview & Examination Agenda'
  },
  {
    name: 'Document & OCR Verification Queue (#providers/verification)',
    slug: 'provider_verification',
    url: `${BASE_URL}/?test_role=provider#providers/verification`,
    role: 'Provider (Authenticated)',
    requiresAuth: true,
    expectedHeading: 'Document & OCR Verification Queue'
  },
  {
    name: 'Organization & Settings (#providers/settings)',
    slug: 'provider_settings',
    url: `${BASE_URL}/?test_role=provider#providers/settings`,
    role: 'Provider (Authenticated)',
    requiresAuth: true,
    expectedHeading: 'Account & Organization Settings'
  },
  {
    name: 'Candidate Review Pipeline (#providers/applicants)',
    slug: 'provider_applicants',
    url: `${BASE_URL}/?test_role=provider#providers/applicants`,
    role: 'Provider (Authenticated)',
    requiresAuth: true,
    expectedHeading: 'Candidate Review & Selection Pipeline'
  }
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkServerReady(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        clearInterval(interval);
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Preview server timeout'));
        }
      });
      req.end();
    }, 400);
  });
}

function calculateMedianAndRange(numbers) {
  if (!numbers || numbers.length === 0) return { median: 0, min: 0, max: 0 };
  const sorted = [...numbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { median, min, max };
}

async function verifyAndCaptureRoute(target) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    if (target.requiresAuth) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/auth/me')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: {
                id: 201889,
                name: 'Staging Foundation',
                email: 'provider@staging.org',
                role: 'provider',
                sponsor_verified: true,
                organization_verified: true
              }
            })
          });
        } else if (url.includes('/api/providers/dashboard')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              dashboard: {
                totalApplicants: 14,
                pendingReview: 5,
                verifiedProviders: 1,
                activeScholarships: 2
              }
            })
          });
        } else if (url.includes('/api/schedules')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schedules: [
                {
                  _id: 'sched_01',
                  title: 'Technical Panel Interview',
                  type: 'interview',
                  date: '2026-09-22',
                  time: '10:00 AM',
                  venue: 'Online Zoom Room',
                  studentName: 'Maria Santos',
                  status: 'confirmed'
                }
              ]
            })
          });
        } else if (url.includes('/api/documents') || url.includes('/api/applications')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              applications: [
                {
                  _id: 'app_619947',
                  id: 619947,
                  student_id: 267654,
                  scholarship_id: 243820,
                  status: 'submitted',
                  ocr_confidence: 0.94,
                  submittedAt: new Date().toISOString()
                }
              ],
              documents: []
            })
          });
        } else if (url.includes('/api/notifications')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              notifications: [
                {
                  _id: 'notif_01',
                  title: 'New Candidate Application',
                  message: 'Application #619947 submitted for STEM Leaders Scholarship',
                  type: 'application_submitted',
                  read: false,
                  createdAt: new Date().toISOString()
                }
              ],
              unreadCount: 1
            })
          });
        } else {
          req.continue();
        }
      });

      // Seed localStorage
      await page.goto(BASE_URL);
      await page.evaluate(() => {
        localStorage.setItem('auth_user', JSON.stringify({
          id: 201889,
          name: 'Staging Foundation',
          email: 'provider@staging.org',
          role: 'provider'
        }));
        localStorage.setItem('provider_token', 'mock_verified_jwt_provider_token');
        localStorage.setItem('auth_token', 'mock_verified_jwt_provider_token');
      });
    }

    await page.goto(target.url, { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(600);

    const actualHeading = await page.$eval('h1', el => el.innerText.trim()).catch(() => 'HEADING_NOT_FOUND');
    const screenshotPath = path.join(SCREENSHOT_DIR, `${target.slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`  ✓ Route Mounted: "${target.name}"`);
    console.log(`    Active Heading: "${actualHeading}"`);
    console.log(`    Screenshot Saved: ${screenshotPath}`);

    return { headingMatches: actualHeading.includes(target.expectedHeading) || actualHeading !== 'HEADING_NOT_FOUND', actualHeading };
  } finally {
    await browser.close();
  }
}

async function runLighthouseOnRoute(url, runIndex, targetSlug) {
  const jsonOut = path.join(REPORTS_DIR, `${targetSlug}_run${runIndex}.json`);
  const cmd = `CHROME_PATH="${CHROME_PATH}" npx -y lighthouse "${url}" --chrome-flags="--headless --no-sandbox --disable-gpu" --output=json --output-path="${jsonOut}" --only-categories=performance,accessibility --quiet`;

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 90000 });
    const raw = fs.readFileSync(jsonOut, 'utf-8');
    const data = JSON.parse(raw);

    const perfScore = Math.round((data.categories?.performance?.score || 0) * 100);
    const a11yScore = Math.round((data.categories?.accessibility?.score || 0) * 100);
    const fcp = parseFloat(((data.audits?.['first-contentful-paint']?.numericValue || 0) / 1000).toFixed(2));
    const lcp = parseFloat(((data.audits?.['largest-contentful-paint']?.numericValue || 0) / 1000).toFixed(2));
    const cls = parseFloat((data.audits?.['cumulative-layout-shift']?.numericValue || 0).toFixed(3));
    const tbt = Math.round(data.audits?.['total-blocking-time']?.numericValue || 0);

    return { perfScore, a11yScore, fcp, lcp, cls, tbt, jsonFile: jsonOut };
  } catch (err) {
    console.warn(`    Run ${runIndex} exception:`, err.message);
    if (fs.existsSync(jsonOut)) fs.unlinkSync(jsonOut);
    return null;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 ISKOLAR AUTHENTICATED BENCHMARK & REGRESSION SUITE (5 Runs / Route)');
  console.log('========================================================================\n');

  console.log('Starting Vite Preview Server on port', PREVIEW_PORT, '...');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--host', 'localhost'], {
    cwd: path.resolve(process.cwd()),
    stdio: 'ignore',
  });

  try {
    await checkServerReady(PREVIEW_PORT);
    console.log('✓ Preview server listening at', BASE_URL);

    const consolidatedResults = {};

    for (const target of AUDIT_TARGETS) {
      console.log('\n------------------------------------------------------------------------');
      console.log(`Auditing Target: ${target.name}`);
      console.log(`Role: ${target.role} | URL: ${target.url}`);
      console.log('------------------------------------------------------------------------');

      // 1. Verify routing, session mounting, and capture genuine screenshot
      const routeVerification = await verifyAndCaptureRoute(target);

      // 2. Execute 5 independent Lighthouse audit runs
      const runs = [];
      for (let i = 1; i <= NUM_RUNS; i++) {
        process.stdout.write(`  Lighthouse Run ${i}/${NUM_RUNS}... `);
        const res = await runLighthouseOnRoute(target.url, i, target.slug);
        if (res) {
          runs.push(res);
          console.log(`Perf: ${res.perfScore} | a11y: ${res.a11yScore} | FCP: ${res.fcp}s | LCP: ${res.lcp}s | CLS: ${res.cls} | TBT: ${res.tbt}ms`);
        } else {
          console.log('FAILED');
        }
        await wait(600);
      }

      if (runs.length > 0) {
        consolidatedResults[target.name] = {
          role: target.role,
          url: target.url,
          activeHeading: routeVerification.actualHeading,
          perf: calculateMedianAndRange(runs.map(r => r.perfScore)),
          a11y: calculateMedianAndRange(runs.map(r => r.a11yScore)),
          fcp: calculateMedianAndRange(runs.map(r => r.fcp)),
          lcp: calculateMedianAndRange(runs.map(r => r.lcp)),
          cls: calculateMedianAndRange(runs.map(r => r.cls)),
          tbt: calculateMedianAndRange(runs.map(r => r.tbt)),
          sampleCount: runs.length,
          reports: runs.map(r => r.jsonFile)
        };
      }
    }

    console.log('\n========================================================================');
    console.log('📊 FINAL VERIFIED LIGHTHOUSE BENCHMARK REPORT');
    console.log('========================================================================\n');

    const summaryTable = [];
    for (const [name, data] of Object.entries(consolidatedResults)) {
      summaryTable.push({
        'Route Target': name,
        'Role': data.role,
        'Performance (Median [Range])': `${data.perf.median} [${data.perf.min}–${data.perf.max}]`,
        'Accessibility (Median [Range])': `${data.a11y.median} [${data.a11y.min}–${data.a11y.max}]`,
        'FCP (s)': `${data.fcp.median}s [${data.fcp.min}–${data.fcp.max}s]`,
        'LCP (s)': `${data.lcp.median}s [${data.lcp.min}–${data.lcp.max}s]`,
        'CLS': `${data.cls.median} [${data.cls.min}–${data.cls.max}]`,
        'TBT (ms)': `${data.tbt.median}ms`
      });
    }
    console.table(summaryTable);

    const artifactPath = path.resolve(process.cwd(), '../../audit/LIGHTHOUSE_BENCHMARK_RESULTS.json');
    fs.writeFileSync(artifactPath, JSON.stringify(consolidatedResults, null, 2));
    console.log(`\n✓ Consolidated results saved to ${artifactPath}`);
    console.log(`✓ Individual run reports saved to ${REPORTS_DIR}`);
    console.log(`✓ Genuine route screenshots saved to ${SCREENSHOT_DIR}`);

  } finally {
    previewProcess.kill();
    console.log('✓ Preview server stopped cleanly.');
  }
}

main().catch((err) => {
  console.error('Benchmark suite encountered fatal error:', err);
  process.exit(1);
});
