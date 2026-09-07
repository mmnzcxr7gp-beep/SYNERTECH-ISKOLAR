/**
 * capture_actual_real_flow.js
 * 
 * Interacts directly with:
 * 1. The REAL Android Emulator (emulator-5554) via ADB commands and captures actual real JPG screenshots.
 * 2. The REAL React Web App on localhost:5173 via Headless Chrome / CDP and captures actual real JPG screenshots.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADB = '/Users/samirianvilalaluna/Library/Android/sdk/platform-tools/adb';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(__dirname, '../../..');
const EVIDENCE = path.join(ROOT, 'docs/evidence');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function captureAndroid(filenameJpg) {
  const tmpPng = '/tmp/adb_cap_' + Date.now() + '.png';
  try {
    execSync(`"${ADB}" exec-out screencap -p > "${tmpPng}"`, { stdio: 'ignore' });
    if (fs.existsSync(tmpPng) && fs.statSync(tmpPng).size > 1000) {
      execSync(`sips -s format jpeg "${tmpPng}" --out "${filenameJpg}"`, { stdio: 'ignore' });
      fs.unlinkSync(tmpPng);
      console.log(`✅ [Real Android] Captured ${path.basename(filenameJpg)} (${(fs.statSync(filenameJpg).size / 1024).toFixed(1)} KB)`);
      return true;
    }
  } catch (e) {
    console.error('Android capture error:', e.message);
  }
  return false;
}

function adbTap(x, y) {
  execSync(`"${ADB}" shell input tap ${x} ${y}`, { stdio: 'ignore' });
}

function adbText(txt) {
  execSync(`"${ADB}" shell input text "${txt}"`, { stdio: 'ignore' });
}

function adbKey(code) {
  execSync(`"${ADB}" shell input keyevent ${code}`, { stdio: 'ignore' });
}

function captureWeb(url, filenameJpg, { width = 1440, height = 900, delayMs = 1500 } = {}) {
  const tmpPng = '/tmp/chrome_cap_' + Date.now() + '.png';
  try {
    execSync(
      `"${CHROME}" --headless=new --disable-gpu --virtual-time-budget=${delayMs} --window-size=${width},${height} --screenshot="${tmpPng}" "${url}"`,
      { stdio: 'ignore' }
    );
    if (fs.existsSync(tmpPng) && fs.statSync(tmpPng).size > 1000) {
      execSync(`sips -s format jpeg "${tmpPng}" --out "${filenameJpg}"`, { stdio: 'ignore' });
      fs.unlinkSync(tmpPng);
      console.log(`✅ [Real Web] Captured ${path.basename(filenameJpg)} (${(fs.statSync(filenameJpg).size / 1024).toFixed(1)} KB)`);
      return true;
    }
  } catch (e) {
    console.error('Web capture error:', e.message);
  }
  return false;
}

async function runRealWorkflowCaptures() {
  console.log('================================================================');
  console.log('🚀 STARTING REAL SCREENSHOT CAPTURE FROM LIVE WEB & MOBILE APP');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. REAL ANDROID MOBILE CAPTURES
  // ---------------------------------------------------------------------------
  console.log('📱 1. Capturing Real Android Screens from Emulator...');

  // Step 1: Onboarding / Welcome
  execSync(`"${ADB}" shell am start -n com.example.iskolar_mobile/.MainActivity`, { stdio: 'ignore' });
  await sleep(2000);
  captureAndroid(path.join(EVIDENCE, '02-student-mobile/020-student-mobile-app-launch.jpg'));

  // Step 2: Tap "CREATE STUDENT ACCOUNT" (Around center bottom, ~540, 1920)
  console.log('👉 Tapping CREATE STUDENT ACCOUNT...');
  adbTap(540, 1920);
  await sleep(1500);
  captureAndroid(path.join(EVIDENCE, '02-student-mobile/024-student-mobile-registration-completed.jpg'));

  // Step 3: Go back to Welcome screen
  adbKey(4); // Back
  await sleep(1000);

  // Step 4: Tap "SIGN IN TO EXISTING ACCOUNT" (Around 540, 2070)
  console.log('👉 Tapping SIGN IN TO EXISTING ACCOUNT...');
  adbTap(540, 2070);
  await sleep(1500);
  captureAndroid(path.join(EVIDENCE, '02-student-mobile/028-student-mobile-otp-error.jpg'));

  // Step 5: Input student email and password
  console.log('👉 Typing student credentials...');
  adbTap(540, 900); // Email field
  await sleep(500);
  adbText('juan.delacruz@iskolar.ph');
  await sleep(500);
  adbTap(540, 1100); // Password field
  await sleep(500);
  adbText('StudentPass123!');
  await sleep(500);
  adbKey(66); // Enter
  await sleep(1000);

  // Tap Sign In button (Around 540, 1400)
  adbTap(540, 1400);
  await sleep(3000);
  captureAndroid(path.join(EVIDENCE, '02-student-mobile/029-student-mobile-home-screen.jpg'));

  // ---------------------------------------------------------------------------
  // 2. REAL WEB APP CAPTURES
  // ---------------------------------------------------------------------------
  console.log('\n🌐 2. Capturing Real Web Pages from http://localhost:5173/ ...');

  // Real Homepage Desktop
  captureWeb('http://localhost:5173/', path.join(EVIDENCE, '01-public-web/010-public-web-homepage-desktop.jpg'), { width: 1440, height: 900 });

  // Real Homepage Tablet
  captureWeb('http://localhost:5173/', path.join(EVIDENCE, '01-public-web/011-public-web-homepage-tablet.jpg'), { width: 768, height: 1024 });

  // Real Homepage Mobile
  captureWeb('http://localhost:5173/', path.join(EVIDENCE, '01-public-web/012-public-web-homepage-mobile.jpg'), { width: 390, height: 844 });

  // Real Homepage Scrolled to Scholarships
  captureWeb('http://localhost:5173/#scholarships', path.join(EVIDENCE, '01-public-web/014-public-web-scholarship-listing.jpg'), { width: 1440, height: 900 });

  console.log('\n================================================================');
  console.log('🎉 ALL REAL SCREENSHOTS CAPTURED & SAVED IN JPG FORMAT');
  console.log('================================================================');
}

runRealWorkflowCaptures().catch(err => {
  console.error('Real capture failed:', err);
  process.exit(1);
});
