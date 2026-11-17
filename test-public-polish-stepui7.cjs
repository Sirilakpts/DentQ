/**
 * test-public-polish-stepui7.cjs
 * Comprehensive test suite for DentQ — STEP UI 7: FINAL PUBLIC UX POLISH
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
console.log('TEST SUITE: STEP UI 7 FINAL PUBLIC UX POLISH');
console.log('=========================================================\n');

// ---------------------------------------------------------------------------
// 1. Booking Stepper 4 Steps (src/app/book/page.tsx)
// ---------------------------------------------------------------------------
const bookPath = path.join(__dirname, 'src', 'app', 'book', 'page.tsx');
assert.ok(fs.existsSync(bookPath), 'src/app/book/page.tsx must exist');
const bookContent = fs.readFileSync(bookPath, 'utf8');

runTest('Booking Stepper: 4 distinct steps with proper titles', () => {
  assert.ok(bookContent.includes('เลือกบริการ'), 'Step 1 must be เลือกบริการ');
  assert.ok(bookContent.includes('เลือกวันและเวลา'), 'Step 2 must be เลือกวันและเวลา');
  assert.ok(bookContent.includes('ข้อมูลผู้จอง'), 'Step 3 must be ข้อมูลผู้จอง');
  assert.ok(bookContent.includes('ตรวจสอบและยืนยัน'), 'Step 4 must be ตรวจสอบและยืนยัน');
});

runTest('Booking Navigation: Prominent Next & Back buttons', () => {
  assert.ok(bookContent.includes('ถัดไป: เลือกวันและเวลา'), 'Step 1 must have next button to step 2');
  assert.ok(bookContent.includes('ถัดไป: ข้อมูลผู้จอง & สิทธิการรักษา'), 'Step 2 must have next button to step 3');
  assert.ok(bookContent.includes('ยืนยันการจองคิวทันที'), 'Step 3 must have submit button');
  assert.ok(bookContent.includes('ย้อนกลับ'), 'Must have back buttons in step 2 and step 3');
});

runTest('Booking Data Integrity: Retains 5 medical rights, optional phone, and morning quota', () => {
  const rights = ['บัตรทอง', 'ประกันสังคม', 'ข้าราชการ', 'ชำระเอง', 'ไม่แน่ใจ'];
  for (const r of rights) {
    assert.ok(bookContent.includes(`"${r}"`), `Must include medical rights: ${r}`);
  }
  assert.ok(bookContent.includes('ไม่บังคับ (Optional)'), 'Must clearly mark phone as optional');
  assert.ok(bookContent.includes('รับจองสูงสุด 6 คนรวมทุกบริการ'), 'Must maintain morning quota rules');
});

// ---------------------------------------------------------------------------
// 2. Digital Ticket (Step 4 in src/app/book/page.tsx)
// ---------------------------------------------------------------------------
runTest('Digital Ticket: Prominently displays queue number and appointment details', () => {
  assert.ok(bookContent.includes('createdBooking.queueNumber || createdBooking.id'), 'Must display queue number');
  assert.ok(bookContent.includes('createdBooking.date || selectedDate'), 'Must display appointment date');
  assert.ok(bookContent.includes('createdBooking.time || selectedSlot?.time'), 'Must display appointment time');
  assert.ok(bookContent.includes('createdBooking.service?.nameTh || selectedService?.nameTh'), 'Must display service name');
});

runTest('Digital Ticket: Explicit PENDING status and Demo simulation disclaimer', () => {
  assert.ok(
    bookContent.includes('รอเจ้าหน้าที่ตรวจสอบ (PENDING)'),
    'Status badge must state รอเจ้าหน้าที่ตรวจสอบ (PENDING)'
  );
  assert.ok(
    bookContent.includes('คิวจำลองเพื่อการสาธิต (Demo) — ไม่บันทึกถาวร'),
    'Must display explicit demo simulation notice'
  );
});

runTest('Digital Ticket: Direct button to tracking system (/tracking?q=...)', () => {
  assert.ok(
    bookContent.includes('/tracking?q='),
    'Must link directly to /tracking?q=...'
  );
  assert.ok(
    bookContent.includes('ตรวจสอบคิวในระบบติดตาม'),
    'Must have clear tracking CTA button'
  );
});

// ---------------------------------------------------------------------------
// 3. Tracking Page (/tracking in src/app/tracking/page.tsx)
// ---------------------------------------------------------------------------
const trackingPath = path.join(__dirname, 'src', 'app', 'tracking', 'page.tsx');
assert.ok(fs.existsSync(trackingPath), 'src/app/tracking/page.tsx must exist');
const trackingContent = fs.readFileSync(trackingPath, 'utf8');

runTest('Tracking UI: Modern Government Minimal Theme (#063466, #D5A423, #F5F7FA)', () => {
  assert.ok(trackingContent.includes('#063466'), 'Must use Primary Navy #063466');
  assert.ok(trackingContent.includes('#D5A423'), 'Must use Accent Gold #D5A423');
  assert.ok(trackingContent.includes('#F5F7FA'), 'Must use Government Background #F5F7FA');
});

runTest('Tracking Statuses: Distinct styles for PENDING, CONFIRMED, and REJECTED', () => {
  assert.ok(trackingContent.includes('รอเจ้าหน้าที่ตรวจสอบ (Pending)'), 'Must handle PENDING status');
  assert.ok(trackingContent.includes('ได้รับการยืนยันแล้ว (Confirmed)'), 'Must handle CONFIRMED status');
  assert.ok(trackingContent.includes('ไม่อนุมัติการจอง (Rejected)'), 'Must handle REJECTED status');
});

runTest('Tracking REJECTED: Displays actual rejectReason and re-booking button to /book', () => {
  assert.ok(
    trackingContent.includes('b.rejectReason && b.rejectReason.trim()'),
    'Must display actual rejectReason from data without fake text'
  );
  assert.ok(
    !trackingContent.includes('คลินิกไม่สามารถรับนัดหมายในวันและเวลาดังกล่าวได้ กรุณาทำการจองคิวใหม่หรือติดต่อคลินิก'),
    'Must not invent fake rejection claims'
  );
  assert.ok(
    trackingContent.includes('📅 จองคิวใหม่') && trackingContent.includes('href="/book"'),
    'Must provide 📅 จองคิวใหม่ button linking to /book'
  );
});

runTest('Tracking Security: LINE-First authentication required and demo button guarded', () => {
  assert.ok(
    trackingContent.includes('if (!lineProfile || !lineIdToken)'),
    'Must enforce LINE login gate'
  );
  assert.ok(
    trackingContent.includes('process.env.NEXT_PUBLIC_DEMO_MODE === "true"'),
    'Demo button must be guarded by NEXT_PUBLIC_DEMO_MODE'
  );
});

runTest('Tracking Accuracy: Unverified claims removed, mock data explicitly labeled', () => {
  assert.ok(
    !trackingContent.includes('ตามมาตรฐาน PDPA'),
    'Unverified PDPA compliance claims must be removed'
  );
  assert.ok(
    trackingContent.includes('สาขาพญาไท อาคารเดอะพลาซ่า (ข้อมูลจำลอง)'),
    'Clinic branch address must be explicitly labeled as mock data'
  );
  assert.ok(
    trackingContent.includes('โทร 02-999-8888 (ข้อมูลจำลอง)'),
    'Clinic phone must be explicitly labeled as mock data'
  );
});

// ---------------------------------------------------------------------------
// 4. Strict Public / Admin UI Separation
// ---------------------------------------------------------------------------
const homePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const homeContent = fs.readFileSync(homePath, 'utf8');

runTest('Public UI Separation: Zero Admin / Staff / Dashboard links on public pages', () => {
  const publicPages = [
    { name: 'Home (/)', content: homeContent },
    { name: 'Booking (/book)', content: bookContent },
    { name: 'Tracking (/tracking)', content: trackingContent },
  ];

  for (const page of publicPages) {
    assert.ok(!page.content.includes('href="/admin'), `${page.name} must not link to /admin`);
    assert.ok(!page.content.includes('href="/login'), `${page.name} must not link to /login`);
    assert.ok(!page.content.includes('เข้าสู่ระบบเจ้าหน้าที่'), `${page.name} must not show staff login`);
    assert.ok(!page.content.includes('LINE Flex'), `${page.name} must not link to LINE Flex preview`);
  }
});

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP UI 7 PUBLIC UX POLISH TESTS PASSED! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<');
  process.exit(1);
}
