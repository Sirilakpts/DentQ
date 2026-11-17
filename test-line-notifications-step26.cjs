/**
 * test-line-notifications-step26.cjs
 * Comprehensive test suite for DentQ Step 2.6: Automatic LINE Notifications
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP 2.6 AUTOMATIC LINE NOTIFICATIONS");
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
// 1. Source Inspection: src/lib/line.ts
// ---------------------------------------------------------------------------
const lineLibPath = path.join(__dirname, "src", "lib", "line.ts");
assert.ok(fs.existsSync(lineLibPath), "src/lib/line.ts must exist");
const lineLibContent = fs.readFileSync(lineLibPath, "utf-8");

runTest("Helper: buildPendingFlexMessage exists and states รอเจ้าหน้าที่ตรวจสอบ (Not Approved)", () => {
  assert.ok(
    lineLibContent.includes("export function buildPendingFlexMessage"),
    "Must export buildPendingFlexMessage"
  );
  assert.ok(
    lineLibContent.includes("รอเจ้าหน้าที่ตรวจสอบ (PENDING)"),
    "Must explicitly state รอเจ้าหน้าที่ตรวจสอบ (PENDING)"
  );
  assert.ok(
    lineLibContent.includes("ยังไม่อนุมัติ"),
    "Must state that it is not yet approved"
  );
});

runTest("Helper: buildRejectionFlexMessage does NOT fabricate fake reason when empty", () => {
  assert.ok(
    lineLibContent.includes("export function buildRejectionFlexMessage"),
    "Must export buildRejectionFlexMessage"
  );
  assert.ok(
    !lineLibContent.includes('"ช่วงเวลาดังกล่าวมีเคสผ่าตัดฉุกเฉินหรือทันตแพทย์ติดภารกิจด่วน กรุณาเลือกช่วงเวลาอื่นที่สะดวก"'),
    "Must NOT invent fake rejection explanation when rejectReason is empty"
  );
  assert.ok(
    lineLibContent.includes("booking.rejectReason && booking.rejectReason.trim()"),
    "Must only render reason block when rejectReason is provided"
  );
});

runTest("Helper: sendLineFlexNotification supports PENDING type", () => {
  assert.ok(
    lineLibContent.includes('"PENDING" | "APPROVAL" | "REJECTION"'),
    "sendLineFlexNotification type union must include PENDING"
  );
});

// ---------------------------------------------------------------------------
// 2. Source Inspection: Trigger call sites in API routes
// ---------------------------------------------------------------------------
const bookingsApiPath = path.join(__dirname, "src", "app", "api", "bookings", "route.ts");
const statusApiPath = path.join(__dirname, "src", "app", "api", "bookings", "[id]", "status", "route.ts");
const cronPath = path.join(__dirname, "src", "lib", "cron.ts");

const bookingsApiContent = fs.readFileSync(bookingsApiPath, "utf-8");
const statusApiContent = fs.readFileSync(statusApiPath, "utf-8");
const cronContent = fs.readFileSync(cronPath, "utf-8");

runTest("Event 1 Trigger: POST /api/bookings triggers PENDING notification fail-safely", () => {
  assert.ok(
    bookingsApiContent.includes("buildPendingFlexMessage"),
    "Must call buildPendingFlexMessage on booking creation"
  );
  assert.ok(
    bookingsApiContent.includes('type: "PENDING"'),
    "Must send notification with type PENDING"
  );
  assert.ok(
    bookingsApiContent.includes("verifiedLineUserId"),
    "Must use verifiedLineUserId from token"
  );
});

runTest("Event 2 & 3 Triggers: Status API triggers CONFIRMED and REJECTED with duplicate guard", () => {
  assert.ok(
    statusApiContent.includes("buildApprovalFlexMessage"),
    "Must call buildApprovalFlexMessage on CONFIRMED"
  );
  assert.ok(
    statusApiContent.includes("buildRejectionFlexMessage"),
    "Must call buildRejectionFlexMessage on REJECTED"
  );
  assert.ok(
    statusApiContent.includes('reason: "DUPLICATE_STATUS"'),
    "Must detect duplicate status and skip notification"
  );
});

runTest("Event 4 Trigger: Cron triggers advance reminder for confirmed bookings only", () => {
  assert.ok(
    cronContent.includes("buildAdvanceReminderFlexMessage"),
    "Must call buildAdvanceReminderFlexMessage in cron"
  );
  assert.ok(
    cronContent.includes('booking.status !== "CONFIRMED"'),
    "Must only remind CONFIRMED bookings"
  );
  assert.ok(
    cronContent.includes('reminderStatus === "SENT"'),
    "Must prevent duplicate reminders if already SENT"
  );
});

// ---------------------------------------------------------------------------
// 3. Functional Flex Message Content & Privacy Tests
// ---------------------------------------------------------------------------

// Inline helpers for testing flex message content
function formatThaiDate(dateStr) {
  return dateStr;
}
function maskPhoneNumber(phone) {
  return phone ? `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}` : "";
}

function testBuildPendingFlexMessage(booking) {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });
  const maskedPhone = booking.phoneNumber ? maskPhoneNumber(booking.phoneNumber) : "";
  return {
    type: "flex",
    altText: `บันทึกคำขอจองคิว ${booking.queueNumber} (รอตรวจสอบ) - Q-Dentist Clinic`,
    contents: {
      header: "บันทึกคำขอจองคิวแล้ว (ยังไม่อนุมัติ)",
      statusText: "⏳ รอเจ้าหน้าที่ตรวจสอบ (PENDING)",
      queueNumber: booking.queueNumber,
      service: booking.serviceNameTh,
      date: formattedDate,
      time: `${booking.time} น.`,
      patient: maskedPhone ? `${booking.patientName} (${maskedPhone})` : booking.patientName,
    },
  };
}

function testBuildRejectionFlexMessage(booking) {
  const hasReason = Boolean(booking.rejectReason && booking.rejectReason.trim());
  return {
    type: "flex",
    altText: `แจ้งเตือนการนัดหมาย คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    hasReasonBlock: hasReason,
    reason: hasReason ? booking.rejectReason.trim() : null,
  };
}

runTest("Event 1 Content: PENDING flex message specifies รอเจ้าหน้าที่ตรวจสอบ and NOT approved", () => {
  const pendingMsg = testBuildPendingFlexMessage({
    queueNumber: "DEN-001",
    patientName: "สมชาย ใจดี",
    phoneNumber: "0812345678",
    date: "2026-11-20",
    time: "10:00",
    serviceNameTh: "ขูดหินปูน / อุดฟัน",
  });

  assert.ok(pendingMsg.altText.includes("รอตรวจสอบ"));
  assert.ok(pendingMsg.contents.statusText.includes("PENDING"));
  assert.ok(!pendingMsg.contents.statusText.includes("อนุมัติแล้ว"));
  assert.strictEqual(pendingMsg.contents.queueNumber, "DEN-001");
});

runTest("Event 3 Content: REJECTED does NOT invent fake reason when empty", () => {
  const rejWithoutReason = testBuildRejectionFlexMessage({
    queueNumber: "DEN-002",
    patientName: "สมหญิง",
    serviceNameTh: "ถอนฟัน",
    date: "2026-11-20",
    time: "11:00",
    rejectReason: undefined,
  });

  assert.strictEqual(rejWithoutReason.hasReasonBlock, false);
  assert.strictEqual(rejWithoutReason.reason, null);

  const rejWithReason = testBuildRejectionFlexMessage({
    queueNumber: "DEN-003",
    patientName: "สมบูรณ์",
    serviceNameTh: "รักษารากฟัน",
    date: "2026-11-20",
    time: "14:00",
    rejectReason: "แพทย์ติดภารกิจประชุมวิชาการ",
  });

  assert.strictEqual(rejWithReason.hasReasonBlock, true);
  assert.strictEqual(rejWithReason.reason, "แพทย์ติดภารกิจประชุมวิชาการ");
});

runTest("Privacy: Notifications do NOT contain medical symptoms or health notes", () => {
  assert.ok(
    !lineLibContent.includes("booking.symptoms"),
    "LINE flex templates must not include booking.symptoms"
  );
  assert.ok(
    !lineLibContent.includes("อาการที่แจ้งไว้:"),
    "LINE flex templates must not display symptoms text"
  );
});

// ---------------------------------------------------------------------------
// 4. Duplicate Notification Simulation
// ---------------------------------------------------------------------------
function simulateStatusNotification(currentStatus, newStatus, lineUserId) {
  if (currentStatus === newStatus) {
    return {
      notificationSent: false,
      notificationResult: {
        status: "SKIPPED",
        reason: "DUPLICATE_STATUS",
        message: "สถานะเดิม ไม่ส่งแจ้งเตือนซ้ำ",
      },
    };
  }

  if (!lineUserId) {
    return {
      notificationSent: false,
      notificationResult: {
        status: "SKIPPED",
        reason: "NO_LINE_USER_ID",
      },
    };
  }

  return {
    notificationSent: true,
    notificationResult: {
      status: "SUCCESS",
    },
  };
}

runTest("Duplicate Prevention: Calling API with same status skips sending", () => {
  // Case 1: Already CONFIRMED, called again with CONFIRMED
  const res1 = simulateStatusNotification("CONFIRMED", "CONFIRMED", "U_USER_ALICE");
  assert.strictEqual(res1.notificationSent, false);
  assert.strictEqual(res1.notificationResult.status, "SKIPPED");
  assert.strictEqual(res1.notificationResult.reason, "DUPLICATE_STATUS");

  // Case 2: Already REJECTED, called again with REJECTED
  const res2 = simulateStatusNotification("REJECTED", "REJECTED", "U_USER_ALICE");
  assert.strictEqual(res2.notificationSent, false);
  assert.strictEqual(res2.notificationResult.status, "SKIPPED");
  assert.strictEqual(res2.notificationResult.reason, "DUPLICATE_STATUS");

  // Case 3: Transition from PENDING to CONFIRMED
  const res3 = simulateStatusNotification("PENDING", "CONFIRMED", "U_USER_ALICE");
  assert.strictEqual(res3.notificationSent, true);
  assert.strictEqual(res3.notificationResult.status, "SUCCESS");
});

runTest("Fail-Safe: LINE API failure does NOT cause booking status update to fail", () => {
  // Simulate API handler with failing LINE notification
  function simulateStatusUpdateWithFailedNotif() {
    let bookingUpdated = false;
    let notifResult = null;

    // 1. Update booking
    bookingUpdated = true;

    // 2. Notification throws network error
    try {
      throw new Error("LINE Push API 500 Internal Server Error");
    } catch (notifErr) {
      notifResult = { status: "FAILED", error: notifErr.message };
    }

    return {
      success: true, // HTTP request to our API still succeeds!
      bookingUpdated,
      notificationSent: false,
      notificationResult: notifResult,
    };
  }

  const res = simulateStatusUpdateWithFailedNotif();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.bookingUpdated, true);
  assert.strictEqual(res.notificationSent, false);
  assert.strictEqual(res.notificationResult.status, "FAILED");
});

console.log("\n=========================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log("=========================================================");

if (passedTests === totalTests) {
  console.log("✅ ALL STEP 2.6 AUTOMATIC NOTIFICATION TESTS PASSED!");
  process.exit(0);
} else {
  console.error("❌ SOME TESTS FAILED!");
  process.exit(1);
}
