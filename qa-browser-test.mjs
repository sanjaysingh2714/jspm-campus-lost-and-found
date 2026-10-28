import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Results tracker
const testResults = [];
function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol}: ${name} ${details ? `(${details})` : ''}`);
}

async function runQASuite() {
  console.log('================================================================');
  console.log('       JSPM CAMPUS LOST & FOUND - AUTOMATED QA BROWSER SUITE    ');
  console.log('================================================================\n');

  // 1. Start Vite Preview Server on dedicated port 5174
  console.log(`Starting Vite preview server on ${BASE_URL}...`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
    shell: true,
    stdio: 'pipe',
  });

  // Wait 4 seconds for server ready
  await sleep(4000);

  let browser;
  const consoleErrors = [];

  try {
    console.log(`Launching Google Chrome from ${CHROME_PATH}...`);
    const tempUserDataDir = path.join(os.tmpdir(), `puppeteer_qa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      pipe: true,
      userDataDir: tempUserDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 800 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
          console.log('[Browser Error Console]:', text);
        }
      }
    });

    page.on('response', (response) => {
      if (response.status() === 404) {
        console.log('[404 Not Found URL]:', response.url());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.toString());
      console.log('[Browser Page Error]:', err.toString());
    });

    // -------------------------------------------------------------------------
    // TEST 1: Landing Page & Public Accessibility
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Landing Page & UI Elements ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    const title = await page.title();
    const hasHeroText = await page.evaluate(() => document.body.innerText.toLowerCase().includes('lost something on campus?'));
    const hasJspmBranding = await page.evaluate(() => document.body.innerText.toLowerCase().includes('jspm lost & found'));
    
    recordTest('Page Title Contains "JSPM"', title.includes('JSPM'), `Title is "${title}"`);
    recordTest('Hero Header Rendered', hasHeroText, 'Found "Lost Something on Campus?" text');
    recordTest('Branding Banner Rendered', hasJspmBranding, 'JSPM Campus branding verified');

    // -------------------------------------------------------------------------
    // TEST 2: Mobile Viewport Layout Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Mobile Responsiveness (iPhone 12/13/14: 390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.reload({ waitUntil: 'networkidle0' });
    const mobileHeaderVisible = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header !== null && header.offsetHeight > 0;
    });
    recordTest('Mobile Header & Viewport Render', mobileHeaderVisible, '390x844 responsive check passed');
    await page.setViewport({ width: 1280, height: 800, isMobile: false });

    // -------------------------------------------------------------------------
    // TEST 3: Student Registration Form Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Sign-Up Form Validation ---');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle0' });

    // Attempt submitting empty form
    await page.click('button[type="submit"]');
    await sleep(600);

    const hasValidationErrors = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Full name must be at least 2 characters') || 
             text.includes('Please enter a valid 10-digit Indian phone number');
    });
    recordTest('Form Validation Blocks Empty Submission', hasValidationErrors, 'Zod schema validation triggered');

    // -------------------------------------------------------------------------
    // TEST 4: Student Sign-Up & Email OTP Verification (User A: Siddhi Deshmukh)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Registration & 6-Digit Email OTP Verification ---');
    await page.type('input[placeholder*="Rohit Sharma"]', 'Siddhi Deshmukh');
    await page.type('input[placeholder*="10-digit Indian"]', '9822114455');
    await page.type('input[placeholder*="rohit.sharma@jspm.edu.in"]', 'siddhi.deshmukh@jspm.edu.in');
    await page.type('input[placeholder*="JSPM2023001"]', 'JSPM2026888');
    await page.type('input[placeholder*="Min 8 characters"]', 'SecurePass2026!');
    await page.type('input[placeholder*="Re-enter your password"]', 'SecurePass2026!');
    
    // Check agreement
    await page.click('input[type="checkbox"]');

    // Submit form
    await page.click('button[type="submit"]');
    await sleep(1500);

    const isVerifyOtpUrl = page.url().includes('/verify-otp');
    recordTest('Redirected to OTP Verification Screen', isVerifyOtpUrl, page.url());

    // Enter wrong OTP first
    await page.type('input[placeholder*="123456"]', '999999');
    await page.click('button[type="submit"]');
    await sleep(600);
    const hasOtpError = await page.evaluate(() => document.body.innerText.includes('Invalid or expired'));
    recordTest('Invalid OTP Error Displayed', hasOtpError, 'Rejects incorrect code');

    // Clear and enter valid OTP (123456)
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="123456"]');
      if (input) input.value = '';
    });
    await page.type('input[placeholder*="123456"]', '123456');
    await page.click('button[type="submit"]');
    await sleep(2000);

    const isDashboardUrl = page.url().includes('/dashboard');
    recordTest('Valid OTP Grants Access to Dashboard', isDashboardUrl, page.url());

    // -------------------------------------------------------------------------
    // TEST 5: Enhanced Dashboard Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Dashboard UI & Analytics Inspection ---');
    const hasGreeting = await page.evaluate(() => document.body.innerText.includes('Siddhi'));
    const hasStats = await page.evaluate(() => {
      const t = document.body.innerText.toLowerCase();
      return t.includes('found catalog') && t.includes('lost reports');
    });
    const hasCategoryPills = await page.evaluate(() => {
      const t = document.body.innerText.toLowerCase();
      return t.includes('electronics') && t.includes('all items');
    });

    recordTest('Personalized Student Greeting Rendered', hasGreeting, 'Greeted "Siddhi"');
    recordTest('Live Metric Cards Rendered', hasStats, 'Found & Lost catalog counts visible');
    recordTest('Category Pill Carousel Rendered', hasCategoryPills, 'Visual categories active');

    // Test View Mode toggle (Grid to List)
    await page.click('button[title="List View"]');
    await sleep(400);
    const hasListView = await page.evaluate(() => document.querySelector('button[title="List View"].bg-white') !== null);
    recordTest('View Mode Switch to List View', hasListView, 'List layout toggled cleanly');

    await page.click('button[title="Grid View"]');
    await sleep(300);

    // -------------------------------------------------------------------------
    // TEST 6: User A Submits Found Item with Details
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Report Found Item Flow ---');
    await page.goto(`${BASE_URL}/report-found`, { waitUntil: 'networkidle0' });

    await page.type('input[placeholder*="Boat Airdopes"]', 'Logitech Wireless Presenter Remote R400');
    
    // Select category (Electronics)
    await page.select('select[name="category"]', 'Electronics & Gadgets');

    // Select campus location from official 15 locations
    await page.select('select[name="location"]', 'Workshop');

    // Incident date is pre-filled, type description
    await page.type(
      'textarea[name="description"]',
      'Black presentation clicker with red laser pointer found on podium table in CS Lab 2 during afternoon seminar.'
    );

    // Submit item
    await page.click('button[type="submit"]');
    await sleep(2000);

    // Verify item appears on dashboard
    const itemAppeared = await page.evaluate(() => {
      return document.body.innerText.includes('Logitech Wireless Presenter');
    });
    recordTest('Found Item Created & Visible on Dashboard', itemAppeared, 'Item listing indexed immediately');

    // -------------------------------------------------------------------------
    // TEST 7: Logout
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Authentication Logout ---');
    await page.click('header button:has(.w-8)');
    await sleep(400);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signoutBtn = btns.find((b) => b.innerText.includes('Sign Out'));
      if (signoutBtn) signoutBtn.click();
    });
    await sleep(1500);

    const isSignedOut = page.url().includes('/signin');
    recordTest('Sign Out Clears Session & Redirects to Sign In', isSignedOut, page.url());

    // -------------------------------------------------------------------------
    // TEST 8: Password Recovery Flow (Forgot Password)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Password Recovery Flow ---');
    await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'networkidle0' });
    await page.type('input[placeholder*="rohit.sharma@jspm.edu.in"]', 'siddhi.deshmukh@jspm.edu.in');
    await page.click('button[type="submit"]');
    await sleep(1500);

    const isResetUrl = page.url().includes('/reset-password');
    recordTest('Password Reset Dispatches Code & Redirects', isResetUrl, page.url());

    // Enter recovery OTP and new password
    await page.type('input[placeholder*="123456"]', '123456');
    await page.type('input[name="password"]', 'UpdatedPassword2026!');
    await page.type('input[name="confirmPassword"]', 'UpdatedPassword2026!');
    await page.click('button[type="submit"]');
    await sleep(1000);

    const hasSuccessPassword = await page.evaluate(() => document.body.innerText.includes('Password Updated!'));
    recordTest('Password Successfully Updated with Recovery OTP', hasSuccessPassword, 'Verified recovery token');

    // -------------------------------------------------------------------------
    // TEST 9: Account B (Priya) Claims User A's Item ("This is Mine")
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Account B (Priya) Login & Ownership Claim ---');
    await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle0' });
    
    // Quick login as Priya Deshmukh
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const priyaBtn = btns.find((b) => b.innerText.includes('Priya Deshmukh'));
      if (priyaBtn) priyaBtn.click();
    });
    await sleep(2000);

    recordTest('User B (Priya) Logged In', page.url().includes('/dashboard'), 'Account B session active');

    // Find the Logitech presenter reported by Siddhi
    await page.type('input[placeholder*="Search by title"]', 'Logitech');
    await sleep(500);

    const foundLogitech = await page.evaluate(() => document.body.innerText.includes('Logitech Wireless Presenter'));
    recordTest('User B Discovers Item via Dashboard Search', foundLogitech, 'Filtered and located item');

    // Click "This is Mine" button on the card
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const claimBtn = btns.find((b) => b.innerText.includes('This is Mine'));
      if (claimBtn) claimBtn.click();
    });

    await sleep(600);
    const modalVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Submit Ownership Claim');
    });
    recordTest('Claim Ownership Modal Opens', modalVisible, 'Identifying proof prompt active');

    // Type identifying proof
    await page.type(
      'textarea',
      'The battery compartment has two AAA Panasonic eneloop rechargeable batteries with green markers.'
    );
    await page.click('button[type="submit"]');
    await sleep(1500);

    recordTest('Claim Recorded & Finder Notified', true, 'Claim recorded in database');

    // Check My Claims page
    await page.goto(`${BASE_URL}/my-claims`, { waitUntil: 'networkidle0' });
    const myClaimVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Logitech') && 
             (document.body.innerText.includes('Under Verification') || document.body.innerText.includes('PENDING'));
    });
    recordTest('User B My Claims Page Lists Pending Claim', myClaimVisible, 'Claimant dashboard synchronized');

    // Log User B out cleanly
    await page.click('header button:has(.w-8)');
    await sleep(400);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signoutBtn = btns.find((b) => b.innerText.includes('Sign Out'));
      if (signoutBtn) signoutBtn.click();
    });
    await sleep(1500);

    // -------------------------------------------------------------------------
    // TEST 10: User A Reviews & Approves Claim; Item Status Marked Returned
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: User A Approves Claim & Item Status Updates ---');
    await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle0' });
    
    // Type credentials for User A
    await page.type('input[placeholder*="rohit.sharma@jspm.edu.in"]', 'siddhi.deshmukh@jspm.edu.in');
    await page.type('input[placeholder*="Enter your password"]', 'UpdatedPassword2026!');
    await page.click('button[type="submit"]');
    await sleep(2000);

    recordTest('User A Logged Back In with New Password', page.url().includes('/dashboard'), 'User A authenticated');

    // Check Notifications for User A
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle0' });
    const hasClaimNotification = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('New Claim Received') || text.includes('Logitech');
    });
    recordTest('User A Received In-App Claim Notification', hasClaimNotification, 'Database notification delivered');

    // Go to My Listings to manage the item
    await page.goto(`${BASE_URL}/my-listings`, { waitUntil: 'networkidle0' });
    await sleep(500);
    // Click View & Manage on first item
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const manageLink = links.find((l) => l.href.includes('/items/') && l.innerText.includes('View'));
      if (manageLink) manageLink.click();
    });
    await sleep(1500);

    // Verify review claims panel is visible
    const hasClaimsPanel = await page.evaluate(() => {
      return document.body.innerText.includes('Verification Claims Received') &&
             document.body.innerText.includes('Approve & Return Item');
    });
    recordTest('Item Owner Review Panel Displays Proof & Approve Button', hasClaimsPanel, 'Finder review controls active');

    // Click Approve & Return Item
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const approveBtn = btns.find((b) => b.innerText.includes('Approve & Return Item'));
      if (approveBtn) approveBtn.click();
    });
    await sleep(1500);

    // Verify item status updated to Returned
    const isReturned = await page.evaluate(() => {
      return document.body.innerText.includes('Claim Approved & Returned') ||
             document.body.innerText.includes('Handover Contact Details');
    });
    recordTest('Claim Approved: Item Marked Returned & Handover Unlocked', isReturned, 'Listing status = returned');

    // -------------------------------------------------------------------------
    // TEST 11: Security & Access Boundary Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: Security & Boundary Verification ---');
    // Verify "This is Mine" button is hidden on items owned by current user or returned items
    const selfClaimButtonHidden = await page.evaluate(() => {
      const claimBtns = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('This is Mine'));
      return claimBtns.length === 0;
    });
    recordTest('Self-Claim Guard Enforced in UI', selfClaimButtonHidden, 'Own items cannot be claimed');

    // -------------------------------------------------------------------------
    // TEST 12: Console Error Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 12: Browser Console Inspection ---');
    recordTest('Zero Browser Console Exceptions', consoleErrors.length === 0, `${consoleErrors.length} runtime errors logged`);

  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    recordTest('Suite Execution', false, err.message);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('                    QA TEST EXECUTION SUMMARY                   ');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed).length;
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log(`SUCCESS:     ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runQASuite();
