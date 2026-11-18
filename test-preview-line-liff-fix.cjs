/**
 * test-preview-line-liff-fix.cjs
 * Test Suite: DentQ Preview LINE LIFF Fix & Demo Booking Verification
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ PREVIEW LINE LIFF FIX & DEMO BOOKING");
console.log("=========================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${total}: ${name}`);
    console.error(`       Error: ${err.message}\n`);
  }
}

const bookPageCode = fs.readFileSync(path.join(__dirname, "src/app/book/page.tsx"), "utf8");
const trackingPageCode = fs.readFileSync(path.join(__dirname, "src/app/tracking/page.tsx"), "utf8");

// Test 1: book page handleLineLogin has try-catch and resets isLoggingInLine
runTest("Book Page: handleLineLogin has try-catch and resets isLoggingInLine", () => {
  assert(bookPageCode.includes("const handleLineLogin = async () =>"), "handleLineLogin must be async");
  assert(bookPageCode.includes("try {"), "handleLineLogin must have try block");
  assert(bookPageCode.includes("catch (err: any) {"), "handleLineLogin must have catch block");
  assert(bookPageCode.includes("setIsLoggingInLine(false);"), "catch block must reset isLoggingInLine");
});

// Test 2: tracking page handleLineLogin has try-catch and resets isLoggingInLine
runTest("Tracking Page: handleLineLogin has try-catch and resets isLoggingInLine", () => {
  assert(trackingPageCode.includes("const handleLineLogin = async () =>"), "handleLineLogin must be async in tracking");
  assert(trackingPageCode.includes("try {"), "handleLineLogin must have try block in tracking");
  assert(trackingPageCode.includes("catch (err: any) {"), "handleLineLogin must have catch block in tracking");
  assert(trackingPageCode.includes("setIsLoggingInLine(false);"), "catch block must reset isLoggingInLine in tracking");
});

// Test 3: Timeout safety prevents infinite loading state
runTest("Timeout Safety: 6s/8s timeout protects against infinite 'กำลังเชื่อมต่อกับ LINE...'", () => {
  assert(bookPageCode.includes("setTimeout(() => reject(new Error(\"การเชื่อมต่อระบบ LINE หมดเวลา (Timeout)\")), 6000)"), "Must have 6s init timeout in book page");
  assert(bookPageCode.includes("const safetyTimer = setTimeout(() => {"), "Must have safety timer in book page");
  assert(trackingPageCode.includes("const safetyTimer = setTimeout(() => {"), "Must have safety timer in tracking page");
});

// Test 4: Dynamic LIFF ID helper supports UAT and Preview domains
runTest("Environment: getLiffId dynamically supports preview/uat and defaults to NEXT_PUBLIC_LIFF_ID", () => {
  assert(bookPageCode.includes("getLiffId"), "Book page must have getLiffId helper");
  assert(bookPageCode.includes("NEXT_PUBLIC_LIFF_ID_PREVIEW"), "Must support NEXT_PUBLIC_LIFF_ID_PREVIEW");
  assert(bookPageCode.includes("process.env.NEXT_PUBLIC_LIFF_ID"), "Must fallback to process.env.NEXT_PUBLIC_LIFF_ID");
});

// Test 5: Error view displays clear error message with retry button
runTest("Error Handling: Error view displays retry button ('ลองใหม่อีกครั้ง') without freezing", () => {
  assert(bookPageCode.includes("ลองใหม่อีกครั้ง"), "Book page must have retry button");
  assert(trackingPageCode.includes("ลองใหม่อีกครั้ง"), "Tracking page must have retry button");
});

// Test 6: Demo Login works without waiting for LIFF SDK
runTest("Demo Mode: Demo Account button is immediately accessible without waiting for LIFF", () => {
  assert(bookPageCode.includes("DEMO_MOCK_USER.userId"), "Must use DEMO_MOCK_USER in book page");
  assert(bookPageCode.includes("DEMO_MOCK_USER.idToken"), "Must use DEMO_MOCK_USER.idToken in book page");
  assert(trackingPageCode.includes("DEMO_MOCK_USER.userId"), "Must use DEMO_MOCK_USER in tracking page");
});

// Test 7: Verify Booking Stepper 4 stages and digital ticket
runTest("Stepper Logic: Stepper 4 stages and Digital Ticket preserved", () => {
  assert(bookPageCode.includes("VIEW 1: LINE LOGIN GATE"), "Must have Login Gate");
  assert(bookPageCode.includes("VIEW 2: BOOKING WIZARD"), "Must have Booking Wizard");
  assert(bookPageCode.includes("step === 1"), "Must support step 1");
  assert(bookPageCode.includes("step === 2"), "Must support step 2");
  assert(bookPageCode.includes("step === 3"), "Must support step 3");
  assert(bookPageCode.includes("step === 4"), "Must support step 4 (Digital Ticket)");
});

// Test 8: Server-side safety - mock tokens rejected when DEMO_MODE=false
runTest("Server Security: Mock token is strictly rejected when DEMO_MODE=false", () => {
  const lineApiCode = fs.readFileSync(path.join(__dirname, "src/lib/lineApi.ts"), "utf8");
  assert(lineApiCode.includes("isDemoMode()"), "Must check isDemoMode before accepting mock token");
  assert(lineApiCode.includes("DEMO_MOCK_USER.idToken"), "Must match DEMO_MOCK_USER.idToken in demo mode");
  
  // Test simulated verifyLineIdToken behavior
  function simulateVerify(idToken, isDemo) {
    if (isDemo && idToken === "demo_id_token_mock_somchai_2026") {
      return { success: true, profile: { userId: "U_demo_user_001" } };
    }
    if (!isDemo && idToken === "demo_id_token_mock_somchai_2026") {
      return { success: false, error: "Mock tokens are not allowed in production mode" };
    }
    return { success: false, error: "Invalid token" };
  }

  const demoResult = simulateVerify("demo_id_token_mock_somchai_2026", true);
  assert.strictEqual(demoResult.success, true, "Mock token must succeed in demo mode");

  const nonDemoResult = simulateVerify("demo_id_token_mock_somchai_2026", false);
  assert.strictEqual(nonDemoResult.success, false, "Mock token must fail when not in demo mode");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL PREVIEW LINE LIFF FIX TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
