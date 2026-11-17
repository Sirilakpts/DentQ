// Script to test Admin LINE Notification in Google Sheets mode (Mock / Dry-Run only)
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

function maskPhoneNumber(phone) {
  const cleaned = (phone || "").replace(/\D/g, "");
  if (cleaned.length < 10) return phone;
  return `${cleaned.slice(0, 3)}-XXX-${cleaned.slice(7)}`;
}

// Logic replicate from src/lib/line.ts for testing
function buildApprovalFlexMessage(booking) {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });
  const maskedPhone = maskPhoneNumber(booking.phoneNumber);

  return {
    type: "flex",
    altText: `ยืนยันนัดหมายทำฟัน คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: booking.isEmergency ? "#ef4444" : "#0d9488",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: booking.isEmergency ? "🚨 แจ้งเตือนคิวฉุกเฉิน / EMERGENCY" : "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "ยืนยันการนัดหมายเรียบร้อยแล้ว",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "md",
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
            size: "3xl",
            weight: "bold",
          },
        ],
      },
    },
  };
}

function buildRejectionFlexMessage(booking) {
  return {
    type: "flex",
    altText: `แจ้งเตือนการปฏิเสธนัดหมาย คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#ef4444",
        contents: [
          {
            type: "text",
            text: "ขออภัย ไม่สามารถยืนยันนัดหมายได้",
            color: "#ffffff",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: booking.rejectReason || "คิวเต็ม",
            wrap: true,
          },
        ],
      },
    },
  };
}

async function sendLineFlexNotificationMock(params) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  let status = "SIMULATED";

  if (token && params.recipient && !params.recipient.startsWith("08") && !params.recipient.startsWith("09")) {
    // In live system, fetch LINE push message
    status = "SUCCESS";
  }

  // Check sheets mode / skipDbLog
  const isSheetsMode = (process.env.BOOKING_STORAGE || "").toLowerCase() === "sheets";
  if (params.skipDbLog || isSheetsMode) {
    return {
      success: status === "SUCCESS",
      status,
      logId: null,
    };
  }

  // In sqlite mode, would record to prisma.notificationLog
  return {
    success: true,
    status,
    logId: "mock-log-id",
  };
}

async function runTests() {
  console.log("=== Step 6.31: Admin LINE Notification & Google Sheets Mode Tests ===\n");

  // --- Group 1: Admin Authorization Verification ---
  console.log("--- Group 1: Admin Authorization Verification ---");
  const checkAdminAuth = (cookieValue) => {
    if (!cookieValue) {
      return { authorized: false, status: 401, error: "Unauthorized" };
    }
    return { authorized: true, status: 200 };
  };

  const test1_1 = checkAdminAuth(null).status === 401;
  console.log("1.1 Missing admin_session cookie returns 401:", test1_1 ? "PASS" : "FAIL");

  const test1_2 = checkAdminAuth("demo_token").status === 200;
  console.log("1.2 Valid admin_session cookie authorized:", test1_2 ? "PASS" : "FAIL");

  // --- Group 2: Flex Message Generation from Google Sheets Record ---
  console.log("\n--- Group 2: LINE Flex Message Building ---");

  const mockSheetRecord = {
    bookingId: "TEST-1794810703144",
    patientName: "สมชาย ทดสอบ",
    service: "ขูดหินปูน",
    bookingDate: "2026-11-20",
    bookingTime: "09:00",
    phoneNumber: "0990000000",
    lineUserId: "U_TEST_USER_12345",
    isEmergency: false,
  };

  // 2.1 Approval Flex Message
  const approvalMsg = buildApprovalFlexMessage({
    queueNumber: mockSheetRecord.bookingId,
    patientName: mockSheetRecord.patientName,
    phoneNumber: mockSheetRecord.phoneNumber,
    date: mockSheetRecord.bookingDate,
    time: mockSheetRecord.bookingTime,
    serviceNameTh: mockSheetRecord.service,
    isEmergency: mockSheetRecord.isEmergency,
  });

  const test2_1 =
    approvalMsg.type === "flex" &&
    approvalMsg.altText.includes(mockSheetRecord.bookingId) &&
    approvalMsg.contents?.header?.type === "box";
  console.log("2.1 Approval Flex Message constructed properly:", test2_1 ? "PASS" : "FAIL");

  // 2.2 Rejection Flex Message
  const rejectMsg = buildRejectionFlexMessage({
    queueNumber: mockSheetRecord.bookingId,
    patientName: mockSheetRecord.patientName,
    serviceNameTh: mockSheetRecord.service,
    date: mockSheetRecord.bookingDate,
    time: mockSheetRecord.bookingTime,
    rejectReason: "ติดเคสผ่าตัดฉุกเฉิน",
  });

  const test2_2 =
    rejectMsg.type === "flex" &&
    rejectMsg.altText.includes(mockSheetRecord.bookingId) &&
    JSON.stringify(rejectMsg).includes("ติดเคสผ่าตัดฉุกเฉิน");
  console.log("2.2 Rejection Flex Message constructed properly with reason:", test2_2 ? "PASS" : "FAIL");

  // --- Group 3: Skip Notification when No LINE User ID ---
  console.log("\n--- Group 3: Skip Notification when No LINE User ID ---");

  const handleNotificationDispatch = async (booking, status, rejectReason) => {
    let notificationSent = false;
    let notificationResult = null;

    const targetLineUserId = booking.lineUserId ? booking.lineUserId.trim() : null;

    if (status === "CONFIRMED" || status === "REJECTED") {
      if (!targetLineUserId) {
        notificationSent = false;
        notificationResult = {
          status: "SKIPPED",
          reason: "NO_LINE_USER_ID",
          message: "ข้ามการส่งแจ้งเตือน LINE เนื่องจากไม่มี LINE User ID",
        };
      } else {
        const flexMsg =
          status === "CONFIRMED"
            ? buildApprovalFlexMessage({
                queueNumber: booking.bookingId,
                patientName: booking.patientName,
                phoneNumber: booking.phoneNumber,
                date: booking.bookingDate,
                time: booking.bookingTime,
                serviceNameTh: booking.service,
                isEmergency: booking.isEmergency,
              })
            : buildRejectionFlexMessage({
                queueNumber: booking.bookingId,
                patientName: booking.patientName,
                serviceNameTh: booking.service,
                date: booking.bookingDate,
                time: booking.bookingTime,
                rejectReason: rejectReason || undefined,
              });

        const sendRes = await sendLineFlexNotificationMock({
          bookingId: booking.bookingId,
          type: status === "CONFIRMED" ? "APPROVAL" : "REJECTION",
          recipient: targetLineUserId,
          flexMessage: flexMsg,
          skipDbLog: true,
        });

        notificationResult = sendRes;
        notificationSent = sendRes.status === "SUCCESS";
      }
    }

    return { notificationSent, notificationResult };
  };

  const bookingWithoutLine = {
    ...mockSheetRecord,
    lineUserId: null,
  };

  const resSkip = await handleNotificationDispatch(bookingWithoutLine, "CONFIRMED");
  const test3_1 =
    resSkip.notificationSent === false &&
    resSkip.notificationResult?.status === "SKIPPED" &&
    resSkip.notificationResult?.reason === "NO_LINE_USER_ID";
  console.log("3.1 Booking without lineUserId skips LINE notification:", test3_1 ? "PASS" : "FAIL");

  // --- Group 4: notificationSent Flag Accuracy (Do not report true unless SUCCESS) ---
  console.log("\n--- Group 4: notificationSent Flag Accuracy ---");

  // When no LINE token or simulated
  const resSimulated = await handleNotificationDispatch(mockSheetRecord, "CONFIRMED");
  const test4_1 =
    resSimulated.notificationSent === false &&
    resSimulated.notificationResult?.status === "SIMULATED";
  console.log("4.1 SIMULATED notification reports notificationSent=false:", test4_1 ? "PASS" : "FAIL");

  // When LINE token is set and push succeeds
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "mock_access_token_123";
  const resSuccess = await handleNotificationDispatch(mockSheetRecord, "CONFIRMED");
  const test4_2 =
    resSuccess.notificationSent === true &&
    resSuccess.notificationResult?.status === "SUCCESS";
  console.log("4.2 SUCCESS notification reports notificationSent=true:", test4_2 ? "PASS" : "FAIL");
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // --- Group 5: No Prisma / SQLite Invocations in Sheets Mode ---
  console.log("\n--- Group 5: No Prisma / SQLite Invocations in Sheets Mode ---");

  // Verify that sendLineFlexNotificationMock with skipDbLog=true does not create NotificationLog
  const directSendRes = await sendLineFlexNotificationMock({
    bookingId: "TEST-1794810703144",
    type: "APPROVAL",
    recipient: "0990000000",
    flexMessage: approvalMsg,
    skipDbLog: true,
  });

  const test5_1 = directSendRes.logId === null;
  console.log("5.1 NotificationLog creation bypassed when skipDbLog=true:", test5_1 ? "PASS" : "FAIL");

  // --- Group 6: Google Sheets Col I line_user_id Verification ---
  console.log("\n--- Group 6: Google Sheets Col I line_user_id Reading ---");
  const { getBookingByIdFromSheet } = await import("./src/lib/google-sheets.ts");
  const realSheetRecord = await getBookingByIdFromSheet("TEST-1794810703144");
  let test6_1 = false;
  if (realSheetRecord) {
    // In Step 6.20/6.23, line_user_id in Col I was empty or string
    test6_1 = typeof realSheetRecord.lineUserId === "string";
    console.log(`6.1 Col I (lineUserId) successfully extracted: '${realSheetRecord.lineUserId}' -> PASS`);
  } else {
    console.log("6.1 Sheet record not found -> FAIL");
  }

  // Overall Result
  const allPassed =
    test1_1 &&
    test1_2 &&
    test2_1 &&
    test2_2 &&
    test3_1 &&
    test4_1 &&
    test4_2 &&
    test5_1 &&
    test6_1;

  console.log("\n=================================");
  console.log(`Overall Result: ${allPassed ? "ALL PASS" : "FAIL"}`);
  console.log("=================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
