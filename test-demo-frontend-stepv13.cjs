/**
 * test-demo-frontend-stepv13.cjs
 * Comprehensive test suite for DentQ Step V1.3: Safe Demo Frontend UX
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP V1.3 SAFE DEMO FRONTEND UX");
console.log("=========================================================\n");

let passedTests = 0;
let totalTests = 0;

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

// ---------------------------------------------------------------------------
// 1. Root Layout: NEXT_PUBLIC_DEMO_MODE Top Banner
// ---------------------------------------------------------------------------
const layoutPath = path.join(__dirname, "src", "app", "layout.tsx");
assert.ok(fs.existsSync(layoutPath), "src/app/layout.tsx must exist");
const layoutContent = fs.readFileSync(layoutPath, "utf-8");

runTest("Layout: Displays Demo Banner controlled by NEXT_PUBLIC_DEMO_MODE === 'true'", () => {
  assert.ok(
    layoutContent.includes('process.env.NEXT_PUBLIC_DEMO_MODE === "true"'),
    "Layout must check process.env.NEXT_PUBLIC_DEMO_MODE === 'true'"
  );
  assert.ok(
    layoutContent.includes("โหมดสาธิต — ข้อมูลจำลอง ไม่ใช่การจองจริง"),
    "Layout must display exact banner message: โหมดสาธิต — ข้อมูลจำลอง ไม่ใช่การจองจริง"
  );
});

// ---------------------------------------------------------------------------
// 2. Booking Page: src/app/book/page.tsx
// ---------------------------------------------------------------------------
const bookPath = path.join(__dirname, "src", "app", "book", "page.tsx");
assert.ok(fs.existsSync(bookPath), "src/app/book/page.tsx must exist");
const bookContent = fs.readFileSync(bookPath, "utf-8");

runTest("Booking: Imports canonical DEMO_MOCK_USER without duplication", () => {
  assert.ok(
    bookContent.includes('import { DEMO_MOCK_USER } from "@/lib/demo-data";'),
    "Booking must import DEMO_MOCK_USER from demo-data"
  );
});

runTest("Booking: Gate View provides Demo Account button using DEMO_MOCK_USER", () => {
  assert.ok(
    bookContent.includes("ทดลองใช้งานด้วยบัญชีจำลอง (สมชาย มั่นคง - Demo Account)"),
    "Must offer clear demo button with patient name"
  );
  assert.ok(
    bookContent.includes("DEMO_MOCK_USER.userId") &&
    bookContent.includes("DEMO_MOCK_USER.displayName") &&
    bookContent.includes("DEMO_MOCK_USER.idToken"),
    "Demo button must set DEMO_MOCK_USER properties"
  );
  assert.ok(
    bookContent.includes("ไม่ใช่ LINE Login จริง และไม่บันทึกข้อมูลจริง"),
    "Must explicitly clarify that demo login is not real LINE Login"
  );
});

runTest("Booking: Real LINE Login via LIFF is preserved and not mixed up", () => {
  assert.ok(
    bookContent.includes("handleLineLogin") &&
    bookContent.includes("เข้าสู่ระบบด้วย LINE เพื่อเริ่มจองคิว"),
    "Real LINE Login button must remain available"
  );
  assert.ok(
    bookContent.includes("https://static.line-scdn.net/liff/edge/2/sdk.js"),
    "LIFF SDK script must be preserved"
  );
});

runTest("Booking: Profile Banner displays distinct Demo badge when logged in with mock user", () => {
  assert.ok(
    bookContent.includes("lineProfile.userId === DEMO_MOCK_USER.userId"),
    "Must check whether logged in user is DEMO_MOCK_USER"
  );
  assert.ok(
    bookContent.includes("บัญชีจำลอง Demo (ไม่บันทึกจริง)"),
    "Must display distinct Demo badge"
  );
});

runTest("Booking: Digital Ticket displays PENDING status and explicit demo non-permanent notice", () => {
  assert.ok(
    bookContent.includes("รอเจ้าหน้าที่ตรวจสอบ (PENDING)"),
    "Digital ticket must show PENDING status"
  );
  assert.ok(
    bookContent.includes("คิวจำลองเพื่อการสาธิต (Demo) — ไม่บันทึกถาวร"),
    "Digital ticket must include non-permanent notice"
  );
  assert.ok(
    bookContent.includes("ระบบแสดงตัวอย่างการออกบัตรคิวสถานะ PENDING โดยไม่มีการบันทึกข้อมูลจริง"),
    "Notification banner must explain PENDING demo behavior without claiming approval"
  );
});

// ---------------------------------------------------------------------------
// 3. Tracking Page: src/app/tracking/page.tsx
// ---------------------------------------------------------------------------
const trackingPath = path.join(__dirname, "src", "app", "tracking", "page.tsx");
assert.ok(fs.existsSync(trackingPath), "src/app/tracking/page.tsx must exist");
const trackingContent = fs.readFileSync(trackingPath, "utf-8");

runTest("Tracking: Imports canonical DEMO_MOCK_USER", () => {
  assert.ok(
    trackingContent.includes('import { DEMO_MOCK_USER } from "@/lib/demo-data";'),
    "Tracking must import DEMO_MOCK_USER from demo-data"
  );
});

runTest("Tracking: Gate View provides Demo Account button", () => {
  assert.ok(
    trackingContent.includes("ทดลองใช้งานด้วยบัญชีจำลอง (สมชาย มั่นคง - Demo Account)"),
    "Must offer clear demo button with patient name"
  );
  assert.ok(
    trackingContent.includes("DEMO_MOCK_USER.userId") &&
    trackingContent.includes("DEMO_MOCK_USER.displayName") &&
    trackingContent.includes("DEMO_MOCK_USER.idToken"),
    "Demo button must set DEMO_MOCK_USER properties"
  );
});

runTest("Tracking: Header displays Demo Notice and distinct badge", () => {
  assert.ok(
    trackingContent.includes("บัญชีจำลอง Demo"),
    "Profile header must show distinct Demo badge"
  );
  assert.ok(
    trackingContent.includes("โหมดสาธิต (Demo Tracking):"),
    "Must display Demo Tracking notice above bookings"
  );
  assert.ok(
    trackingContent.includes("DEN-001 รอตรวจสอบ, DEN-002 ยืนยันแล้ว, DEN-005 ไม่อนุมัติพร้อมเหตุผลตัวอย่าง"),
    "Must highlight the 3 diverse statuses in demo tracking"
  );
});

runTest("Tracking: Displays REJECTED status with real reason and re-booking button", () => {
  assert.ok(
    trackingContent.includes("ไม่อนุมัติการจอง (Rejected)"),
    "Tracking must display REJECTED badge"
  );
  assert.ok(
    trackingContent.includes("b.rejectReason") || trackingContent.includes("booking.rejectReason"),
    "Tracking must display actual rejectReason"
  );
  assert.ok(
    trackingContent.includes("จองคิวใหม่") && trackingContent.includes('href="/book"'),
    "Tracking must provide re-booking button to /book"
  );
});

// ---------------------------------------------------------------------------
// 4. Login & Admin Page: src/app/login/page.tsx & src/app/admin/page.tsx
// ---------------------------------------------------------------------------
const loginPath = path.join(__dirname, "src", "app", "login", "page.tsx");
assert.ok(fs.existsSync(loginPath), "src/app/login/page.tsx must exist");
const loginContent = fs.readFileSync(loginPath, "utf-8");

runTest("Login: Provides direct Demo Dashboard entrance button", () => {
  assert.ok(
    loginContent.includes("เข้าชมแดชบอร์ดสาธิต (Demo Dashboard)"),
    "Login page must provide demo dashboard access button"
  );
  assert.ok(
    loginContent.includes('admin_session=demo_admin_token') || loginContent.includes('admin_session='),
    "Must set admin_session cookie for demo dashboard"
  );
  assert.ok(
    loginContent.includes('/admin'),
    "Must redirect to /admin"
  );
});

const adminPath = path.join(__dirname, "src", "app", "admin", "page.tsx");
assert.ok(fs.existsSync(adminPath), "src/app/admin/page.tsx must exist");
const adminContent = fs.readFileSync(adminPath, "utf-8");

runTest("Admin Dashboard: Displays prominent Demo Mode banner", () => {
  assert.ok(
    adminContent.includes("แดชบอร์ดระบบสาธิต (Admin Demo Mode — ข้อมูลจำลอง)"),
    "Admin must display prominent Demo Mode title"
  );
  assert.ok(
    adminContent.includes("ไม่มีการส่งข้อความจริงไปยัง LINE และไม่มีการบันทึกข้อมูลถาวร"),
    "Admin banner must clearly state LINE and storage non-permanence"
  );
  assert.ok(
    adminContent.includes("DEMO ONLY"),
    "Admin must show DEMO ONLY badge"
  );
});

runTest("Admin Reject Dialog: Warns that rejection is simulated and does not send real LINE", () => {
  assert.ok(
    adminContent.includes("การปฏิเสธคิวเป็นการจำลอง") &&
    adminContent.includes("ไม่มีการส่งข้อความจริงไปยัง LINE"),
    "Reject dialog must warn that action is simulated in Demo Mode"
  );
});

// ---------------------------------------------------------------------------
// 5. Security & Isolation Verification
// ---------------------------------------------------------------------------
runTest("Security: Production mode with NEXT_PUBLIC_DEMO_MODE=false hides demo buttons", () => {
  // Check conditions in code:
  // (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development")
  assert.ok(
    bookContent.includes('process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development"'),
    "Booking must guard demo button"
  );
  assert.ok(
    trackingContent.includes('process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development"'),
    "Tracking must guard demo button"
  );
  assert.ok(
    loginContent.includes('process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development"'),
    "Login must guard demo button"
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log("=========================================================");

if (passedTests === totalTests) {
  console.log("\n>>> ALL STEP V1.3 DEMO FRONTEND UX TESTS PASSED! <<<\n");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<\n");
  process.exit(1);
}
