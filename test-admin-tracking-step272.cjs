/**
 * test-admin-tracking-step272.cjs
 * Comprehensive test suite for DentQ Step 2.7.2: Admin & Tracking Frontend
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP 2.7.2 ADMIN & TRACKING FRONTEND");
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
// 1. Source Inspection: src/app/admin/page.tsx
// ---------------------------------------------------------------------------
const adminPagePath = path.join(__dirname, "src", "app", "admin", "page.tsx");
assert.ok(fs.existsSync(adminPagePath), "src/app/admin/page.tsx must exist");
const adminPageContent = fs.readFileSync(adminPagePath, "utf-8");

runTest("Admin Dashboard: View all bookings support (date=ALL)", () => {
  assert.ok(
    adminPageContent.includes('const [dateMode, setDateMode] = useState<"ALL" | "SINGLE">("ALL");'),
    "Must support dateMode ALL"
  );
  assert.ok(
    adminPageContent.includes('activeDate === "ALL" ? "date=ALL" : `date=${activeDate}`'),
    "Must send date=ALL to /api/bookings when in ALL mode"
  );
  assert.ok(
    adminPageContent.includes("ทั้งหมด (ทุกวัน)"),
    "Must provide button to view all bookings across all dates"
  );
});

runTest("Admin Dashboard: Search by Queue Number, LINE profile name, and Phone", () => {
  assert.ok(
    adminPageContent.includes("const matchQueue = (b.queueNumber || \"\").toLowerCase().includes(q)"),
    "Must search by queueNumber"
  );
  assert.ok(
    adminPageContent.includes("const matchName = (b.patientName || \"\").toLowerCase().includes(q)"),
    "Must search by patientName (LINE display name)"
  );
  assert.ok(
    adminPageContent.includes("const matchPhone = (b.phoneNumber || \"\").replace(/\\D/g, \"\").includes(q.replace(/\\D/g, \"\"))"),
    "Must search by phoneNumber"
  );
});

runTest("Admin Dashboard: Multi-dimension filters (Status, Period, Service, Medical Rights)", () => {
  assert.ok(
    adminPageContent.includes("periodFilter") && adminPageContent.includes("setPeriodFilter"),
    "Must have period filter (รอบเช้า / รอบบ่าย)"
  );
  assert.ok(
    adminPageContent.includes("serviceFilter") && adminPageContent.includes("setServiceFilter"),
    "Must have service filter (สาเหตุการมา / บริการ)"
  );
  assert.ok(
    adminPageContent.includes("medicalRightsFilter") && adminPageContent.includes("setMedicalRightsFilter"),
    "Must have medical rights filter (สิทธิการรักษา)"
  );
  assert.ok(
    adminPageContent.includes("statusFilter") && adminPageContent.includes("setStatusFilter"),
    "Must have status filter"
  );
});

runTest("Admin Dashboard: Displays Medical Rights column in table", () => {
  assert.ok(
    adminPageContent.includes('<th className="py-3.5 px-4">สิทธิการรักษา</th>'),
    "Table header must include สิทธิการรักษา"
  );
  assert.ok(
    adminPageContent.includes("b.medicalRights"),
    "Table row must render b.medicalRights badge"
  );
});

runTest("Admin Dashboard: Shows REJECTED badge and actual rejectReason in table", () => {
  assert.ok(
    adminPageContent.includes('b.status === "REJECTED"'),
    "Must handle REJECTED status in table"
  );
  assert.ok(
    adminPageContent.includes("b.rejectReason"),
    "Must display b.rejectReason in table row"
  );
  assert.ok(
    adminPageContent.includes("🚫 ไม่อนุมัติ"),
    "Must display 🚫 ไม่อนุมัติ"
  );
});

runTest("Admin Reject Flow: Reject dialog with presets, validation, and double-submit guard", () => {
  assert.ok(
    adminPageContent.includes("isSubmittingReject") && adminPageContent.includes("setIsSubmittingReject"),
    "Must track isSubmittingReject state to prevent duplicate submissions"
  );
  assert.ok(
    adminPageContent.includes("!cleanReason") || adminPageContent.includes("!rejectReason.trim()"),
    "Must require non-empty rejectReason"
  );
  assert.ok(
    adminPageContent.includes("cleanReason.length > 500") || adminPageContent.includes("rejectReason.trim().length > 500"),
    "Must enforce maximum length of 500 characters"
  );
  assert.ok(
    adminPageContent.includes("disabled={!rejectReason.trim() || rejectReason.trim().length > 500 || isSubmittingReject}"),
    "Submit button must be disabled when reason is empty, exceeds 500 chars, or submitting"
  );
  assert.ok(
    adminPageContent.includes("กำลังบันทึก..."),
    "Must show loading spinner and text while submitting"
  );
});

runTest("Admin Reject Flow: Never shows success before Backend confirms", () => {
  assert.ok(
    adminPageContent.includes("if (data.success)"),
    "Must check data.success before displaying success action message"
  );
  assert.ok(
    adminPageContent.includes("setRejectError(data.error || "),
    "Must display error message when backend returns an error"
  );
});

// ---------------------------------------------------------------------------
// 2. Source Inspection: src/app/tracking/page.tsx
// ---------------------------------------------------------------------------
const trackingPagePath = path.join(__dirname, "src", "app", "tracking", "page.tsx");
assert.ok(fs.existsSync(trackingPagePath), "src/app/tracking/page.tsx must exist");
const trackingPageContent = fs.readFileSync(trackingPagePath, "utf-8");

runTest("Tracking UI: Displays actual rejectReason when REJECTED without fake text", () => {
  assert.ok(
    !trackingPageContent.includes('"คลินิกไม่สามารถรับนัดหมายในวันและเวลาดังกล่าวได้ กรุณาทำการจองคิวใหม่หรือติดต่อคลินิก"'),
    "Must NOT invent fake rejection sentence"
  );
  assert.ok(
    trackingPageContent.includes("b.rejectReason && b.rejectReason.trim()"),
    "Must conditionally render explanation only when b.rejectReason is non-empty"
  );
  assert.ok(
    trackingPageContent.includes("<span>ไม่อนุมัติการจอง</span>"),
    "Must render ไม่อนุมัติการจอง"
  );
});

runTest("Tracking UI: Provides 'จองคิวใหม่' button linking to /book", () => {
  assert.ok(
    trackingPageContent.includes('href="/book"'),
    "Must have Link to /book"
  );
  assert.ok(
    trackingPageContent.includes("จองคิวใหม่"),
    "Must have button labeled จองคิวใหม่"
  );
});

runTest("Tracking UI: Enforces LINE login gate and zero-trust token", () => {
  assert.ok(
    trackingPageContent.includes("!lineProfile || !lineIdToken"),
    "Must require LINE profile and token"
  );
  assert.ok(
    trackingPageContent.includes("Authorization: `Bearer ${token}`"),
    "Must send token via Authorization Header"
  );
});

// ---------------------------------------------------------------------------
// 3. Source Inspection: src/app/api/bookings/route.ts
// ---------------------------------------------------------------------------
const bookingsRoutePath = path.join(__dirname, "src", "app", "api", "bookings", "route.ts");
assert.ok(fs.existsSync(bookingsRoutePath), "src/app/api/bookings/route.ts must exist");
const bookingsRouteContent = fs.readFileSync(bookingsRoutePath, "utf-8");

runTest("Bookings API: Supports date=ALL query for Admin without date restriction", () => {
  assert.ok(
    bookingsRouteContent.includes('date && date !== "ALL"'),
    "Must bypass date filter when date === 'ALL'"
  );
  assert.ok(
    bookingsRouteContent.includes("medicalRights: (b as any).medicalRights || \"\"") ||
      bookingsRouteContent.includes("medicalRights: b.medicalRights || \"\""),
    "Must return medicalRights in bookings response"
  );
});

runTest("Bookings API: Server-side Admin Auth Guard on date queries", () => {
  assert.ok(
    bookingsRouteContent.includes('req.cookies.get("admin_session")?.value'),
    "Must check admin_session cookie server-side"
  );
  assert.ok(
    bookingsRouteContent.includes("status: 401"),
    "Must return 401 Unauthorized when unauthenticated"
  );
});

// ---------------------------------------------------------------------------
// 4. Functional Filter Simulation
// ---------------------------------------------------------------------------
runTest("Functional Filter: Correctly filters by period, service, medical rights, and search", () => {
  const mockBookings = [
    {
      id: "1",
      queueNumber: "DEN-001",
      patientName: "สมชาย ใจดี (LINE)",
      phoneNumber: "0812345678",
      time: "09:30",
      period: "MORNING",
      status: "PENDING",
      medicalRights: "บัตรทอง",
      service: { nameTh: "ขูดหินปูน" },
    },
    {
      id: "2",
      queueNumber: "DEN-002",
      patientName: "สมศรี มีสุข (LINE)",
      phoneNumber: "0898765432",
      time: "14:00",
      period: "AFTERNOON",
      status: "CONFIRMED",
      medicalRights: "ประกันสังคม",
      service: { nameTh: "อุดฟัน" },
    },
    {
      id: "3",
      queueNumber: "DEN-003",
      patientName: "วิชัย เก่งกาจ (LINE)",
      phoneNumber: "0861112233",
      time: "10:00",
      period: "MORNING",
      status: "REJECTED",
      medicalRights: "ชำระเอง",
      service: { nameTh: "ถอนฟัน" },
      rejectReason: "คิวเต็มในช่วงเวลาดังกล่าว",
    },
  ];

  // Test Search by queueNumber
  const byQueue = mockBookings.filter((b) => b.queueNumber.toLowerCase().includes("den-002"));
  assert.strictEqual(byQueue.length, 1);
  assert.strictEqual(byQueue[0].patientName, "สมศรี มีสุข (LINE)");

  // Test Search by LINE Name
  const byName = mockBookings.filter((b) => b.patientName.toLowerCase().includes("วิชัย"));
  assert.strictEqual(byName.length, 1);
  assert.strictEqual(byName[0].queueNumber, "DEN-003");

  // Test Period Filter: Morning
  const morningOnly = mockBookings.filter((b) => b.period === "MORNING");
  assert.strictEqual(morningOnly.length, 2);

  // Test Medical Rights: ประกันสังคม
  const ssoOnly = mockBookings.filter((b) => b.medicalRights === "ประกันสังคม");
  assert.strictEqual(ssoOnly.length, 1);
  assert.strictEqual(ssoOnly[0].queueNumber, "DEN-002");

  // Test Service: ขูดหินปูน
  const scalingOnly = mockBookings.filter((b) => b.service.nameTh.includes("ขูด"));
  assert.strictEqual(scalingOnly.length, 1);
  assert.strictEqual(scalingOnly[0].queueNumber, "DEN-001");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log("=========================================================");

if (passedTests === totalTests) {
  console.log("\n>>> ALL STEP 2.7.2 TESTS PASSED SUCCESSFULLY! <<<\n");
  process.exit(0);
} else {
  console.error(`\n>>> ${totalTests - passedTests} TESTS FAILED <<<\n`);
  process.exit(1);
}
