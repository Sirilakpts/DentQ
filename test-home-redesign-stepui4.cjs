/**
 * test-home-redesign-stepui4.cjs
 * Comprehensive test suite for DentQ — STEP UI 4: CLEAN DENTAL HOME REDESIGN
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
console.log('TEST SUITE: STEP UI 4 CLEAN DENTAL HOME REDESIGN');
console.log('=========================================================\n');

const homePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const homeContent = fs.readFileSync(homePath, 'utf8');

// 1. Hero Section Specifications
runTest('Hero Section: Main headline is exactly "จองคิวทำฟันออนไลน์"', () => {
  assert.ok(homeContent.includes('จองคิวทำฟันออนไลน์'), 'Headline must be จองคิวทำฟันออนไลน์');
});

runTest('Hero Section: Primary button "จองคิวทำฟันเลย" links strictly to /book', () => {
  assert.ok(homeContent.includes('จองคิวทำฟันเลย'), 'Must have button "จองคิวทำฟันเลย"');
  assert.ok(homeContent.includes('href="/book"'), 'Primary action must link to /book');
});

runTest('Hero Section: Secondary button links to /tracking', () => {
  assert.ok(homeContent.includes('href="/tracking"'), 'Secondary action must link to /tracking');
});

runTest('Hero Section: Contains friendly dentist & patient vector artwork without unauthorized web images', () => {
  assert.ok(homeContent.includes('<svg') && homeContent.includes('viewBox="0 0 320 220"'), 'Hero must render vector SVG artwork');
  assert.ok(!homeContent.includes('https://') || !homeContent.includes('<img'), 'Must not hotlink unauthorized external images in hero');
  assert.ok(homeContent.includes('E0F2FE') || homeContent.includes('EBF3FA'), 'Must use warm light blue palette');
});

// 2. Booking Steps (4 Steps)
runTest('Booking Steps: Contains all 4 required steps', () => {
  assert.ok(homeContent.includes('เลือกบริการ'), 'Must include Step 1: เลือกบริการ');
  assert.ok(homeContent.includes('เลือกวันเวลา'), 'Must include Step 2: เลือกวันเวลา');
  assert.ok(homeContent.includes('กรอกข้อมูล'), 'Must include Step 3: กรอกข้อมูล');
  assert.ok(homeContent.includes('ยืนยันการจอง'), 'Must include Step 4: ยืนยันการจอง');
});

runTest('Booking Steps: Layout is 4 columns on Desktop and 2 columns on Mobile', () => {
  assert.ok(homeContent.includes('grid-cols-2') && (homeContent.includes('md:grid-cols-4') || homeContent.includes('lg:grid-cols-4')),
    'Booking steps must use grid-cols-2 on mobile and 4 columns on desktop');
});

// 3. Information Cards (Exactly 4 Cards)
runTest('Information Cards: Displays exactly the 4 required cards', () => {
  assert.ok(homeContent.includes('บริการทันตกรรม'), 'Card 1 must be บริการทันตกรรม');
  assert.ok(homeContent.includes('ตรวจสอบคิว'), 'Card 2 must be ตรวจสอบคิว');
  assert.ok(homeContent.includes('เวลาทำการ'), 'Card 3 must be เวลาทำการ');
  assert.ok(homeContent.includes('ติดต่อคลินิก'), 'Card 4 must be ติดต่อคลินิก');
});

runTest('Information Cards: Uses verified system clinic data (hours, phones, address)', () => {
  assert.ok(homeContent.includes('09:00 - 17:00 น.'), 'Must use verified hours 09:00 - 17:00 น.');
  assert.ok(homeContent.includes('02-999-8888, 081-999-7777'), 'Must use verified phone numbers');
  assert.ok(homeContent.includes('สาขาพญาไท') && homeContent.includes('อาคารเดอะพลาซ่า'), 'Must use verified clinic address');
});

// 4. Footer & Demo Mode
runTest('Footer: Displays DentQ, confirmed contact info, and Demo Mode indicator', () => {
  assert.ok(homeContent.includes('DentQ'), 'Footer must contain DentQ');
  assert.ok(homeContent.includes('NEXT_PUBLIC_DEMO_MODE'), 'Footer must support Demo Mode notice');
  assert.ok(homeContent.includes('02-999-8888'), 'Footer must contain confirmed contact info');
});

runTest('Security & Cleanliness: Absolutely ZERO admin links in Home page', () => {
  assert.ok(!homeContent.includes('href="/admin'), 'Home page must not link to /admin');
  assert.ok(!homeContent.includes('href="/login"'), 'Home page must not link to /login');
  assert.ok(!homeContent.includes('เข้าสู่ระบบเจ้าหน้าที่'), 'Home page must not contain staff login');
  assert.ok(!homeContent.includes('ติดต่อเคสฉุกเฉิน'), 'Home page must not contain emergency SOS button');
});

// 5. Palette and Styling Compatibility
runTest('Theme: Follows Modern Government Minimal palette (Navy, Gold, Light Blue, Background)', () => {
  assert.ok(homeContent.includes('#063466'), 'Must use Navy #063466');
  assert.ok(homeContent.includes('#D5A423'), 'Must use Gold #D5A423');
  assert.ok(homeContent.includes('#F5F7FA'), 'Must use Background #F5F7FA');
  assert.ok(homeContent.includes('bg-slate-50'), 'Preserves fallback utility classes for styling test');
});

runTest('Touch Target & Accessibility: Primary buttons have proper touch height (min 48px)', () => {
  assert.ok(homeContent.includes('min-h-[48px]'), 'Buttons must have touch friendly min-h-[48px]');
});

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP UI 4 CLEAN HOME REDESIGN TESTS PASSED! <<<\n');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<\n');
  process.exit(1);
}
