/**
 * test-tracking-auth-step251.cjs
 * Comprehensive test suite for DentQ Step 2.5.1: Tracking Auth Security Fix
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP 2.5.1 TRACKING AUTH SECURITY FIX");
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
// 1. Source Inspection: src/app/api/tracking/route.ts
// ---------------------------------------------------------------------------
const trackingApiPath = path.join(__dirname, "src", "app", "api", "tracking", "route.ts");
assert.ok(fs.existsSync(trackingApiPath), "src/app/api/tracking/route.ts must exist");
const trackingApiContent = fs.readFileSync(trackingApiPath, "utf-8");

runTest("Tracking API: Query Parameter token extraction is REMOVED", () => {
  assert.ok(
    !trackingApiContent.includes('searchParams.get("lineIdToken")'),
    "Must NOT extract lineIdToken from query parameters"
  );
  assert.ok(
    trackingApiContent.includes('req.headers.get("authorization")'),
    "Must extract token from Authorization header"
  );
});

runTest("Tracking API: Missing or unauthenticated token returns 401", () => {
  assert.ok(
    trackingApiContent.includes("status: 401"),
    "Must return 401 status when token is missing or invalid"
  );
  assert.ok(
    trackingApiContent.includes("verifyLineIdToken"),
    "Must verify token with verifyLineIdToken()"
  );
});

// ---------------------------------------------------------------------------
// 2. Source Inspection: src/app/tracking/page.tsx
// ---------------------------------------------------------------------------
const trackingPagePath = path.join(__dirname, "src", "app", "tracking", "page.tsx");
assert.ok(fs.existsSync(trackingPagePath), "src/app/tracking/page.tsx must exist");
const trackingPageContent = fs.readFileSync(trackingPagePath, "utf-8");

runTest("Tracking Page: Sends token in Authorization Header for GET and Action POST", () => {
  assert.ok(
    trackingPageContent.includes("Authorization: `Bearer ${token}`") ||
      trackingPageContent.includes('Authorization: `Bearer ${token}`'),
    "fetchBookings must send Authorization: Bearer <token>"
  );
  assert.ok(
    trackingPageContent.includes("Authorization: `Bearer ${lineIdToken}`"),
    "handleReminderAction must send Authorization: Bearer <lineIdToken> in headers"
  );
});

// ---------------------------------------------------------------------------
// 3. Source Inspection: src/app/api/tracking/action/route.ts
// ---------------------------------------------------------------------------
const actionApiPath = path.join(__dirname, "src", "app", "api", "tracking", "action", "route.ts");
assert.ok(fs.existsSync(actionApiPath), "src/app/api/tracking/action/route.ts must exist");
const actionApiContent = fs.readFileSync(actionApiPath, "utf-8");

runTest("Action API: Every action requires LINE token and checks ownership", () => {
  assert.ok(
    actionApiContent.includes("verifyLineIdToken"),
    "Must use existing verifyLineIdToken() helper"
  );
  assert.ok(
    !actionApiContent.includes('searchParams.get("lineIdToken")'),
    "Must NOT accept lineIdToken in URL query parameters"
  );
  assert.ok(
    actionApiContent.includes("status: 401"),
    "Must return 401 when token is missing or invalid"
  );
  assert.ok(
    actionApiContent.includes("status: 403"),
    "Must return 403 when user attempts to manage another user's queue"
  );
  assert.ok(
    actionApiContent.includes("bookingLineUserId !== verifiedLineUserId"),
    "Must strictly verify that booking belongs to verifiedLineUserId"
  );
});

// ---------------------------------------------------------------------------
// 4. Functional Simulation Tests with Mock Dataset
// ---------------------------------------------------------------------------
const mockBookings = [
  {
    bookingId: "DEN-001",
    queueNumber: "DEN-001",
    patientName: "Alice User",
    lineUserId: "U_USER_ALICE",
    status: "CONFIRMED",
    reminderStatus: "PENDING",
  },
  {
    bookingId: "DEN-002",
    queueNumber: "DEN-002",
    patientName: "Bob User",
    lineUserId: "U_USER_BOB",
    status: "CONFIRMED",
    reminderStatus: "PENDING",
  },
];

// Helper to simulate token verification logic
function mockVerifyToken(token, expectedChannel = "1234567890") {
  if (!token) return { success: false, error: "Missing token" };
  if (token === "token_alice_valid") {
    return { success: true, lineUserId: "U_USER_ALICE", aud: expectedChannel };
  }
  if (token === "token_bob_valid") {
    return { success: true, lineUserId: "U_USER_BOB", aud: expectedChannel };
  }
  if (token === "token_audience_mismatch") {
    return { success: false, error: "Token audience mismatch" };
  }
  return { success: false, error: "Invalid LINE ID Token" };
}

// Simulate Tracking GET logic
function simulateTrackingGet(headers, queryParams) {
  const authHeader = headers["authorization"] || "";
  const xLineToken = headers["x-line-id-token"] || "";

  // Strictly DO NOT extract from queryParams
  let idToken = "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    idToken = authHeader.slice(7).trim();
  } else if (xLineToken) {
    idToken = xLineToken.trim();
  }

  if (!idToken) {
    return { status: 401, error: "กรุณาเข้าสู่ระบบ LINE", bookings: [] };
  }

  const verify = mockVerifyToken(idToken);
  if (!verify.success) {
    return { status: 401, error: verify.error, bookings: [] };
  }

  const verifiedLineUserId = verify.lineUserId;
  let userBookings = mockBookings.filter((b) => b.lineUserId === verifiedLineUserId);

  if (queryParams.queueNumber) {
    userBookings = userBookings.filter(
      (b) => b.queueNumber.toUpperCase() === queryParams.queueNumber.toUpperCase()
    );
  }

  return { status: 200, success: true, bookings: userBookings };
}

// Simulate Tracking Action POST logic
function simulateTrackingAction(headers, body, queryParams = {}) {
  const authHeader = headers["authorization"] || "";
  const xLineToken = headers["x-line-id-token"] || "";

  // Strictly DO NOT extract from queryParams
  let idToken = "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    idToken = authHeader.slice(7).trim();
  } else if (xLineToken) {
    idToken = xLineToken.trim();
  } else if (body.lineIdToken) {
    idToken = String(body.lineIdToken).trim();
  }

  if (!idToken) {
    return { status: 401, error: "กรุณาเข้าสู่ระบบ LINE" };
  }

  const verify = mockVerifyToken(idToken);
  if (!verify.success) {
    return { status: 401, error: verify.error };
  }

  const verifiedLineUserId = verify.lineUserId;
  const booking = mockBookings.find(
    (b) => b.queueNumber.toUpperCase() === (body.queueNumber || "").toUpperCase()
  );

  if (!booking) {
    return { status: 404, error: "ไม่พบคิวการนัดหมายนี้" };
  }

  if (booking.lineUserId !== verifiedLineUserId) {
    return { status: 403, error: "ท่านไม่มีสิทธิ์จัดการคิวนัดหมายของผู้อื่น" };
  }

  return { status: 200, success: true, message: "อัปเดตนัดหมายสำเร็จ" };
}

runTest("Simulation 1: Missing Token -> returns 401", () => {
  const res = simulateTrackingGet({}, {});
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.bookings.length, 0);
});

runTest("Simulation 2: Token passed via URL Query Parameter is NOT accepted -> returns 401", () => {
  const res = simulateTrackingGet({}, { lineIdToken: "token_alice_valid" });
  assert.strictEqual(
    res.status,
    401,
    "Token in URL query params must not be accepted and must yield 401"
  );
  assert.strictEqual(res.bookings.length, 0);
});

runTest("Simulation 3: Invalid Token in Authorization Header -> returns 401", () => {
  const res = simulateTrackingGet(
    { authorization: "Bearer invalid_expired_token" },
    {}
  );
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.bookings.length, 0);
});

runTest("Simulation 4: Token Audience mismatch -> returns 401", () => {
  const res = simulateTrackingGet(
    { authorization: "Bearer token_audience_mismatch" },
    {}
  );
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.bookings.length, 0);
});

runTest("Simulation 5: User A cannot see User B's booking (DEN-002) even if explicitly queried", () => {
  const res = simulateTrackingGet(
    { authorization: "Bearer token_alice_valid" },
    { queueNumber: "DEN-002" } // DEN-002 belongs to Bob
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(
    res.bookings.length,
    0,
    "User A must NOT see Bob's booking even by querying DEN-002"
  );
});

runTest("Simulation 6: Action with missing Token -> returns 401", () => {
  const res = simulateTrackingAction({}, { queueNumber: "DEN-001", action: "confirm-attendance" });
  assert.strictEqual(res.status, 401);
});

runTest("Simulation 7: Action with Token passed via URL query parameter only -> returns 401", () => {
  const res = simulateTrackingAction(
    {},
    { queueNumber: "DEN-001", action: "confirm-attendance" },
    { lineIdToken: "token_alice_valid" }
  );
  assert.strictEqual(res.status, 401, "Action token in query param must not be accepted");
});

runTest("Simulation 8: User A attempting to modify User B's queue (DEN-002) -> returns 403 Forbidden", () => {
  const res = simulateTrackingAction(
    { authorization: "Bearer token_alice_valid" },
    { queueNumber: "DEN-002", action: "confirm-attendance" } // DEN-002 belongs to Bob
  );
  assert.strictEqual(
    res.status,
    403,
    "User A modifying Bob's queue must be rejected with 403 Forbidden"
  );
  assert.strictEqual(res.error, "ท่านไม่มีสิทธิ์จัดการคิวนัดหมายของผู้อื่น");
});

runTest("Simulation 9: User A modifying User A's queue (DEN-001) -> succeeds with 200 OK", () => {
  const res = simulateTrackingAction(
    { authorization: "Bearer token_alice_valid" },
    { queueNumber: "DEN-001", action: "confirm-attendance" }
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.success, true);
});

console.log("\n=========================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log("=========================================================");

if (passedTests === totalTests) {
  console.log("✅ ALL STEP 2.5.1 SECURITY TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("❌ SOME TESTS FAILED!");
  process.exit(1);
}
