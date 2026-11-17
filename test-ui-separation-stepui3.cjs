/**
 * test-ui-separation-stepui3.cjs
 * Test suite for DentQ — STEP UI 3: STRICT PUBLIC / ADMIN UI SEPARATION
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log('=========================================================');
console.log('TEST SUITE: STEP UI 3 STRICT PUBLIC / ADMIN UI SEPARATION');
console.log('=========================================================\n');

// 1. Check Home Page (src/app/page.tsx)
const homePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const homeContent = fs.readFileSync(homePath, 'utf8');

runTest('Home Page Hero: NO Emergency SOS link to /admin/emergency', () => {
  assert.ok(!homeContent.includes('href="/admin/emergency"'), 'Hero section must not contain link to /admin/emergency');
  assert.ok(!homeContent.includes('ติดต่อเคสฉุกเฉิน'), 'Hero section must not show "ติดต่อเคสฉุกเฉิน" button');
});

runTest('Home Page Hero: ONLY Public citizen actions (จองคิว & เช็กสถานะ)', () => {
  assert.ok(homeContent.includes('href="/book"'), 'Hero section must have link to /book');
  assert.ok(homeContent.includes('href="/tracking"'), 'Hero section must have link to /tracking');
});

runTest('Home Page Footer: NO Staff Login link (/login)', () => {
  assert.ok(!homeContent.includes('href="/login"'), 'Footer must not have link to /login');
  assert.ok(!homeContent.includes('เข้าสู่ระบบเจ้าหน้าที่'), 'Footer must not show "เข้าสู่ระบบเจ้าหน้าที่" link');
});

// 2. Check Navbar (src/components/Navbar.tsx)
const navbarPath = path.join(__dirname, 'src', 'components', 'Navbar.tsx');
const navbarContent = fs.readFileSync(navbarPath, 'utf8');

runTest('Navbar: Strict segregation between citizen and admin view', () => {
  assert.ok(navbarContent.includes('pathname.startsWith("/admin")'), 'Navbar must distinguish admin pages via pathname.startsWith("/admin")');
});

runTest('Navbar: Citizen Desktop Navigation contains ONLY /, /book, /tracking', () => {
  // Extract citizen branch
  const citizenDesktopBlock = navbarContent.split('// ประชาชนทั่วไป')[1]?.split('</nav>')[0] || '';
  assert.ok(citizenDesktopBlock.includes('href="/"'), 'Citizen nav must include / (หน้าหลัก)');
  assert.ok(citizenDesktopBlock.includes('href="/book"'), 'Citizen nav must include /book');
  assert.ok(citizenDesktopBlock.includes('href="/tracking"'), 'Citizen nav must include /tracking');
  assert.ok(!citizenDesktopBlock.includes('href="/admin"'), 'Citizen nav must NOT include /admin');
  assert.ok(!citizenDesktopBlock.includes('href="/login"'), 'Citizen nav must NOT include /login');
  assert.ok(!citizenDesktopBlock.includes('LINE Flex'), 'Citizen nav must NOT include LINE Flex');
});

runTest('Navbar: Citizen Mobile Navigation contains ONLY /, /book, /tracking and NO admin links', () => {
  const citizenMobileBlock = navbarContent.split('// Mobile Sub Navigation')[1]?.split('</header>')[0] || '';
  assert.ok(!citizenMobileBlock.includes('href="/admin"'), 'Citizen mobile subnav must NOT include /admin');
  assert.ok(!citizenMobileBlock.includes('แดชบอร์ด'), 'Citizen mobile subnav must NOT show แดชบอร์ด to citizens');
  assert.ok(!citizenMobileBlock.includes('LINE Flex'), 'Citizen mobile subnav must NOT show LINE Flex to citizens');
});

runTest('Navbar: Admin links preserved when pathname is /admin*', () => {
  assert.ok(navbarContent.includes('href="/admin"'), 'Admin nav must preserve /admin');
  assert.ok(navbarContent.includes('href="/admin/emergency"'), 'Admin nav must preserve /admin/emergency');
  assert.ok(navbarContent.includes('href="/admin/line-preview"'), 'Admin nav must preserve /admin/line-preview');
});

// 3. Check Booking Page (src/app/book/page.tsx)
const bookPath = path.join(__dirname, 'src', 'app', 'book', 'page.tsx');
const bookContent = fs.readFileSync(bookPath, 'utf8');

runTest('Booking Page: Zero admin links or backend developer shortcuts', () => {
  assert.ok(!bookContent.includes('href="/admin'), 'Booking page must not link to /admin');
  assert.ok(!bookContent.includes('href="/login'), 'Booking page must not link to /login');
});

// 4. Check Tracking Page (src/app/tracking/page.tsx)
const trackingPath = path.join(__dirname, 'src', 'app', 'tracking', 'page.tsx');
const trackingContent = fs.readFileSync(trackingPath, 'utf8');

runTest('Tracking Page: Zero admin links or backend developer shortcuts', () => {
  assert.ok(!trackingContent.includes('href="/admin'), 'Tracking page must not link to /admin');
  assert.ok(!trackingContent.includes('href="/login'), 'Tracking page must not link to /login');
});

// 5. Check Root Layout (src/app/layout.tsx)
const layoutPath = path.join(__dirname, 'src', 'app', 'layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

runTest('Root Layout: Uses clean Navbar component without inlined admin links', () => {
  assert.ok(layoutContent.includes('<Navbar />') || layoutContent.includes('<Navbar/>'), 'Root layout must render <Navbar />');
  assert.ok(!layoutContent.includes('href="/admin'), 'Root layout must not have inlined /admin links');
});

// 6. Check Admin & Login Pages Preservation
runTest('Admin & Login Pages exist and remain untouched', () => {
  assert.ok(fs.existsSync(path.join(__dirname, 'src', 'app', 'login', 'page.tsx')), 'src/app/login/page.tsx must exist');
  assert.ok(fs.existsSync(path.join(__dirname, 'src', 'app', 'admin', 'page.tsx')), 'src/app/admin/page.tsx must exist');
  assert.ok(fs.existsSync(path.join(__dirname, 'src', 'app', 'admin', 'emergency', 'page.tsx')), 'src/app/admin/emergency/page.tsx must exist');
  assert.ok(fs.existsSync(path.join(__dirname, 'src', 'app', 'admin', 'line-preview', 'page.tsx')), 'src/app/admin/line-preview/page.tsx must exist');
});

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP UI 3 UI SEPARATION TESTS PASSED! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<');
  process.exit(1);
}
