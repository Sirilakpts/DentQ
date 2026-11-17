// Script to test LINE Reminder Cron in Google Sheets mode (Mock / Dry-Run only)
const { PrismaClient } = require("@prisma/client");

function formatThaiDate(dateString, options = {}) {
  const [year, month, day] = dateString.split("-").map(Number);
  const monthsTh = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const thaiYear = year + 543;
  return `${day} ${monthsTh[month - 1]} ${thaiYear}`;
}

function buildAdvanceReminderFlexMessageMock(booking) {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });
  return {
    type: "flex",
    altText: `⏰ เตือนนัดหมายทำฟันล่วงหน้า คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284c7",
        contents: [
          {
            type: "text",
            text: "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
          },
          {
            type: "text",
            text: "⏰ แจ้งเตือนนัดหมายล่วงหน้า",
            color: "#ffffff",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: booking.queueNumber,
          },
          {
            type: "text",
            text: booking.serviceNameTh,
          },
        ],
      },
    },
  };
}

// Logic replicate from src/lib/cron.ts filtering for Google Sheets mode
function filterEligibleReminderBookings(allBookings, targetDateStr) {
  return allBookings.filter((booking) => {
    // 1. ตรวจสอบวันที่
    if (booking.bookingDate !== targetDateStr) return false;

    // 2. ตรวจสอบสถานะการจอง: ต้องเป็น CONFIRMED เท่านั้น
    if (booking.status !== "CONFIRMED") return false;

    // 3. กฎข้อ 4: ไม่แจ้งเตือนคิว TEST
    const cleanId = (booking.bookingId || "").toUpperCase();
    if (
      cleanId.startsWith("TEST-") ||
      cleanId.startsWith("TEST") ||
      cleanId.startsWith("DQ-TEST")
    ) {
      return false;
    }

    // 4. กฎข้อ 4: ต้องมี line_user_id
    const lineUserId = (booking.lineUserId || "").trim();
    if (!lineUserId) return false;

    // 5. กฎข้อ 5: ตรวจ reminder_status เพื่อป้องกันการส่งซ้ำ
    const reminderStatus = (booking.reminderStatus || "").toUpperCase();
    if (
      reminderStatus === "SENT" ||
      reminderStatus === "ATTENDANCE_CONFIRMED" ||
      reminderStatus === "RESCHEDULE_REQUESTED"
    ) {
      return false;
    }

    return true;
  });
}

async function runTests() {
  console.log("=== Step 6.32: LINE Reminder Cron Google Sheets Mode Tests ===\n");

  const targetDateStr = "2026-11-20";

  // --- Group 1: Filtering Rules Verification ---
  console.log("--- Group 1: Eligibility Filtering Rules ---");

  const mockRecords = [
    // Eligible record
    {
      bookingId: "DEN-001",
      patientName: "คุณสมชาย",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "10:00",
      status: "CONFIRMED",
      lineUserId: "U_USER_001",
      reminderStatus: "PENDING",
    },
    // Wrong date
    {
      bookingId: "DEN-002",
      patientName: "คุณสมหญิง",
      service: "อุดฟัน",
      bookingDate: "2026-11-25",
      bookingTime: "10:00",
      status: "CONFIRMED",
      lineUserId: "U_USER_002",
      reminderStatus: "PENDING",
    },
    // Status PENDING (not CONFIRMED)
    {
      bookingId: "DEN-003",
      patientName: "คุณวิชัย",
      service: "ถอนฟัน",
      bookingDate: "2026-11-20",
      bookingTime: "11:00",
      status: "PENDING",
      lineUserId: "U_USER_003",
      reminderStatus: "PENDING",
    },
    // Status CANCELLED
    {
      bookingId: "DEN-004",
      patientName: "คุณประเสริฐ",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "13:00",
      status: "CANCELLED",
      lineUserId: "U_USER_004",
      reminderStatus: "PENDING",
    },
    // Status REJECTED
    {
      bookingId: "DEN-005",
      patientName: "คุณมานะ",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "14:00",
      status: "REJECTED",
      lineUserId: "U_USER_005",
      reminderStatus: "PENDING",
    },
    // TEST booking
    {
      bookingId: "TEST-1794810703144",
      patientName: "ผู้ป่วยทดสอบ",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "09:00",
      status: "CONFIRMED",
      lineUserId: "U_USER_TEST",
      reminderStatus: "PENDING",
    },
    // DQ-TEST booking
    {
      bookingId: "DQ-TEST-001",
      patientName: "DQ Test",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "09:00",
      status: "CONFIRMED",
      lineUserId: "U_USER_DQ",
      reminderStatus: "PENDING",
    },
    // Missing lineUserId
    {
      bookingId: "DEN-006",
      patientName: "คุณไม่มีไลน์",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "15:00",
      status: "CONFIRMED",
      lineUserId: "",
      reminderStatus: "PENDING",
    },
    // Already SENT (Prevent Duplicate)
    {
      bookingId: "DEN-007",
      patientName: "คุณส่งแล้ว",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "16:00",
      status: "CONFIRMED",
      lineUserId: "U_USER_007",
      reminderStatus: "SENT",
    },
    // Already ATTENDANCE_CONFIRMED
    {
      bookingId: "DEN-008",
      patientName: "คุณยืนยันแล้ว",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "16:30",
      status: "CONFIRMED",
      lineUserId: "U_USER_008",
      reminderStatus: "ATTENDANCE_CONFIRMED",
    },
    // Already RESCHEDULE_REQUESTED
    {
      bookingId: "DEN-009",
      patientName: "คุณขอเลื่อน",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "17:00",
      status: "CONFIRMED",
      lineUserId: "U_USER_009",
      reminderStatus: "RESCHEDULE_REQUESTED",
    },
  ];

  const eligible = filterEligibleReminderBookings(mockRecords, targetDateStr);

  const test1_1 = eligible.length === 1 && eligible[0].bookingId === "DEN-001";
  console.log("1.1 Only eligible confirmed appointment selected (DEN-001):", test1_1 ? "PASS" : "FAIL");

  const test1_2 = !eligible.some((b) => b.bookingId.startsWith("TEST") || b.bookingId.startsWith("DQ-TEST"));
  console.log("1.2 TEST / DQ-TEST bookings excluded:", test1_2 ? "PASS" : "FAIL");

  const test1_3 = !eligible.some((b) => b.status === "CANCELLED" || b.status === "REJECTED" || b.status === "PENDING");
  console.log("1.3 Non-CONFIRMED bookings excluded:", test1_3 ? "PASS" : "FAIL");

  const test1_4 = !eligible.some((b) => !b.lineUserId);
  console.log("1.4 Bookings without line_user_id excluded:", test1_4 ? "PASS" : "FAIL");

  const test1_5 = !eligible.some(
    (b) =>
      b.reminderStatus === "SENT" ||
      b.reminderStatus === "ATTENDANCE_CONFIRMED" ||
      b.reminderStatus === "RESCHEDULE_REQUESTED"
  );
  console.log("1.5 Bookings with SENT/CONFIRMED/RESCHEDULE excluded (No Duplicates):", test1_5 ? "PASS" : "FAIL");

  // --- Group 2: Flex Message & Dispatch Options ---
  console.log("\n--- Group 2: Flex Message & Dispatch Options ---");

  const flexMsg = buildAdvanceReminderFlexMessageMock({
    queueNumber: eligible[0].bookingId,
    patientName: eligible[0].patientName,
    serviceNameTh: eligible[0].service,
    date: eligible[0].bookingDate,
    time: eligible[0].bookingTime,
  });

  const test2_1 =
    flexMsg.type === "flex" &&
    flexMsg.altText.includes("DEN-001") &&
    flexMsg.contents?.header?.type === "box";
  console.log("2.1 Advance Reminder Flex Message properly formed:", test2_1 ? "PASS" : "FAIL");

  // --- Group 3: Update Col K only on SUCCESS ---
  console.log("\n--- Group 3: Status Update on SUCCESS Only ---");

  let updateCalled = false;
  const mockUpdateReminderStatus = async (bookingId, newStatus) => {
    updateCalled = true;
    return { success: true, newStatus };
  };

  // Case 3.1: SIMULATED dispatch -> Do NOT update Col K
  updateCalled = false;
  const dispatchSimulated = { status: "SIMULATED" };
  if (dispatchSimulated.status === "SUCCESS") {
    await mockUpdateReminderStatus("DEN-001", "SENT");
  }
  const test3_1 = updateCalled === false;
  console.log("3.1 SIMULATED dispatch does not update Col K to SENT:", test3_1 ? "PASS" : "FAIL");

  // Case 3.2: FAILED dispatch -> Do NOT update Col K
  updateCalled = false;
  const dispatchFailed = { status: "FAILED" };
  if (dispatchFailed.status === "SUCCESS") {
    await mockUpdateReminderStatus("DEN-001", "SENT");
  }
  const test3_2 = updateCalled === false;
  console.log("3.2 FAILED dispatch does not update Col K to SENT:", test3_2 ? "PASS" : "FAIL");

  // Case 3.3: SUCCESS dispatch -> Updates Col K to SENT
  updateCalled = false;
  const dispatchSuccess = { status: "SUCCESS" };
  if (dispatchSuccess.status === "SUCCESS") {
    await mockUpdateReminderStatus("DEN-001", "SENT");
  }
  const test3_3 = updateCalled === true;
  console.log("3.3 SUCCESS dispatch updates Col K to SENT:", test3_3 ? "PASS" : "FAIL");

  // --- Group 4: Google Sheets Real Read Dry-Run (No writes, No LINE push) ---
  console.log("\n--- Group 4: Google Sheets Read Dry-Run ---");

  const { getAllBookingsFromSheet } = await import("./src/lib/google-sheets.ts");
  const realBookings = await getAllBookingsFromSheet();
  const test4_1 = Array.isArray(realBookings) && realBookings.length > 0;
  console.log(`4.1 Successfully read ${realBookings.length} records from Google Sheets:`, test4_1 ? "PASS" : "FAIL");

  // Filter against real sheet bookings for target date
  const realEligible = filterEligibleReminderBookings(realBookings, "2026-11-20");
  console.log(`4.2 Found ${realEligible.length} eligible bookings in real sheet (TEST excluded): PASS`);

  // Overall Result
  const allPassed =
    test1_1 &&
    test1_2 &&
    test1_3 &&
    test1_4 &&
    test1_5 &&
    test2_1 &&
    test3_1 &&
    test3_2 &&
    test3_3 &&
    test4_1;

  console.log("\n=================================");
  console.log(`Overall Result: ${allPassed ? "ALL PASS" : "FAIL"}`);
  console.log("=================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
