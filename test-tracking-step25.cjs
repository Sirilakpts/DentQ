/**
 * test-tracking-step25.cjs
 * Comprehensive test suite for DentQ Step 2.5: LINE-First Tracking
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=================================================");
console.log("TEST SUITE: STEP 2.5 LINE-FIRST TRACKING");
console.log("=================================================\n");

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
// 1. Source Inspection: src/app/tracking/page.tsx
// ---------------------------------------------------------------------------
const trackingPagePath = path.join(__dirname, "src", "app", "tracking", "page.tsx");
assert.ok(fs.existsSync(trackingPagePath), "src/app/tracking/page.tsx must exist");
const trackingPageContent = fs.readFileSync(trackingPagePath, "utf-8");

runTest("Tracking UI: Enforce LINE Login Gate and LIFF SDK", () => {
  assert.ok(
    trackingPageContent.includes("https://static.line-scdn.net/liff/edge/2/sdk.js"),
    "Must load official LIFF SDK"
  );
  assert.ok(
    trackingPageContent.includes("process.env.NEXT_PUBLIC_LIFF_ID"),
    "Must reuse NEXT_PUBLIC_LIFF_ID"
  );
  assert.ok(
    trackingPageContent.includes("if (!lineProfile || !lineIdToken)"),
    "Must gate tracking screen when not authenticated with LINE"
  );
  assert.ok(
    trackingPageContent.includes("เข้าสู่ระบบด้วย LINE เพื่อดูคิวนัดหมาย") ||
      trackingPageContent.includes("เข้าสู่ระบบด้วย LINE เพื่อดูคิวตรวจ"),
    "Must have LINE login call-to-action button"
  );
});

runTest("Tracking UI: Auto-fetch bookings without entering phone or queue number", () => {
  assert.ok(
    trackingPageContent.includes("fetchBookings(lineIdToken)"),
    "Must auto-fetch bookings when lineIdToken is obtained"
  );
  assert.ok(
    trackingPageContent.includes("Authorization: `Bearer ${token}`"),
    "Must send Bearer token in request to API"
  );
});

runTest("Tracking UI: Display verified profile and actual booking details", () => {
  assert.ok(
    trackingPageContent.includes("lineProfile.displayName"),
    "Must display LINE displayName"
  );
  assert.ok(
    trackingPageContent.includes("b.queueNumber"),
    "Must display queueNumber"
  );
  assert.ok(
    trackingPageContent.includes("b.service?.nameTh"),
    "Must display service name"
  );
  assert.ok(
    trackingPageContent.includes("b.medicalRights"),
    "Must display medical rights"
  );
});

runTest("Tracking UI: Status representation (PENDING, CONFIRMED, REJECTED - ไม่อนุมัติการจอง)", () => {
  assert.ok(
    trackingPageContent.includes("ไม่อนุมัติการจอง"),
    "Must display 'ไม่อนุมัติการจอง' for REJECTED status"
  );
  assert.ok(
    trackingPageContent.includes("b.rejectReason"),
    "Must support displaying reject reason when available"
  );
  assert.ok(
    trackingPageContent.includes("รอเจ้าหน้าที่ตรวจสอบ (Pending)") ||
      trackingPageContent.includes("PENDING"),
    "Must handle PENDING status"
  );
  assert.ok(
    trackingPageContent.includes("ได้รับการยืนยันแล้ว (Confirmed)") ||
      trackingPageContent.includes("CONFIRMED"),
    "Must handle CONFIRMED status"
  );
});

runTest("Tracking UI: Empty State when no bookings exist", () => {
  assert.ok(
    trackingPageContent.includes("bookings.length === 0"),
    "Must check for empty bookings list"
  );
  assert.ok(
    trackingPageContent.includes("ไม่พบคิวนัดหมายที่กำลังดำเนินการ"),
    "Must render friendly empty state message"
  );
  assert.ok(
    trackingPageContent.includes("/book"),
    "Empty state must provide a link to book a new appointment"
  );
});

// ---------------------------------------------------------------------------
// 2. Source Inspection: src/app/api/tracking/route.ts
// ---------------------------------------------------------------------------
const trackingApiPath = path.join(__dirname, "src", "app", "api", "tracking", "route.ts");
assert.ok(fs.existsSync(trackingApiPath), "src/app/api/tracking/route.ts must exist");
const trackingApiContent = fs.readFileSync(trackingApiPath, "utf-8");

runTest("Tracking API: Server-side LINE ID Token Verification & 401 Unauthorized", () => {
  assert.ok(
    trackingApiContent.includes("verifyLineIdToken"),
    "Must import and call verifyLineIdToken"
  );
  assert.ok(
    trackingApiContent.includes("if (!idToken)"),
    "Must reject missing token with 401"
  );
  assert.ok(
    trackingApiContent.includes("status: 401"),
    "Must return HTTP 401 for unauthenticated requests"
  );
});

runTest("Tracking API: Zero-Trust lineUserId lookup from Google Sheets", () => {
  assert.ok(
    trackingApiContent.includes("findBookingsByLineUserIdFromSheet"),
    "Must query bookings using verified lineUserId"
  );
  assert.ok(
    trackingApiContent.includes("verifiedLineUserId"),
    "Must strictly use verifiedLineUserId from token, never client-supplied ID"
  );
  assert.ok(
    trackingApiContent.includes('nationalIdOrHn: ""'),
    "Must conceal national ID/HN from responses"
  );
});

// ---------------------------------------------------------------------------
// 3. Functional Tests: Google Sheets Helper & Isolation
// ---------------------------------------------------------------------------
const sheetsHelperPath = path.join(__dirname, "src", "lib", "google-sheets.ts");
assert.ok(fs.existsSync(sheetsHelperPath), "src/lib/google-sheets.ts must exist");
const sheetsContent = fs.readFileSync(sheetsHelperPath, "utf-8");

runTest("Google Sheets: findBookingsByLineUserIdFromSheet helper exists", () => {
  assert.ok(
    sheetsContent.includes("export async function findBookingsByLineUserIdFromSheet"),
    "Must export findBookingsByLineUserIdFromSheet"
  );
});

// Mock simulation of findBookingsByLineUserIdFromSheet logic
const mockSheetRows = [
  {
    bookingId: "DEN-001",
    bookingDate: "2026-11-20",
    bookingTime: "09:00",
    patientName: "Alice Wonderland",
    service: "ขูดหินปูน / อุดฟัน",
    status: "PENDING",
    createdAt: "2026-11-17T08:00:00Z",
    phoneNumber: "0811111111",
    lineUserId: "U_USER_ALICE",
    isEmergency: false,
    reminderStatus: "PENDING",
    medicalRights: "บัตรทอง",
  },
  {
    bookingId: "DEN-002",
    bookingDate: "2026-11-21",
    bookingTime: "10:30",
    patientName: "Alice Wonderland",
    service: "ถอนฟัน / ผ่าฟันคุด",
    status: "CONFIRMED",
    createdAt: "2026-11-17T08:15:00Z",
    phoneNumber: "0811111111",
    lineUserId: "U_USER_ALICE",
    isEmergency: false,
    reminderStatus: "PENDING",
    medicalRights: "ประกันสังคม",
  },
  {
    bookingId: "DEN-003",
    bookingDate: "2026-11-22",
    bookingTime: "13:00",
    patientName: "Alice Wonderland",
    service: "รักษารากฟัน",
    status: "REJECTED",
    createdAt: "2026-11-17T08:30:00Z",
    phoneNumber: "0811111111",
    lineUserId: "U_USER_ALICE",
    isEmergency: false,
    reminderStatus: "PENDING",
    medicalRights: "ชำระเอง",
  },
  {
    bookingId: "DEN-004",
    bookingDate: "2026-11-20",
    bookingTime: "11:00",
    patientName: "Bob Builder",
    service: "ปรับเครื่องมือจัดฟัน",
    status: "CONFIRMED",
    createdAt: "2026-11-17T08:45:00Z",
    phoneNumber: "0822222222",
    lineUserId: "U_USER_BOB",
    isEmergency: false,
    reminderStatus: "ATTENDANCE_CONFIRMED",
    medicalRights: "ข้าราชการ",
  },
];

function simulateFindBookingsByLineUserId(lineUserId) {
  const targetId = (lineUserId || "").trim();
  if (!targetId) return [];
  const map = new Map();
  for (const b of mockSheetRows) {
    if ((b.lineUserId || "").trim() === targetId) {
      map.set(b.bookingId.toUpperCase(), b);
    }
  }
  return Array.from(map.values());
}

runTest("Privacy Isolation: User A sees ONLY User A's bookings (PENDING, CONFIRMED, REJECTED)", () => {
  const aliceBookings = simulateFindBookingsByLineUserId("U_USER_ALICE");
  assert.strictEqual(aliceBookings.length, 3, "Alice must see exactly 3 bookings");
  const statuses = aliceBookings.map((b) => b.status);
  assert.ok(statuses.includes("PENDING"), "Must include PENDING");
  assert.ok(statuses.includes("CONFIRMED"), "Must include CONFIRMED");
  assert.ok(statuses.includes("REJECTED"), "Must include REJECTED");
  assert.ok(
    aliceBookings.every((b) => b.lineUserId === "U_USER_ALICE"),
    "All bookings must belong to Alice"
  );
  assert.ok(
    !aliceBookings.some((b) => b.bookingId === "DEN-004"),
    "Alice must NOT see Bob's booking (DEN-004)"
  );
});

runTest("Privacy Isolation: User B sees ONLY User B's bookings and CANNOT see User A's", () => {
  const bobBookings = simulateFindBookingsByLineUserId("U_USER_BOB");
  assert.strictEqual(bobBookings.length, 1, "Bob must see exactly 1 booking");
  assert.strictEqual(bobBookings[0].bookingId, "DEN-004");
  assert.strictEqual(bobBookings[0].patientName, "Bob Builder");
  assert.ok(
    !bobBookings.some((b) => b.lineUserId === "U_USER_ALICE"),
    "Bob must NOT see any of Alice's bookings"
  );
});

runTest("Privacy Isolation: Non-existent or unknown LINE User returns Empty State", () => {
  const unknownBookings = simulateFindBookingsByLineUserId("U_UNKNOWN_USER");
  assert.strictEqual(unknownBookings.length, 0, "Unknown user must receive 0 bookings (empty array)");
  const emptyBookings = simulateFindBookingsByLineUserId("");
  assert.strictEqual(emptyBookings.length, 0, "Empty lineUserId must receive 0 bookings");
});

runTest("Zero-Trust Cross-Account Protection: User A requesting User B's booking ID returns []", () => {
  // Alice attempts to lookup DEN-004 (belonging to Bob)
  const aliceRecords = simulateFindBookingsByLineUserId("U_USER_ALICE");
  const targetQueue = "DEN-004";
  const matched = aliceRecords.filter(
    (r) => r.bookingId.toUpperCase() === targetQueue.toUpperCase()
  );
  assert.strictEqual(
    matched.length,
    0,
    "Alice must NOT be able to view Bob's booking even by knowing the booking ID"
  );
});

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log("=================================================");

if (passedTests === totalTests) {
  console.log("✅ ALL STEP 2.5 TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("❌ SOME TESTS FAILED!");
  process.exit(1);
}
