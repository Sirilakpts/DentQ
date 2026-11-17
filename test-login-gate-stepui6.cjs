/**
 * test-login-gate-stepui6.cjs
 * Comprehensive test suite for DentQ — STEP UI 6: LINE-FIRST BOOKING LOGIN GATE
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
console.log('TEST SUITE: STEP UI 6 LINE-FIRST BOOKING LOGIN GATE');
console.log('=========================================================\n');

const bookPath = path.join(__dirname, 'src', 'app', 'book', 'page.tsx');
assert.ok(fs.existsSync(bookPath), 'src/app/book/page.tsx must exist');
const bookContent = fs.readFileSync(bookPath, 'utf8');

// 1. LINE-First Access Gate
runTest('LINE-First: Enforces login gate before stepper access', () => {
  assert.ok(
    bookContent.includes('if (!lineProfile || !lineIdToken)'),
    'Must block booking stepper when not authenticated'
  );
  assert.ok(
    bookContent.includes('ไม่มี Guest Mode'),
    'Must strictly state no guest mode'
  );
});

runTest('LIFF Reuse: Uses official LIFF SDK and checks existing session', () => {
  assert.ok(
    bookContent.includes('https://static.line-scdn.net/liff/edge/2/sdk.js'),
    'Must load official LIFF SDK'
  );
  assert.ok(
    bookContent.includes('liff.isLoggedIn()'),
    'Must check if already logged in via LIFF'
  );
  assert.ok(
    bookContent.includes('liff.getIDToken()') && bookContent.includes('liff.getProfile()'),
    'Must retrieve token and profile without forcing re-login if already logged in'
  );
});

// 2. Server-side Token Verification & Security
runTest('Security: Requires lineIdToken in submit payload and validates before POST', () => {
  assert.ok(
    bookContent.includes('if (!lineProfile || !lineIdToken)'),
    'Submit handler must check profile and token'
  );
  assert.ok(
    bookContent.includes('lineIdToken: lineIdToken'),
    'Payload must pass lineIdToken for server-side verification'
  );
});

// 3. Demo Mode Guard & Clear Disclaimers
runTest('Demo Mode: Provides demo account button guarded by demo flag', () => {
  assert.ok(
    bookContent.includes('NEXT_PUBLIC_DEMO_MODE === "true"'),
    'Demo button must be guarded by NEXT_PUBLIC_DEMO_MODE'
  );
  assert.ok(
    bookContent.includes('DEMO_MOCK_USER'),
    'Must use canonical DEMO_MOCK_USER'
  );
  assert.ok(
    bookContent.includes('ไม่ใช่ LINE Login จริง และไม่บันทึกข้อมูลจริง'),
    'Must clarify mock account is not real LINE Login'
  );
});

// 4. Clean Login UI
runTest('Clean UI: Main headline is "เข้าสู่ระบบเพื่อจองคิวทำฟัน"', () => {
  assert.ok(
    bookContent.includes('เข้าสู่ระบบเพื่อจองคิวทำฟัน'),
    'Headline must be เข้าสู่ระบบเพื่อจองคิวทำฟัน'
  );
});

runTest('Clean UI: Short, concise description (<= 2 lines)', () => {
  assert.ok(
    bookContent.includes('เข้าสู่ระบบผ่าน LINE เพื่อยืนยันตัวตนและรับตั๋วคิวดิจิทัล สะดวก รวดเร็ว โดยไม่ต้องกรอกเลขบัตรประชาชน'),
    'Must have concise 2-line description'
  );
});

runTest('Clean UI: Primary LINE Login button in official green (#06C755)', () => {
  assert.ok(
    bookContent.includes('bg-[#06C755]'),
    'Primary button must use official LINE green #06C755'
  );
  assert.ok(
    bookContent.includes('เข้าสู่ระบบด้วย LINE'),
    'Primary button text must include เข้าสู่ระบบด้วย LINE'
  );
});

runTest('Clean UI: Concise Red-Flag / 1669 emergency warning', () => {
  assert.ok(
    bookContent.includes('1669'),
    'Emergency alert must provide 1669 hotline'
  );
  assert.ok(
    bookContent.includes('หายใจลำบาก') || bookContent.includes('กลืนลำบาก'),
    'Must mention red-flag emergency symptoms'
  );
});

runTest('Clean UI: Zero redundant PDPA claims in Login Gate highlight box', () => {
  // Extract Login Gate block
  const gateBlock = bookContent.split('if (!lineProfile || !lineIdToken)')[1]?.split('// LIFF SDK')[0] || '';
  assert.ok(
    !gateBlock.includes('มาตรฐาน PDPA:'),
    'Must not make redundant or unverified PDPA claims in login gate highlight'
  );
});

// 5. Public Separation
runTest('Public Separation: Zero admin links or developer tools in Booking page', () => {
  assert.ok(
    !bookContent.includes('href="/admin'),
    'Must not contain /admin links'
  );
  assert.ok(
    !bookContent.includes('href="/login"'),
    'Must not contain /login staff links'
  );
  assert.ok(
    !bookContent.includes('LINE Flex Preview') && !bookContent.includes('Developer'),
    'Must not contain admin or developer shortcuts'
  );
});

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP UI 6 LOGIN GATE TESTS PASSED! <<<\n');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<\n');
  process.exit(1);
}
