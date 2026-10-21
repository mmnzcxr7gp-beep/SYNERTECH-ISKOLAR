/**
 * generate_synthetic_credential_fixtures.js
 * Generates clearly labeled synthetic credential test fixtures for ISKOLAR:
 * 1. synthetic_school_id.png (Rendered ID card image with crisp text)
 * 2. synthetic_cor_text.pdf (Digital PDF with selectable text stream)
 * 3. synthetic_scanned_image_only.pdf (PDF embedding a flat raster image, no text stream)
 * 4. synthetic_corrupt_scan.png (Corrupted/blurred noise image)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const FIXTURES_DIR = path.resolve(__dirname, '../test_fixtures/credentials');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

async function generateFixtures() {
  console.log('Generating synthetic credential fixtures in:', FIXTURES_DIR);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 1. Synthetic School ID (PNG)
    const schoolIdHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: #f1f5f9;
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .id-card {
            width: 580px;
            height: 360px;
            background: #ffffff;
            border: 4px solid #1e3a8a;
            border-radius: 12px;
            padding: 24px;
            box-sizing: border-box;
            color: #111827;
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .univ-name {
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .card-title {
            font-size: 13px;
            font-weight: 600;
            color: #4b5563;
            margin: 4px 0 0 0;
            letter-spacing: 1px;
          }
          .content {
            font-size: 15px;
            line-height: 2.1;
          }
          .field-label {
            font-weight: 700;
            color: #374151;
            display: inline-block;
            width: 170px;
          }
          .field-value {
            font-weight: 800;
            color: #111827;
          }
          .footer {
            position: absolute;
            bottom: 16px;
            right: 24px;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="id-card">
          <div class="header">
            <h1 class="univ-name">PAMANTASAN NG LUNGSOD NG MAYNILA</h1>
            <p class="card-title">OFFICIAL STUDENT IDENTIFICATION CARD</p>
          </div>
          <div class="content">
            <div><span class="field-label">STUDENT NUMBER:</span> <span class="field-value">2021-10492</span></div>
            <div><span class="field-label">NAME:</span> <span class="field-value">JUAN DELA CRUZ</span></div>
            <div><span class="field-label">COURSE:</span> <span class="field-value">BS COMPUTER SCIENCE</span></div>
            <div><span class="field-label">DATE OF BIRTH:</span> <span class="field-value">2003-05-15</span></div>
            <div><span class="field-label">VALID UNTIL:</span> <span class="field-value">2025-06-30</span></div>
          </div>
          <div class="footer">
            OFFICE OF STUDENT AFFAIRS & REGISTRAR
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(schoolIdHtml, { waitUntil: 'domcontentloaded' });
    const idElement = await page.$('.id-card');
    const idImagePath = path.join(FIXTURES_DIR, 'synthetic_school_id.png');
    await idElement.screenshot({ path: idImagePath });
    console.log('  Created:', idImagePath);

    // 2. Synthetic COR with Digital Text (PDF)
    const corHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 40px;
            color: #111;
            line-height: 1.6;
          }
          h2 { margin: 0; color: #1e3a8a; }
          h3 { margin: 4px 0 16px 0; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #9ca3af; padding: 8px 12px; font-size: 13px; }
          th { background: #f3f4f6; text-align: left; }
        </style>
      </head>
      <body>
        <h2>TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES</h2>
        <h3>OFFICIAL CERTIFICATE OF REGISTRATION AND GRADES</h3>
        <p><strong>STUDENT NUMBER:</strong> TUPM-20-4491</p>
        <p><strong>NAME:</strong> MARIA SANTOS</p>
        <p><strong>DEGREE / PROGRAM:</strong> BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY</p>
        <p><strong>ACADEMIC TERM:</strong> FIRST SEMESTER, A.Y. 2024-2025</p>
        <p><strong>GWA:</strong> 1.45</p>
        <table>
          <thead>
            <tr><th>Subject Code</th><th>Subject Description</th><th>Units</th><th>Grade</th></tr>
          </thead>
          <tbody>
            <tr><td>IT 311</td><td>Web Systems and Technologies</td><td>3.0</td><td>1.25</td></tr>
            <tr><td>IT 312</td><td>Database Administration</td><td>3.0</td><td>1.50</td></tr>
            <tr><td>IT 313</td><td>Information Assurance and Security</td><td>3.0</td><td>1.50</td></tr>
          </tbody>
        </table>
        <p style="margin-top: 30px; font-size: 11px; color: #6b7280;">Certified Authentic by the University Registrar.</p>
      </body>
      </html>
    `;

    await page.setContent(corHtml, { waitUntil: 'domcontentloaded' });
    const corPdfPath = path.join(FIXTURES_DIR, 'synthetic_cor_text.pdf');
    await page.pdf({ path: corPdfPath, format: 'A4', printBackground: true });
    console.log('  Created:', corPdfPath);

    // 3. Synthetic Scanned / Raster-Only PDF
    // To create a pure image PDF without digital font/text streams:
    // We render an HTML page containing ONLY an embedded base64 <img> tag of the School ID!
    const imgBase64 = fs.readFileSync(idImagePath).toString('base64');
    const scannedPdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 40px; background: #fff; text-align: center; }
          img { width: 90%; max-width: 650px; }
        </style>
      </head>
      <body>
        <img src="data:image/png;base64,${imgBase64}" alt="Scanned Document" />
      </body>
      </html>
    `;

    await page.setContent(scannedPdfHtml, { waitUntil: 'domcontentloaded' });
    const scannedPdfPath = path.join(FIXTURES_DIR, 'synthetic_scanned_image_only.pdf');
    await page.pdf({ path: scannedPdfPath, format: 'A4', printBackground: true });
    console.log('  Created:', scannedPdfPath);

    // 4. Synthetic Corrupted / Unreadable Image (Noise / Blur)
    const corruptImagePath = path.join(FIXTURES_DIR, 'synthetic_corrupt_scan.png');
    // Minimal 10x10 dark noise PNG
    const noisePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(corruptImagePath, noisePng);
    console.log('  Created:', corruptImagePath);

    console.log('All synthetic credential fixtures successfully generated.\n');
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  generateFixtures()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to generate fixtures:', err);
      process.exit(1);
    });
}

module.exports = { generateFixtures, FIXTURES_DIR };
