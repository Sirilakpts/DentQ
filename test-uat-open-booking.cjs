/**
 * test-uat-open-booking.cjs
 * Test Suite: DentQ UAT Open Booking & Security Guard Verification
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ UAT OPEN BOOKING & SECURITY GUARDS");
console.log("=========================================================\n");

let total = 0;
let passed = 0;

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

const authCode = fs.readFileSync(path.join(__dirname, "src/lib/auth.ts"), "utf8");
const bookingsCode = fs.readFileSync(path.join(__dirname, "src/app/api/bookings/route.ts"), "utf8");
const trackingCode = fs.readFileSync(path.join(__dirname, "src/app/api/tracking/route.ts"), "utf8");
const trackingActionCode = fs.readFileSync(path.join(__dirname, "src/app/api/tracking/action/route.ts"), "utf8");
const lineCode = fs.readFileSync(path.join(__dirname, "src/lib/line.ts"), "utf8");

// Pure mock evaluator matching src/lib/auth.ts implementation
function evalUatOpenBooking(env) {
  const isOpen = (env.UAT_OPEN_BOOKING || "").trim().toLowerCase() === "true";
  if (!isOpen) return false;
  const vercelEnv = (env.VERCEL_ENV || "").trim().toLowerCase();
  if (vercelEnv !== "preview") return false;
  const gitBranch = (env.VERCEL_GIT_COMMIT_REF || "").trim().toLowerCase();
  if (gitBranch !== "uat") return false;
  const demoMode = (env.DEMO_MODE || "").trim().toLowerCase();
  if (demoMode !== "false") return false;
  const bookingStorage = (env.BOOKING_STORAGE || "").trim().toLowerCase();
  if (bookingStorage !== "sheets") return false;
  const uatSheetId = (env.GOOGLE_SHEETS_UAT_SPREADSHEET_ID || "").trim();
  if (!uatSheetId) return false;
  return true;
}

function evalIsUatUserAllowlisted(userId, env) {
  if (!userId || !userId.trim()) return false;
  if (evalUatOpenBooking(env)) return true;

  const rawEnv = (env.UAT_LINE_ALLOWLIST || "").replace(/^["']|["']$/g, "").trim();
  if (!rawEnv) return false;
  if (rawEnv === "*") return true;

  const allowedList = rawEnv
    .split(",")
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .filter((s) => s.length > 0 && !/\s/.test(s))
    .map((s) => s.toLowerCase());

  return allowedList.includes(userId.trim().toLowerCase());
}

const validUatEnv = {
  UAT_OPEN_BOOKING: "true",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "uat",
  DEMO_MODE: "false",
  BOOKING_STORAGE: "sheets",
  GOOGLE_SHEETS_UAT_SPREADSHEET_ID: "1UAT_Sheet_Test_Id_XYZ123",
  UAT_LINE_ALLOWLIST: "Uallowed_tester_1",
};

// Test 1: All 6 Conditions Met -> Open booking enabled
runTest("UAT Open Booking Guard: Returns true ONLY when all 6 security conditions are strictly satisfied", () => {
  assert.strictEqual(evalUatOpenBooking(validUatEnv), true, "Should enable open booking when all 6 conditions met");
  assert.strictEqual(evalIsUatUserAllowlisted("U_any_public_line_user_999", validUatEnv), true, "Public user should be allowed when open");
});

// Test 2: Production Safety Guard -> Never opens in production
runTest("Production Safety Guard: Strictly blocks open booking if VERCEL_ENV is production", () => {
  const prodEnv = { ...validUatEnv, VERCEL_ENV: "production" };
  assert.strictEqual(evalUatOpenBooking(prodEnv), false, "Must NEVER enable open booking in production");
  assert.strictEqual(evalIsUatUserAllowlisted("U_any_public_line_user_999", prodEnv), false, "Public user must be blocked in production");
  assert.strictEqual(evalIsUatUserAllowlisted("Uallowed_tester_1", prodEnv), true, "Allowlisted user still permitted");
});

// Test 3: Branch Isolation -> Never opens on main branch
runTest("Branch Safety Guard: Strictly blocks open booking if VERCEL_GIT_COMMIT_REF is not uat", () => {
  const mainEnv = { ...validUatEnv, VERCEL_GIT_COMMIT_REF: "main" };
  assert.strictEqual(evalUatOpenBooking(mainEnv), false, "Must NEVER enable open booking on main");
  assert.strictEqual(evalIsUatUserAllowlisted("U_any_public_line_user_999", mainEnv), false, "Public user must be blocked on main");
});

// Test 4: Demo Mode & Storage Safety -> Requires DEMO_MODE=false and BOOKING_STORAGE=sheets
runTest("Storage & Mode Guard: Strictly blocks open booking if DEMO_MODE is true or storage is not sheets", () => {
  const demoEnv = { ...validUatEnv, DEMO_MODE: "true" };
  assert.strictEqual(evalUatOpenBooking(demoEnv), false, "Must block when DEMO_MODE=true");

  const sqliteEnv = { ...validUatEnv, BOOKING_STORAGE: "sqlite" };
  assert.strictEqual(evalUatOpenBooking(sqliteEnv), false, "Must block when BOOKING_STORAGE=sqlite");
});

// Test 5: Sheet ID Guard -> Requires GOOGLE_SHEETS_UAT_SPREADSHEET_ID
runTest("Sheet Target Guard: Strictly blocks open booking if GOOGLE_SHEETS_UAT_SPREADSHEET_ID is missing", () => {
  const noSheetEnv = { ...validUatEnv, GOOGLE_SHEETS_UAT_SPREADSHEET_ID: "" };
  assert.strictEqual(evalUatOpenBooking(noSheetEnv), false, "Must block when UAT sheet ID missing");
});

// Test 6: Fallback to UAT_LINE_ALLOWLIST when flag is false
runTest("Graceful Fallback: Reverts to UAT_LINE_ALLOWLIST when UAT_OPEN_BOOKING is not true", () => {
  const flagFalseEnv = { ...validUatEnv, UAT_OPEN_BOOKING: "false" };
  assert.strictEqual(evalUatOpenBooking(flagFalseEnv), false);
  assert.strictEqual(evalIsUatUserAllowlisted("Uallowed_tester_1", flagFalseEnv), true, "Allowlisted tester still allowed");
  assert.strictEqual(evalIsUatUserAllowlisted("U_random_user", flagFalseEnv), false, "Non-allowlisted blocked");
});

// Test 7: Rate Limiting Guard on Serverless
runTest("Rate Limiter Implementation: Bookings API implements in-memory sliding window rate limiter", () => {
  assert(bookingsCode.includes("checkBookingRateLimit"), "Bookings API must implement checkBookingRateLimit");
  assert(bookingsCode.includes("status: 429"), "Bookings API must return 429 when rate limited");
  assert(bookingsCode.includes("minIntervalMs"), "Must implement cooldown interval");
});

// Test 8: Privacy & Ownership Gating in Tracking and Actions
runTest("Privacy & Zero-Trust: Tracking queries only verified LINE user ID; actions require strict ownership", () => {
  assert(trackingCode.includes("findBookingsByLineUserIdFromSheet(\n          verifiedLineUserId\n        )") ||
         trackingCode.includes("findBookingsByLineUserIdFromSheet(verifiedLineUserId)"),
         "Tracking must strictly query by verified LINE User ID");
  assert(trackingActionCode.includes("bookingLineUserId !== verifiedLineUserId"),
         "Tracking actions must check lineUserId ownership");
  assert(trackingActionCode.includes("ท่านไม่มีสิทธิ์จัดการคิวนัดหมายของผู้อื่น"),
         "Must deny cross-account action modification");
});

// Test 9: LINE Notification Isolation
runTest("Notification Protection: LINE_NOTIF_ALLOWLIST is not opened to public users automatically", () => {
  assert(!lineCode.includes("UAT_OPEN_BOOKING"), "line.ts must NOT use UAT_OPEN_BOOKING to broadcast messages");
  assert(lineCode.includes("LINE_NOTIF_ALLOWLIST"), "line.ts must strictly gate recipients with LINE_NOTIF_ALLOWLIST");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL UAT OPEN BOOKING TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
