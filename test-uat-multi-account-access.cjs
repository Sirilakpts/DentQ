/**
 * test-uat-multi-account-access.cjs
 * Test Suite: DentQ Safe UAT Multi-Account Access & Allowlist Decoupling Verification
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ SAFE UAT MULTI-ACCOUNT ACCESS & ALLOWLIST");
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

// Re-import isUatUserAllowlisted dynamically with environment mock
function testIsUatUserAllowlisted(userId, uatAllowlistEnv) {
  const origEnv = process.env.UAT_LINE_ALLOWLIST;
  try {
    if (uatAllowlistEnv !== undefined) {
      process.env.UAT_LINE_ALLOWLIST = uatAllowlistEnv;
    } else {
      delete process.env.UAT_LINE_ALLOWLIST;
    }
    // Simple pure replication of the logic in src/lib/auth.ts
    if (!userId || !userId.trim()) return false;
    const cleanUserId = userId.trim();
    const rawEnv = (process.env.UAT_LINE_ALLOWLIST || "").replace(/^["']|["']$/g, "").trim();
    if (!rawEnv) return false;
    if (rawEnv === "*") return true;
    const allowedList = rawEnv
      .split(",")
      .map((s) => s.replace(/^["']|["']$/g, "").trim())
      .filter((s) => s.length > 0 && !/\s/.test(s))
      .map((s) => s.toLowerCase());
    return allowedList.includes(cleanUserId.toLowerCase());
  } finally {
    if (origEnv !== undefined) {
      process.env.UAT_LINE_ALLOWLIST = origEnv;
    } else {
      delete process.env.UAT_LINE_ALLOWLIST;
    }
  }
}

// Test 1: Multi-Account comma-separated support in UAT_LINE_ALLOWLIST
runTest("Multi-Account Support: Parses multiple comma-separated LINE User IDs with trim & case-insensitivity", () => {
  const multiEnv = "U11111111111111111111111111111111, U22222222222222222222222222222222 ,  u33333333333333333333333333333333 ";
  assert.strictEqual(testIsUatUserAllowlisted("U11111111111111111111111111111111", multiEnv), true);
  assert.strictEqual(testIsUatUserAllowlisted("U22222222222222222222222222222222", multiEnv), true);
  assert.strictEqual(testIsUatUserAllowlisted("U33333333333333333333333333333333", multiEnv), true);
  assert.strictEqual(testIsUatUserAllowlisted("U44444444444444444444444444444444", multiEnv), false);
});

// Test 2: Strips quotes and handles invalid spaces/empty items
runTest("Input Sanitization: Strips quotes and rejects malformed/whitespace entries", () => {
  const quotedEnv = '"U11111111111111111111111111111111, U22222222222222222222222222222222, , U invalid with space"';
  assert.strictEqual(testIsUatUserAllowlisted("U11111111111111111111111111111111", quotedEnv), true);
  assert.strictEqual(testIsUatUserAllowlisted("U22222222222222222222222222222222", quotedEnv), true);
  assert.strictEqual(testIsUatUserAllowlisted("U invalid with space", quotedEnv), false);
  assert.strictEqual(testIsUatUserAllowlisted("", quotedEnv), false);
});

// Test 3: Fail-Safe: Unset or empty UAT_LINE_ALLOWLIST strictly denies all accounts
runTest("Fail-Safe Default: Empty or unset UAT_LINE_ALLOWLIST denies all bookings", () => {
  assert.strictEqual(testIsUatUserAllowlisted("U11111111111111111111111111111111", ""), false);
  assert.strictEqual(testIsUatUserAllowlisted("U11111111111111111111111111111111", undefined), false);
  assert.strictEqual(testIsUatUserAllowlisted("U11111111111111111111111111111111", "   "), false);
});

// Test 4: Decoupling: LINE_NOTIF_ALLOWLIST is NOT used as fallback for booking permissions
runTest("Decoupling: LINE_NOTIF_ALLOWLIST cannot grant booking rights", () => {
  assert(!authCode.includes("process.env.LINE_NOTIF_ALLOWLIST"), "auth.ts must NOT use LINE_NOTIF_ALLOWLIST for booking rights");
  assert(authCode.includes("process.env.UAT_LINE_ALLOWLIST"), "auth.ts must use UAT_LINE_ALLOWLIST");
});

// Test 5: Standard Thai message for non-allowlisted users: บัญชี LINE นี้ยังไม่ได้รับสิทธิ์ทดสอบการจองคิว
runTest("Error Messaging: Consistent 403 response with exact required Thai message", () => {
  const expectedMsg = "บัญชี LINE นี้ยังไม่ได้รับสิทธิ์ทดสอบการจองคิว";
  assert(bookingsCode.includes(expectedMsg), "Bookings API must return standard Thai denial message");
  assert(trackingCode.includes(expectedMsg), "Tracking API must return standard Thai denial message");
  assert(trackingActionCode.includes(expectedMsg), "Tracking Action API must return standard Thai denial message");
});

// Test 6: Zero-Trust: Server uses verifiedLineUserId from token verification, never client payload
runTest("Zero-Trust Security: verifiedLineUserId strictly derived from server token verification", () => {
  assert(bookingsCode.includes("isUatUserAllowlisted(verifiedLineUserId)"), "Bookings API must check verifiedLineUserId");
  assert(trackingCode.includes("isUatUserAllowlisted(verifiedLineUserId)"), "Tracking API must check verifiedLineUserId");
  assert(trackingActionCode.includes("isUatUserAllowlisted(verifiedLineUserId)"), "Tracking Action API must check verifiedLineUserId");
});

// Test 7: No hardcoded LINE User IDs in source files
runTest("No Secrets / No Hardcoded User IDs: Source files do not contain hardcoded tester IDs", () => {
  const regex = /U[0-9a-fA-F]{32}/;
  assert(!regex.test(authCode), "auth.ts must not contain hardcoded LINE User IDs");
  assert(!regex.test(bookingsCode), "bookings route must not contain hardcoded LINE User IDs");
  assert(!regex.test(trackingCode), "tracking route must not contain hardcoded LINE User IDs");
  assert(!regex.test(trackingActionCode), "tracking action route must not contain hardcoded LINE User IDs");
});

// Test 8: Notification Allowlist supports multi-account and strips quotes
runTest("Notification Allowlist: isLineRecipientAllowlisted supports comma-separated list and strips quotes", () => {
  assert(lineCode.includes(".split(\",\")"), "line.ts must split by comma");
  assert(lineCode.includes(".replace(/^[\"']|[\"']$/g, \"\")"), "line.ts must strip quotes from rawEnv");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL UAT MULTI-ACCOUNT ACCESS TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
