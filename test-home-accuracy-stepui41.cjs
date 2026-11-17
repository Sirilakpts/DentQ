/**
 * test-home-accuracy-stepui41.cjs
 * Comprehensive test suite for DentQ — STEP UI 4.1: HOME CONTENT ACCURACY FIX
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
console.log('TEST SUITE: STEP UI 4.1 HOME CONTENT ACCURACY FIX');
console.log('=========================================================\n');

const homePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const homeContent = fs.readFileSync(homePath, 'utf8');

// 1. Clinic Data Accuracy & Sample Disclaimers
runTest('Clinic Data: Address and phone explicitly marked as sample/mock data', () => {
  assert.ok(homeContent.includes('ข้อมูลจำลอง') || homeContent.includes('หมายเลขจำลอง'), 'Must label sample data as simulated/mock');
  assert.ok(homeContent.includes('02-999-8888, 081-999-7777 (หมายเลขจำลอง)'), 'Phone must be marked as sample');
  assert.ok(homeContent.includes('สาขาพญาไท อาคารเดอะพลาซ่า (ข้อมูลจำลอง)') || homeContent.includes('ข้อมูลที่อยู่จำลอง'), 'Address must be marked as sample');
});

runTest('Clinic Data: Clear disclaimer that official contacts will be announced upon actual launch', () => {
  assert.ok(homeContent.includes('ช่องทางทางการจะแจ้งเมื่อเปิดบริการจริง') || homeContent.includes('ข้อมูลจำลองเพื่อการสาธิตระบบ'),
    'Must indicate official contacts will be provided on actual release');
});

// 2. Queue Quota Accuracy (Morning <= 6, Afternoon standard slots)
runTest('Queue Count: Morning specifies max 6 queues across all services', () => {
  assert.ok(homeContent.includes('รอบเช้า (09:00 - 12:00 น.):') && homeContent.includes('ทุกบริการรวมกันไม่เกิน 6 คิว'),
    'Morning queue must specify "ทุกบริการรวมกันไม่เกิน 6 คิว"');
});

runTest('Queue Count: Afternoon does NOT claim 6 queues quota, specifies standard slots', () => {
  assert.ok(homeContent.includes('รอบบ่าย (13:00 - 16:00 น.):') && homeContent.includes('ให้บริการตามสล็อตนัดหมายปกติ'),
    'Afternoon must follow standard appointment slots without 6 queues restriction');
  // Verify that afternoon is not claimed as 6 queues
  const afternoonLine = homeContent.split('รอบบ่าย')[1]?.split('\n')[0] || '';
  assert.ok(!afternoonLine.includes('6 คิว'), 'Afternoon must not claim 6 queues quota');
});

// 3. Claims Accuracy (No PDPA claim, No Real-time claim, No false LINE live push on Demo)
runTest('Claims: Does NOT claim "PDPA Compliant" or unverified legal compliance', () => {
  assert.ok(!homeContent.includes('PDPA Compliant'), 'Must not claim "PDPA Compliant"');
  assert.ok(!homeContent.includes('มาตรฐานความปลอดภัย PDPA'), 'Must not claim "มาตรฐานความปลอดภัย PDPA"');
  assert.ok(!homeContent.includes('มาตรฐาน PDPA'), 'Must not claim "มาตรฐาน PDPA"');
});

runTest('Claims: Does NOT claim "Real-time" or automated live LINE notification on Demo', () => {
  assert.ok(!homeContent.includes('Real-time'), 'Must not claim "Real-time"');
  assert.ok(!homeContent.includes('การแจ้งเตือนผ่าน LINE อัตโนมัติ'), 'Must not claim automated live LINE notification');
});

runTest('Hero Section: Concise, friendly Thai copy (<= 2 lines)', () => {
  assert.ok(homeContent.includes('จองคิวทำฟันออนไลน์'), 'Headline must be จองคิวทำฟันออนไลน์');
  assert.ok(homeContent.includes('จองคิวทำฟันเลย'), 'Primary button must be จองคิวทำฟันเลย');
  assert.ok(homeContent.includes('href="/book"'), 'Primary action must link to /book');
  assert.ok(homeContent.includes('href="/tracking"'), 'Secondary action must link to /tracking');
});

// 4. Design & Structure Preservation
runTest('Design: Hero dentist and child vector illustration preserved', () => {
  assert.ok(homeContent.includes('<svg') && homeContent.includes('viewBox="0 0 320 220"'), 'Hero vector illustration must be preserved');
  assert.ok(homeContent.includes('E0F2FE') || homeContent.includes('EBF3FA'), 'Light blue friendly tone preserved');
});

runTest('Design: Booking Steps 4 steps preserved (Desktop horizontal, Mobile 2 cols)', () => {
  assert.ok(homeContent.includes('เลือกบริการ'), 'Step 1 preserved');
  assert.ok(homeContent.includes('เลือกวันเวลา'), 'Step 2 preserved');
  assert.ok(homeContent.includes('กรอกข้อมูล'), 'Step 3 preserved');
  assert.ok(homeContent.includes('ยืนยันการจอง'), 'Step 4 preserved');
  assert.ok(homeContent.includes('grid-cols-2') && (homeContent.includes('md:grid-cols-4') || homeContent.includes('lg:grid-cols-4')), 'Responsive layout preserved');
});

runTest('Design: Information Cards 4 cards preserved', () => {
  assert.ok(homeContent.includes('บริการทันตกรรม'), 'Card 1 preserved');
  assert.ok(homeContent.includes('ตรวจสอบคิว'), 'Card 2 preserved');
  assert.ok(homeContent.includes('เวลาทำการ'), 'Card 3 preserved');
  assert.ok(homeContent.includes('ติดต่อคลินิก'), 'Card 4 preserved');
});

runTest('Security: Absolutely ZERO admin navigation in Public Home page', () => {
  assert.ok(!homeContent.includes('href="/admin'), 'Must not contain /admin links');
  assert.ok(!homeContent.includes('href="/login"'), 'Must not contain /login links');
  assert.ok(!homeContent.includes('เข้าสู่ระบบเจ้าหน้าที่'), 'Must not contain staff login');
});

runTest('Theme: Follows Modern Government Minimal palette (Navy, Gold, Background)', () => {
  assert.ok(homeContent.includes('#063466'), 'Must use Navy #063466');
  assert.ok(homeContent.includes('#D5A423'), 'Must use Gold #D5A423');
  assert.ok(homeContent.includes('#F5F7FA'), 'Must use Background #F5F7FA');
});

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP UI 4.1 HOME CONTENT ACCURACY TESTS PASSED! <<<\n');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<\n');
  process.exit(1);
}
