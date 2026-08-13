const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');
const REPORT_MD = path.join(ROOT_DIR, 'SYSTEM_TESTING_INSTRUMENTS_REPORT.md');
const EVIDENCE_MD = path.join(ROOT_DIR, 'SCREENSHOT_EVIDENCE_REPORT.md');
const PDF_OUTPUT = path.join(ROOT_DIR, 'SYSTEM_TESTING_INSTRUMENTS_REPORT.pdf');
const ZIP_OUTPUT = path.join(ROOT_DIR, 'ISKOLAR_QA_Testing_Evidence_Package.zip');

async function compilePdf() {
  console.log('🚀 Compiling Thesis-Ready QA Testing Document & 90 JPG Screenshots into PDF...');

  let mdContent = fs.readFileSync(REPORT_MD, 'utf8');

  // Convert markdown image links and headings to styled HTML
  let htmlBody = mdContent
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold my-6 text-cyan-700 border-b pb-2">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold my-5 text-slate-800 border-b pb-1">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold my-4 text-slate-700">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-lg font-medium my-3 text-slate-600">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-cyan-800 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
      const decodedSrc = decodeURIComponent(src.replace('file://', ''));
      const relativeSrc = decodedSrc.includes('Testing Evidence') 
        ? decodedSrc.substring(decodedSrc.indexOf('Testing Evidence')) 
        : src;
      const absPath = path.isAbsolute(relativeSrc) ? relativeSrc : path.join(ROOT_DIR, relativeSrc);
      const base64Img = fs.existsSync(absPath) 
        ? `data:image/jpeg;base64,${fs.readFileSync(absPath).toString('base64')}` 
        : src;
      return `<div class="my-4 text-center"><img src="${base64Img}" alt="${alt}" class="rounded-lg shadow-md max-w-full mx-auto border border-slate-200" style="max-height:550px;"/><p class="text-xs text-slate-500 mt-1 font-mono">${alt}</p></div>`;
    })
    .replace(/^ - (.*$)/gim, '<li class="ml-6 list-disc text-slate-700 my-1">$1</li>')
    .replace(/^---$/gim, '<hr class="my-8 border-slate-300"/>');

  const fullHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>ISKOLAR QA Testing Instruments Master Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        background: #ffffff;
        line-height: 1.6;
      }
      h1, h2, h3 { page-break-after: avoid; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;
        font-size: 0.875rem;
      }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 0.5rem 0.75rem;
        text-align: left;
      }
      th {
        background-color: #f1f5f9;
        font-weight: 600;
        color: #0f172a;
      }
      .page-break {
        page-break-before: always;
      }
    </style>
  </head>
  <body class="p-8">
    ${htmlBody}
  </body>
  </html>
  `;

  const tempHtmlPath = path.join(__dirname, 'temp_report.html');
  fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: PDF_OUTPUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  fs.unlinkSync(tempHtmlPath);

  console.log(`✅ Compiled PDF Report generated successfully: ${PDF_OUTPUT}`);

  // Create ZIP archive containing PDF, Markdown, and full Testing Evidence folder
  console.log('📦 Packaging compiled files into ZIP archive...');
  try {
    execSync(`zip -r "${ZIP_OUTPUT}" "SYSTEM_TESTING_INSTRUMENTS_REPORT.pdf" "SYSTEM_TESTING_INSTRUMENTS_REPORT.md" "SCREENSHOT_EVIDENCE_REPORT.md" "Testing Evidence"`, { cwd: ROOT_DIR });
    console.log(`✅ Package compiled successfully: ${ZIP_OUTPUT}`);
  } catch (err) {
    console.error('ZIP creation error:', err.message);
  }
}

compilePdf().catch(console.error);
