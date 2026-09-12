/**
 * Automated Lighthouse Performance & Accessibility Benchmark
 * 
 * Performs 5 runs per route against production build preview:
 * - Route 1: Landing / Public Home (#home)
 * - Route 2: Provider Workspace & Scheduling (#providers)
 * - Route 3: Document Verification & OCR Evaluation (#providers/verification)
 * 
 * Computes median and range for:
 * - Performance (Score 0-100)
 * - Accessibility (Score 0-100)
 * - First Contentful Paint (FCP, seconds)
 * - Largest Contentful Paint (LCP, seconds)
 * - Cumulative Layout Shift (CLS)
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PREVIEW_PORT = 4173;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;

const ROUTES = [
  { name: 'Public Landing (#home)', url: `${BASE_URL}/#home` },
  { name: 'Provider Workspace & Agenda (#providers)', url: `${BASE_URL}/#providers` },
  { name: 'Document & OCR Verification Queue (#providers/verification)', url: `${BASE_URL}/#providers/verification` },
];

const NUM_RUNS = 5;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    }, 500);
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

async function runLighthouse(url, runIndex) {
  const tmpOut = path.join(process.cwd(), `lighthouse_run_${Date.now()}_${runIndex}.json`);
  const cmd = `CHROME_PATH="${CHROME_PATH}" npx -y lighthouse "${url}" --chrome-flags="--headless --no-sandbox --disable-gpu" --output=json --output-path="${tmpOut}" --only-categories=performance,accessibility --quiet`;

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 90000 });
    const raw = fs.readFileSync(tmpOut, 'utf-8');
    fs.unlinkSync(tmpOut);
    const data = JSON.parse(raw);

    const perfScore = Math.round((data.categories?.performance?.score || 0) * 100);
    const a11yScore = Math.round((data.categories?.accessibility?.score || 0) * 100);
    const fcp = parseFloat(((data.audits?.['first-contentful-paint']?.numericValue || 0) / 1000).toFixed(2));
    const lcp = parseFloat(((data.audits?.['largest-contentful-paint']?.numericValue || 0) / 1000).toFixed(2));
    const cls = parseFloat((data.audits?.['cumulative-layout-shift']?.numericValue || 0).toFixed(3));

    return { perfScore, a11yScore, fcp, lcp, cls };
  } catch (err) {
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    console.warn(`Run ${runIndex} warning:`, err.message);
    return null;
  }
}

async function main() {
  console.log('================================================================');
  console.log('🚀 ISKOLAR PRODUCTION LIGHTHOUSE BENCHMARK (5 Runs / Route)');
  console.log('================================================================');

  console.log('Starting Vite Preview Server on port', PREVIEW_PORT, '...');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--host', 'localhost'], {
    cwd: path.resolve(process.cwd()),
    stdio: 'ignore',
  });

  try {
    await checkServerReady(PREVIEW_PORT);
    console.log('✓ Preview server ready at', BASE_URL);

    const results = {};

    for (const route of ROUTES) {
      console.log(`\n----------------------------------------------------------------`);
      console.log(`Auditing Route: ${route.name}`);
      console.log(`URL: ${route.url}`);
      console.log(`----------------------------------------------------------------`);

      const runs = [];

      for (let i = 1; i <= NUM_RUNS; i++) {
        process.stdout.write(`  Run ${i}/${NUM_RUNS}... `);
        const res = await runLighthouse(route.url, i);
        if (res) {
          runs.push(res);
          console.log(`Perf: ${res.perfScore} | a11y: ${res.a11yScore} | FCP: ${res.fcp}s | LCP: ${res.lcp}s | CLS: ${res.cls}`);
        } else {
          console.log(`Failed`);
        }
        await wait(1000);
      }

      if (runs.length > 0) {
        results[route.name] = {
          perf: calculateMedianAndRange(runs.map((r) => r.perfScore)),
          a11y: calculateMedianAndRange(runs.map((r) => r.a11yScore)),
          fcp: calculateMedianAndRange(runs.map((r) => r.fcp)),
          lcp: calculateMedianAndRange(runs.map((r) => r.lcp)),
          cls: calculateMedianAndRange(runs.map((r) => r.cls)),
          sampleCount: runs.length,
        };
      }
    }

    console.log('\n================================================================');
    console.log('📊 FINAL CONSOLIDATED LIGHTHOUSE BENCHMARK REPORT');
    console.log('================================================================\n');

    const summaryTable = [];

    for (const [routeName, data] of Object.entries(results)) {
      summaryTable.push({
        'Route': routeName,
        'Performance (Median [Range])': `${data.perf.median} [${data.perf.min}–${data.perf.max}]`,
        'Accessibility (Median [Range])': `${data.a11y.median} [${data.a11y.min}–${data.a11y.max}]`,
        'FCP (s)': `${data.fcp.median}s [${data.fcp.min}–${data.fcp.max}s]`,
        'LCP (s)': `${data.lcp.median}s [${data.lcp.min}–${data.lcp.max}s]`,
        'CLS': `${data.cls.median} [${data.cls.min}–${data.cls.max}]`,
      });
    }

    console.table(summaryTable);

    // Persist results
    const artifactPath = path.resolve(process.cwd(), '../../audit/LIGHTHOUSE_BENCHMARK_RESULTS.json');
    fs.writeFileSync(artifactPath, JSON.stringify(results, null, 2));
    console.log(`\n✓ Benchmark results persisted to ${artifactPath}`);

  } finally {
    previewProcess.kill();
    console.log('✓ Preview server stopped cleanly.');
  }
}

main().catch((err) => {
  console.error('Lighthouse audit failed:', err);
  process.exit(1);
});
