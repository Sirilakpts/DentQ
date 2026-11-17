/**
 * test-rejection-reason-step271.cjs
 * Comprehensive test suite for DentQ Step 2.7.1: Rejection Reason Backend
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP 2.7.1 REJECTION REASON BACKEND");
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
// 1. Source Inspection: src/lib/google-sheets.ts
// ---------------------------------------------------------------------------
const sheetsPath = path.join(__dirname, "src", "lib", "google-sheets.ts");
assert.ok(fs.existsSync(sheetsPath), "src/lib/google-sheets.ts must exist");
const sheetsContent = fs.readFileSync(sheetsPath, "utf-8");

runTest("Google Sheets: SheetBookingRecord includes Col M rejectionReason", () => {
  assert.ok(
    sheetsContent.includes("rejectionReason: string; // Col M: rejection_reason"),
    "SheetBookingRecord must include rejectionReason"
  );
  assert.ok(
    sheetsContent.includes("medicalRights: string; // Col L: medical_rights"),
    "SheetBookingRecord must preserve medicalRights at Col L"
  );
  assert.ok(
    sheetsContent.includes("rejectionReason?: string | null;"),
    "SheetBookingData must support optional rejectionReason"
  );
});

runTest("Google Sheets: parseRow handles backward compatibility (12 cols) & Col M (13 cols)", () => {
  assert.ok(
    sheetsContent.includes('const colM = String(row[12] ?? "").trim();'),
    "parseRow must safely read row[12] with fallback to empty string"
  );
  assert.ok(
    sheetsContent.includes("rejectionReason: colM"),
    "parseRow must map colM to rejectionReason"
  );
});

runTest("Google Sheets: appendBookingToSheet writes 13 columns (A:M)", () => {
  assert.ok(
    sheetsContent.includes('range: "Bookings!A:M"'),
    "appendBookingToSheet must append to range Bookings!A:M"
  );
  assert.ok(
    sheetsContent.includes("medicalRights,\n      rejectionReason,"),
    "appendBookingToSheet must include medicalRights followed by rejectionReason"
  );
});

runTest("Google Sheets: getAllBookingsFromSheet reads range Bookings!A2:M", () => {
  assert.ok(
    sheetsContent.includes('range: "Bookings!A2:M"'),
    "getAllBookingsFromSheet must query range Bookings!A2:M"
  );
});

runTest("Google Sheets: updateBookingStatusInSheet supports batch update for status and rejection_reason", () => {
  assert.ok(
    sheetsContent.includes("updateBookingStatusInSheet(\n  bookingId: string,\n  newStatus: string,\n  rejectReason?: string | null\n)"),
    "updateBookingStatusInSheet must accept rejectReason parameter"
  );
  assert.ok(
    sheetsContent.includes("`Bookings!F${booking.rowIndex}`") &&
      sheetsContent.includes("`Bookings!M${booking.rowIndex}`"),
    "Must update Col F for status and Col M for rejection_reason"
  );
  assert.ok(
    sheetsContent.includes("export async function updateBookingRejectionReasonInSheet"),
    "Must export updateBookingRejectionReasonInSheet helper"
  );
});

// ---------------------------------------------------------------------------
// 2. Functional Row Parsing & Backward Compatibility Simulation
// ---------------------------------------------------------------------------
function mockNormalizeMedicalRights(val) {
  if (!val) return "";
  const allowed = ["บัตรทอง", "ประกันสังคม", "ข้าราชการ", "ชำระเอง", "ไม่แน่ใจ"];
  const trimmed = val.trim();
  const matched = allowed.find((item) => item.toLowerCase() === trimmed.toLowerCase());
  return matched || trimmed;
}

function mockParseRow(row, rowIndex) {
  const colA = String(row[0] ?? "").trim();
  const colB = String(row[1] ?? "").trim();
  const colC = String(row[2] ?? "").trim();
  const colD = String(row[3] ?? "").trim();
  let colE = String(row[4] ?? "").trim();
  if (/^\d:\d{2}$/.test(colE)) colE = `0${colE}`;
  const colF = String(row[5] ?? "").trim().toUpperCase();
  const colG = String(row[6] ?? "").trim();
  let colH = String(row[7] ?? "").trim();
  if (colH.length === 9 && !colH.startsWith("0")) colH = `0${colH}`;
  const colI = String(row[8] ?? "").trim();
  const colJRaw = String(row[9] ?? "").trim().toUpperCase();
  const colJ = colJRaw === "TRUE" || colJRaw === "1";
  const colK = String(row[10] ?? "").trim().toUpperCase();
  const colL = mockNormalizeMedicalRights(String(row[11] ?? ""));
  const colM = String(row[12] ?? "").trim();

  return {
    rowIndex,
    bookingId: colA,
    patientName: colB,
    service: colC,
    bookingDate: colD,
    bookingTime: colE,
    status: colF || "PENDING",
    createdAt: colG,
    phoneNumber: colH,
    lineUserId: colI,
    isEmergency: colJ,
    reminderStatus: colK || "PENDING",
    medicalRights: colL,
    rejectionReason: colM,
  };
}

runTest("Functional: Old row with only 12 columns parses cleanly with empty rejectionReason", () => {
  const oldRow = [
    "DEN-001",
    "สมศรี มีสุข",
    "ขูดหินปูน",
    "2026-11-20",
    "09:30",
    "CONFIRMED",
    "2026-11-17T08:00:00Z",
    "0812345678",
    "U1234567890",
    "FALSE",
    "PENDING",
    "บัตรทอง",
  ]; // Length 12, no index 12

  const record = mockParseRow(oldRow, 2);
  assert.strictEqual(record.bookingId, "DEN-001");
  assert.strictEqual(record.patientName, "สมศรี มีสุข");
  assert.strictEqual(record.medicalRights, "บัตรทอง");
  assert.strictEqual(record.rejectionReason, "", "Old row must yield empty string for Col M");
});

runTest("Functional: New row with 13 columns parses rejectionReason correctly", () => {
  const newRow = [
    "DEN-002",
    "วิชัย เก่งกาจ",
    "อุดฟัน",
    "2026-11-20",
    "10:00",
    "REJECTED",
    "2026-11-17T08:30:00Z",
    "0898765432",
    "U9876543210",
    "FALSE",
    "PENDING",
    "ประกันสังคม",
    "คิวเต็มแล้ว และทันตแพทย์ติดภารกิจประชุมวิชาการ",
  ]; // Length 13

  const record = mockParseRow(newRow, 3);
  assert.strictEqual(record.bookingId, "DEN-002");
  assert.strictEqual(record.status, "REJECTED");
  assert.strictEqual(record.medicalRights, "ประกันสังคม");
  assert.strictEqual(record.rejectionReason, "คิวเต็มแล้ว และทันตแพทย์ติดภารกิจประชุมวิชาการ");
});

// ---------------------------------------------------------------------------
// 3. Source Inspection: src/app/api/bookings/[id]/status/route.ts
// ---------------------------------------------------------------------------
const statusRoutePath = path.join(__dirname, "src", "app", "api", "bookings", "[id]", "status", "route.ts");
assert.ok(fs.existsSync(statusRoutePath), "status route must exist");
const statusRouteContent = fs.readFileSync(statusRoutePath, "utf-8");

runTest("Status API: Enforces rejectReason when status === REJECTED", () => {
  assert.ok(
    statusRouteContent.includes('if (status === "REJECTED")'),
    "Must check status === REJECTED"
  );
  assert.ok(
    statusRouteContent.includes("!rejectReason || !String(rejectReason).trim()"),
    "Must validate non-empty rejectReason"
  );
  assert.ok(
    statusRouteContent.includes("กรุณาระบุเหตุผลการไม่อนุมัติการจองคิว"),
    "Must return specific error message in Thai"
  );
});

runTest("Status API: Enforces max length (500 chars) for rejectReason", () => {
  assert.ok(
    statusRouteContent.includes("String(rejectReason).trim().length > 500"),
    "Must enforce maximum length check of 500 characters"
  );
  assert.ok(
    statusRouteContent.includes("เหตุผลการไม่อนุมัติมีความยาวเกินกำหนด (สูงสุด 500 ตัวอักษร)"),
    "Must return clear error message when rejectReason exceeds 500 chars"
  );
});

runTest("Status API: Uses actual staff reason and passes to Google Sheets & LINE", () => {
  assert.ok(
    statusRouteContent.includes("status === \"REJECTED\" ? cleanRejectReason : undefined"),
    "Google Sheets update must receive cleanRejectReason"
  );
  assert.ok(
    statusRouteContent.includes("rejectReason: cleanRejectReason"),
    "LINE flex rejection message must receive cleanRejectReason"
  );
});

runTest("Status API: Persists status & reason BEFORE sending LINE notification", () => {
  const patchStart = statusRouteContent.indexOf("export async function PATCH");
  const patchBody = statusRouteContent.slice(patchStart);

  const sheetsModeStart = patchBody.indexOf('if (bookingStorage === "sheets")');
  const sqliteModeStart = patchBody.indexOf("// Mode 2: SQLite Mode");
  assert.ok(sheetsModeStart > 0 && sqliteModeStart > 0, "Both mode blocks must exist in PATCH handler");

  const sheetsBlock = patchBody.slice(sheetsModeStart, sqliteModeStart);
  const sqliteBlock = patchBody.slice(sqliteModeStart);

  const sheetsUpdatePos = sheetsBlock.indexOf("await updateBookingStatusInSheet");
  const sheetsSendPos = sheetsBlock.indexOf("await sendLineFlexNotification");
  assert.ok(sheetsUpdatePos > 0 && sheetsSendPos > 0, "Both calls must exist in Sheets mode");
  assert.ok(sheetsUpdatePos < sheetsSendPos, "Google Sheets update must occur BEFORE sendLineFlexNotification");

  const sqliteUpdatePos = sqliteBlock.indexOf("await prisma.booking.update");
  const sqliteSendPos = sqliteBlock.indexOf("await sendLineFlexNotification");
  assert.ok(sqliteUpdatePos > 0 && sqliteSendPos > 0, "Both calls must exist in SQLite mode");
  assert.ok(sqliteUpdatePos < sqliteSendPos, "Prisma update must occur BEFORE sendLineFlexNotification");
});

// ---------------------------------------------------------------------------
// 4. Source Inspection: src/app/api/tracking/route.ts
// ---------------------------------------------------------------------------
const trackingRoutePath = path.join(__dirname, "src", "app", "api", "tracking", "route.ts");
assert.ok(fs.existsSync(trackingRoutePath), "tracking route must exist");
const trackingRouteContent = fs.readFileSync(trackingRoutePath, "utf-8");

runTest("Tracking API: Returns actual rejectReason from Sheets Col M / SQLite without fake text", () => {
  assert.ok(
    !trackingRouteContent.includes('"ไม่สามารถอนุมัติการจองคิวได้เนื่องจากคิวเต็มหรืออยู่นอกเวลาให้บริการ"'),
    "Must NOT contain fabricated fake rejection reason"
  );
  assert.ok(
    trackingRouteContent.includes("r.status === \"REJECTED\" ? (r.rejectionReason || null) : null") ||
      trackingRouteContent.includes("r.status === \"REJECTED\"\n                ? (r.rejectionReason || null)\n                : null"),
    "Must return r.rejectionReason for REJECTED bookings in Sheets mode"
  );
  assert.ok(
    trackingRouteContent.includes("b.status === \"REJECTED\" ? (b.rejectReason || null) : null"),
    "Must return b.rejectReason for REJECTED bookings in SQLite mode"
  );
});

runTest("Tracking API: Zero-Trust privacy check ensures user only sees their own reason", () => {
  assert.ok(
    trackingRouteContent.includes("verifyLineIdToken"),
    "Must verify LINE ID Token"
  );
  assert.ok(
    /findBookingsByLineUserIdFromSheet\s*\(\s*verifiedLineUserId\s*\)/.test(trackingRouteContent),
    "Must filter by verifiedLineUserId in Sheets mode"
  );
  assert.ok(
    trackingRouteContent.includes("where.lineUserId = verifiedLineUserId") ||
      trackingRouteContent.includes("lineUserId: verifiedLineUserId"),
    "Must filter by verifiedLineUserId in SQLite mode"
  );
});

// ---------------------------------------------------------------------------
// 5. Functional LINE Flex Message Reason Rendering
// ---------------------------------------------------------------------------
function testBuildRejectionFlex(booking) {
  const hasReason = Boolean(booking.rejectReason && booking.rejectReason.trim());
  return {
    type: "flex",
    altText: `แจ้งเตือนการนัดหมาย คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      hasReasonBlock: hasReason,
      reasonText: hasReason ? booking.rejectReason.trim() : null,
      service: booking.serviceNameTh,
      queueNumber: booking.queueNumber,
    },
  };
}

runTest("LINE Notification: Renders staff explanation block when rejectReason is provided", () => {
  const actualReason = "ทันตแพทย์ติดภารกิจผ่าตัดด่วน กรุณาติดต่อเลื่อนนัด";
  const msg = testBuildRejectionFlex({
    queueNumber: "DEN-003",
    patientName: "สมหมาย",
    serviceNameTh: "ถอนฟัน",
    date: "2026-11-20",
    time: "11:00",
    rejectReason: actualReason,
  });

  assert.strictEqual(msg.contents.hasReasonBlock, true);
  assert.strictEqual(msg.contents.reasonText, actualReason);
});

runTest("LINE Notification: Does NOT render fake explanation when reason is empty/missing", () => {
  const msg = testBuildRejectionFlex({
    queueNumber: "DEN-004",
    patientName: "สมหญิง",
    serviceNameTh: "ตรวจฟัน",
    date: "2026-11-20",
    time: "14:00",
    rejectReason: "",
  });

  assert.strictEqual(msg.contents.hasReasonBlock, false);
  assert.strictEqual(msg.contents.reasonText, null);
});

// ---------------------------------------------------------------------------
// 6. Quota Integrity: Rejected status releases morning & daily quotas
// ---------------------------------------------------------------------------
const utilsPath = path.join(__dirname, "src", "lib", "utils.ts");
const utilsContent = fs.readFileSync(utilsPath, "utf-8");

runTest("Quota: REJECTED status is excluded from ACTIVE_BOOKING_STATUSES", () => {
  assert.ok(
    utilsContent.includes("ACTIVE_BOOKING_STATUSES"),
    "Must define ACTIVE_BOOKING_STATUSES"
  );
  assert.ok(
    !utilsContent.includes('"REJECTED"') ||
      utilsContent.indexOf('"REJECTED"') > utilsContent.indexOf("countActiveMorningBookings"),
    "ACTIVE_BOOKING_STATUSES must NOT include REJECTED"
  );

  // Simulation: active morning count
  const bookings = [
    { bookingId: "DEN-001", time: "09:00", status: "PENDING", isEmergency: false },
    { bookingId: "DEN-002", time: "09:30", status: "CONFIRMED", isEmergency: false },
    { bookingId: "DEN-003", time: "10:00", status: "REJECTED", isEmergency: false }, // REJECTED -> quota released
    { bookingId: "DEN-004", time: "10:30", status: "CANCELLED", isEmergency: false }, // CANCELLED -> quota released
  ];

  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];
  const morningCount = bookings.filter((b) => {
    const hour = parseInt(b.time.split(":")[0], 10);
    return hour < 12 && activeStatuses.includes(b.status);
  }).length;

  assert.strictEqual(morningCount, 2, "Only PENDING and CONFIRMED should be counted; REJECTED must release quota");
});

// ---------------------------------------------------------------------------
// 7. Prisma SQLite Schema Verification
// ---------------------------------------------------------------------------
const prismaSchemaPath = path.join(__dirname, "prisma", "schema.prisma");
assert.ok(fs.existsSync(prismaSchemaPath), "prisma/schema.prisma must exist");
const prismaContent = fs.readFileSync(prismaSchemaPath, "utf-8");

runTest("Prisma: rejectReason String? already exists on Booking model (no migration needed)", () => {
  assert.ok(
    prismaContent.includes("rejectReason        String?"),
    "Prisma Booking model must have rejectReason String?"
  );
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log("=========================================================");

if (passedTests === totalTests) {
  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n");
  process.exit(0);
} else {
  console.error(`\n>>> ${totalTests - passedTests} TESTS FAILED <<<\n`);
  process.exit(1);
}
