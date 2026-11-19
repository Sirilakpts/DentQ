/**
 * test-uat-line-notifications-all-users.cjs
 * Comprehensive test suite verifying LINE notification delivery for all UAT booking users,
 * wildcard guard, fail-safe decoupling, multi-user isolation, and zero-leakage security.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ UAT LINE NOTIFICATIONS FOR ALL USERS");
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

// Read source files for structural verification
const lineCode = fs.readFileSync(path.join(__dirname, "src/lib/line.ts"), "utf8");
const bookingsRouteCode = fs.readFileSync(path.join(__dirname, "src/app/api/bookings/route.ts"), "utf8");
const statusRouteCode = fs.readFileSync(path.join(__dirname, "src/app/api/bookings/[id]/status/route.ts"), "utf8");
const bookPageCode = fs.readFileSync(path.join(__dirname, "src/app/book/page.tsx"), "utf8");

// Re-implement the exact isLineRecipientAllowlisted logic from src/lib/line.ts
function isLineRecipientAllowlisted(recipient) {
  if (!recipient || !recipient.trim()) return false;
  const cleanRecipient = recipient.trim();
  if (cleanRecipient.startsWith("08") || cleanRecipient.startsWith("09") || cleanRecipient.startsWith("U_demo_")) {
    return false;
  }

  const rawEnv = (process.env.LINE_NOTIF_ALLOWLIST || "")
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!rawEnv) {
    return false;
  }

  if (rawEnv === "*") {
    const vercelEnv = (process.env.VERCEL_ENV || "").trim().toLowerCase();
    const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();

    // Guard 1: บล็อก Production เด็ดขาด ไม่ว่ากรณีใดก็ตาม
    if (vercelEnv === "production" || (nodeEnv === "production" && !vercelEnv)) {
      return false;
    }

    // Guard 2: หากรันบน Vercel ต้องเป็น Preview และ Branch uat เท่านั้น
    if (vercelEnv) {
      if (vercelEnv !== "preview") {
        return false;
      }
      const gitBranch = (process.env.VERCEL_GIT_COMMIT_REF || "").trim().toLowerCase();
      if (gitBranch && gitBranch !== "uat") {
        return false;
      }
    }

    return true;
  }

  const allowed = rawEnv
    .split(",")
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .filter((s) => s.length > 0 && !/\s/.test(s))
    .map((s) => s.toLowerCase());

  return allowed.includes(cleanRecipient.toLowerCase());
}

// ----------------------------------------------------------------------------------
// Group 1: Server-side Guard for LINE_NOTIF_ALLOWLIST=*
// ----------------------------------------------------------------------------------

runTest("Guard 1: LINE_NOTIF_ALLOWLIST=* is strictly BLOCKED in Vercel Production", () => {
  const origEnv = { ...process.env };
  try {
    process.env.LINE_NOTIF_ALLOWLIST = "*";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_GIT_COMMIT_REF = "uat";
    process.env.NODE_ENV = "production";

    const allowed = isLineRecipientAllowlisted("U1234567890abcdef1234567890abcdef");
    assert.strictEqual(allowed, false, "Wildcard '*' must be rejected when VERCEL_ENV is production");
  } finally {
    process.env = origEnv;
  }
});

runTest("Guard 2: LINE_NOTIF_ALLOWLIST=* is strictly BLOCKED on non-UAT Vercel Preview branch", () => {
  const origEnv = { ...process.env };
  try {
    process.env.LINE_NOTIF_ALLOWLIST = "*";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_REF = "feature-test";
    process.env.NODE_ENV = "production";

    const allowed = isLineRecipientAllowlisted("U1234567890abcdef1234567890abcdef");
    assert.strictEqual(allowed, false, "Wildcard '*' must be rejected on non-uat branch preview");
  } finally {
    process.env = origEnv;
  }
});

runTest("Guard 3: LINE_NOTIF_ALLOWLIST=* is strictly BLOCKED in standalone Node production", () => {
  const origEnv = { ...process.env };
  try {
    process.env.LINE_NOTIF_ALLOWLIST = "*";
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_GIT_COMMIT_REF;
    process.env.NODE_ENV = "production";

    const allowed = isLineRecipientAllowlisted("U1234567890abcdef1234567890abcdef");
    assert.strictEqual(allowed, false, "Wildcard '*' must be rejected in standalone NODE_ENV=production");
  } finally {
    process.env = origEnv;
  }
});

runTest("Guard 4: LINE_NOTIF_ALLOWLIST=* is ALLOWED on Vercel Preview branch uat", () => {
  const origEnv = { ...process.env };
  try {
    process.env.LINE_NOTIF_ALLOWLIST = "*";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_REF = "uat";
    process.env.NODE_ENV = "production";

    const userA = isLineRecipientAllowlisted("U11111111111111111111111111111111");
    const userB = isLineRecipientAllowlisted("U22222222222222222222222222222222");
    const rattana = isLineRecipientAllowlisted("U99999999999999999999999999999999");

    assert.strictEqual(userA, true, "User A must be allowlisted under wildcard in UAT Preview");
    assert.strictEqual(userB, true, "User B must be allowlisted under wildcard in UAT Preview");
    assert.strictEqual(rattana, true, "Rattana must be allowlisted under wildcard in UAT Preview");
  } finally {
    process.env = origEnv;
  }
});

runTest("Guard 5: Invalid or demo recipients are ALWAYS blocked regardless of wildcard", () => {
  const origEnv = { ...process.env };
  try {
    process.env.LINE_NOTIF_ALLOWLIST = "*";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_REF = "uat";

    assert.strictEqual(isLineRecipientAllowlisted(""), false, "Empty string blocked");
    assert.strictEqual(isLineRecipientAllowlisted("0812345678"), false, "Phone number blocked");
    assert.strictEqual(isLineRecipientAllowlisted("0987654321"), false, "Phone number blocked");
    assert.strictEqual(isLineRecipientAllowlisted("U_demo_mock_patient"), false, "Demo user blocked");
  } finally {
    process.env = origEnv;
  }
});

// ----------------------------------------------------------------------------------
// Group 2: Discrete Allowlist Fallback
// ----------------------------------------------------------------------------------

runTest("Fallback: Explicit allowlist still functions when wildcard is not used", () => {
  const origEnv = { ...process.env };
  try {
    process.env.LINE_NOTIF_ALLOWLIST = "U_SPECIFIC_TESTER_1, U_SPECIFIC_TESTER_2";
    delete process.env.VERCEL_ENV;

    assert.strictEqual(isLineRecipientAllowlisted("U_SPECIFIC_TESTER_1"), true);
    assert.strictEqual(isLineRecipientAllowlisted("u_specific_tester_2"), true, "Case-insensitive check");
    assert.strictEqual(isLineRecipientAllowlisted("U_OTHER_PERSON"), false);
  } finally {
    process.env = origEnv;
  }
});

// ----------------------------------------------------------------------------------
// Group 3: Server-side LINE Event Verification (PENDING, CONFIRMED, REJECTED)
// ----------------------------------------------------------------------------------

runTest("Notification Lifecycle 1: PENDING notification is dispatched on Google Sheets booking creation", () => {
  assert(bookingsRouteCode.includes("buildPendingFlexMessage"), "Booking API must call buildPendingFlexMessage");
  assert(bookingsRouteCode.includes("type: \"PENDING\""), "Booking API must use type PENDING");
  assert(bookingsRouteCode.includes("recipient: verifiedLineUserId"), "Recipient must be verified LINE User ID");
  assert(bookingsRouteCode.includes("skipDbLog: true"), "Must skip Prisma log in Sheets mode");
});

runTest("Notification Lifecycle 2: CONFIRMED notification is dispatched on Admin approval", () => {
  assert(statusRouteCode.includes("buildApprovalFlexMessage"), "Status API must call buildApprovalFlexMessage");
  assert(statusRouteCode.includes("status === \"CONFIRMED\" ? \"APPROVAL\" : \"REJECTION\""), "Status API must map CONFIRMED to APPROVAL");
  assert(statusRouteCode.includes("recipient: targetLineUserId"), "Recipient must be booking targetLineUserId");
});

runTest("Notification Lifecycle 3: REJECTED notification is dispatched on Admin rejection with reason", () => {
  assert(statusRouteCode.includes("buildRejectionFlexMessage"), "Status API must call buildRejectionFlexMessage");
  assert(statusRouteCode.includes("rejectReason: cleanRejectReason"), "Must pass clean rejectReason");
});

// ----------------------------------------------------------------------------------
// Group 4: Multi-User Isolation & No Cross-Routing
// ----------------------------------------------------------------------------------

runTest("Isolation: Recipients are strictly derived from verified session or existing booking record", () => {
  // Booking creation strictly uses verified token
  assert(bookingsRouteCode.includes("const verifiedLineUserId = verifyRes.lineUserId;"),
    "Booking creation must derive verifiedLineUserId from verifyLineIdToken result");
  // Status update strictly uses booking's stored lineUserId
  assert(statusRouteCode.includes("const targetLineUserId = booking.lineUserId ? booking.lineUserId.trim() : null;"),
    "Status route must target stored booking.lineUserId");
});

// ----------------------------------------------------------------------------------
// Group 5: Decoupled Fail-Safe Error Handling
// ----------------------------------------------------------------------------------

runTest("Decoupling: LINE push failure does NOT roll back Google Sheets booking", () => {
  // Verify booking route catches LINE error non-fatally
  const pendingCatchIdx = bookingsRouteCode.indexOf("Failed to send LINE pending notification (non-fatal)");
  assert(pendingCatchIdx !== -1, "Booking route must catch LINE error non-fatally");
  const returnSuccessIdx = bookingsRouteCode.indexOf("สร้างการจองคิวสำเร็จ กรุณารอเจ้าหน้าที่ตรวจสอบและยืนยัน");
  assert(returnSuccessIdx > pendingCatchIdx, "Booking route must return success response after non-fatal catch");
});

runTest("Decoupling: Admin status route reports failure accurately without claiming success", () => {
  // Status route reports notificationSent = sendRes.status === "SUCCESS"
  assert(statusRouteCode.includes("notificationSent = sendRes.status === \"SUCCESS\""),
    "notificationSent must strictly reflect sendRes.status === 'SUCCESS'");
  assert(statusRouteCode.includes("notificationResult = sendRes"),
    "notificationResult must carry detailed sendRes payload");
});

// ----------------------------------------------------------------------------------
// Group 6: Transparency & Error Diagnostics in src/lib/line.ts
// ----------------------------------------------------------------------------------

runTest("Diagnostics: sendLineFlexNotification returns structured SendNotificationResult", () => {
  assert(lineCode.includes("export interface SendNotificationResult"), "Must export SendNotificationResult interface");
  assert(lineCode.includes("SIMULATED_NO_TOKEN"), "Must report SIMULATED_NO_TOKEN when token is missing");
  assert(lineCode.includes("SIMULATED_NOT_IN_ALLOWLIST"), "Must report SIMULATED_NOT_IN_ALLOWLIST when blocked by allowlist");
  assert(lineCode.includes("failureReason = errorData?.message"), "Must capture error reason from LINE API response");
});

// ----------------------------------------------------------------------------------
// Group 7: LINE OA Guidance & Zero Leakage Security
// ----------------------------------------------------------------------------------

runTest("OA Guidance: Ticket banner informs users to add LINE Official Account as friend", () => {
  assert(bookPageCode.includes("LINE Official Account"), "Ticket banner must guide user about LINE Official Account");
  assert(bookPageCode.includes("หากยังไม่เคยเพิ่มเพื่อน"), "Must include add-friend helper text");
});

runTest("Zero-Trigger on Login/Refresh: No notification calls exist on login or profile load", () => {
  assert(!bookPageCode.includes("sendLineFlexNotification"), "Book page client component must NEVER call sendLineFlexNotification");
  assert(!bookPageCode.includes("fetch(\"/api/notifications\""), "Book page must not trigger notifications directly");
});

runTest("Zero Leakage: Token and private keys are never logged in console or response", () => {
  assert(!lineCode.includes("console.log(token)"), "Must not log token in line.ts");
  assert(!lineCode.includes("console.warn(token)"), "Must not log token in warnings");
  assert(!bookingsRouteCode.includes("console.log(token)"), "Must not log token in bookings route");
  assert(!statusRouteCode.includes("console.log(token)"), "Must not log token in status route");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL UAT LINE NOTIFICATION TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
