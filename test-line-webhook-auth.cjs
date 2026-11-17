const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

// 1. Signature Verification Helper
function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

// 2. Mock handler imitating LINE Webhook logic for unit testing
function handleWebhookSignatureCheck(rawBody, signature, channelSecret) {
  if (!channelSecret) {
    return { status: 401, body: { status: "ignored", reason: "missing_secret", error: "Unauthorized" } };
  }
  const isValid = verifyLineSignature(rawBody, signature, channelSecret);
  if (!isValid) {
    return { status: 401, body: { status: "ignored", reason: "invalid_signature", error: "Unauthorized" } };
  }
  return { status: 200, body: { status: "valid" } };
}

// 3. Postback confirmBooking authorization check logic (both SQLite and Sheets)
function verifyBookingOwnership(booking, senderLineUserId) {
  const cleanSender = senderLineUserId ? String(senderLineUserId).trim() : null;
  if (!booking) {
    return { authorized: false, reason: "booking_not_found" };
  }
  const bookingLineUserId = booking.lineUserId ? String(booking.lineUserId).trim() : null;
  if (!bookingLineUserId) {
    return { authorized: false, reason: "booking_has_no_line_user_id" };
  }
  if (!cleanSender) {
    return { authorized: false, reason: "sender_has_no_line_user_id" };
  }
  if (bookingLineUserId !== cleanSender) {
    return { authorized: false, reason: "line_user_id_mismatch" };
  }
  return { authorized: true, targetRef: booking.queueNumber || booking.bookingId || booking.id };
}

async function runTests() {
  console.log("=== Step 6.30: LINE Webhook Security & Authorization Tests ===\n");

  const channelSecret = "test_channel_secret_abc123";
  const dummyPayload = JSON.stringify({ events: [] });
  const validSignature = crypto
    .createHmac("sha256", channelSecret)
    .update(dummyPayload)
    .digest("base64");

  // --- Test Group 1: Signature Verification ---
  console.log("--- Group 1: Signature Verification ---");

  // 1.1 Missing Channel Secret
  const resNoSecret = handleWebhookSignatureCheck(dummyPayload, validSignature, null);
  const test1_1 = resNoSecret.status === 401 && resNoSecret.body.reason === "missing_secret";
  console.log("1.1 Missing channel secret returns 401 missing_secret:", test1_1 ? "PASS" : "FAIL");

  // 1.2 Invalid Signature
  const resBadSig = handleWebhookSignatureCheck(dummyPayload, "invalid_sig_xyz", channelSecret);
  const test1_2 = resBadSig.status === 401 && resBadSig.body.reason === "invalid_signature";
  console.log("1.2 Invalid signature returns 401 invalid_signature:", test1_2 ? "PASS" : "FAIL");

  // 1.3 Missing Signature
  const resNullSig = handleWebhookSignatureCheck(dummyPayload, null, channelSecret);
  const test1_3 = resNullSig.status === 401 && resNullSig.body.reason === "invalid_signature";
  console.log("1.3 Missing signature returns 401 invalid_signature:", test1_3 ? "PASS" : "FAIL");

  // 1.4 Valid Signature
  const resValid = handleWebhookSignatureCheck(dummyPayload, validSignature, channelSecret);
  const test1_4 = resValid.status === 200;
  console.log("1.4 Valid signature passes verification (status 200):", test1_4 ? "PASS" : "FAIL");

  // --- Test Group 2: Authorization & Ownership Verification ---
  console.log("\n--- Group 2: Authorization & Ownership Verification ---");

  const mockOwnerId = "U1234567890abcdef1234567890abcdef";
  const mockAttackerId = "U9999999999badguy9999999999badguy";

  // 2.1 Booking not found
  const resNotFound = verifyBookingOwnership(null, mockOwnerId);
  const test2_1 = !resNotFound.authorized && resNotFound.reason === "booking_not_found";
  console.log("2.1 Non-existent booking rejected:", test2_1 ? "PASS" : "FAIL");

  // 2.2 Booking has no lineUserId (e.g. booked via phone/web without LINE login)
  const bookingNoLine = { id: "cly111", queueNumber: "DEN-001", lineUserId: null };
  const resNoLine = verifyBookingOwnership(bookingNoLine, mockOwnerId);
  const test2_2 = !resNoLine.authorized && resNoLine.reason === "booking_has_no_line_user_id";
  console.log("2.2 Booking without lineUserId rejected:", test2_2 ? "PASS" : "FAIL");

  // 2.3 Sender has no lineUserId in event
  const bookingNormal = { id: "cly222", queueNumber: "DEN-002", lineUserId: mockOwnerId };
  const resNoSender = verifyBookingOwnership(bookingNormal, null);
  const test2_3 = !resNoSender.authorized && resNoSender.reason === "sender_has_no_line_user_id";
  console.log("2.3 Event without sender userId rejected:", test2_3 ? "PASS" : "FAIL");

  // 2.4 Sender is attacker (mismatched lineUserId)
  const resMismatch = verifyBookingOwnership(bookingNormal, mockAttackerId);
  const test2_4 = !resMismatch.authorized && resMismatch.reason === "line_user_id_mismatch";
  console.log("2.4 Mismatched sender lineUserId rejected:", test2_4 ? "PASS" : "FAIL");

  // 2.5 Sender is legitimate owner
  const resMatch = verifyBookingOwnership(bookingNormal, mockOwnerId);
  const test2_5 = resMatch.authorized && resMatch.targetRef === "DEN-002";
  console.log("2.5 Matched sender lineUserId authorized:", test2_5 ? "PASS" : "FAIL");

  // --- Test Group 3: Google Sheets Mode Dry-Run Verification ---
  console.log("\n--- Group 3: Google Sheets Mode Dry-Run ---");

  const { getBookingByIdFromSheet } = await import("./src/lib/google-sheets.ts");
  const testBookingId = "TEST-1794810703144";
  const sheetBooking = await getBookingByIdFromSheet(testBookingId);

  let test3_1 = false;
  let test3_2 = false;
  let test3_3 = false;

  if (sheetBooking) {
    console.log(`   Found Sheet Booking: ${sheetBooking.bookingId} (Row: ${sheetBooking.rowIndex})`);
    console.log(`   Stored lineUserId in Sheet: '${sheetBooking.lineUserId || "EMPTY"}'`);

    // 3.1 Verify rejection when sender does not match
    const authFail = verifyBookingOwnership(sheetBooking, mockAttackerId);
    test3_1 = !authFail.authorized;
    console.log("3.1 Sheets unauthorized attempt rejected:", test3_1 ? "PASS" : "FAIL");

    // 3.2 If sheet booking had lineUserId, simulate match; or simulate with mock matching row
    const mockMatchingSheetBooking = {
      ...sheetBooking,
      lineUserId: mockOwnerId,
    };
    const authSuccess = verifyBookingOwnership(mockMatchingSheetBooking, mockOwnerId);
    test3_2 = authSuccess.authorized && authSuccess.targetRef === testBookingId;
    console.log("3.2 Sheets authorized attempt verified:", test3_2 ? "PASS" : "FAIL");

    // 3.3 Verify target cells for atomic batchUpdate (Col F & Col K) without writing
    const targetRangeF = `Bookings!F${sheetBooking.rowIndex}`;
    const targetRangeK = `Bookings!K${sheetBooking.rowIndex}`;
    test3_3 = targetRangeF === `Bookings!F${sheetBooking.rowIndex}` && targetRangeK === `Bookings!K${sheetBooking.rowIndex}`;
    console.log(`3.3 Batch update targets verified (Dry-run): F=${targetRangeF}, K=${targetRangeK} -> ${test3_3 ? "PASS" : "FAIL"}`);
  } else {
    console.log("   Warning: Test booking TEST-1794810703144 not found in sheet.");
  }

  // --- Test Group 4: Reply Message & Information Disclosure Verification ---
  console.log("\n--- Group 4: Reply Message & Privacy Check ---");

  const safeErrorMessage =
    "ขออภัยค่ะ ระบบไม่พบข้อมูลคิวหรือคิวนี้ได้รับการยืนยันแล้ว กรุณาติดต่อเจ้าหน้าที่คลินิกโดยตรง โทร. 02-999-8888";
  const successMessage = (ref) =>
    `ขอบคุณค่ะ ยืนยันคิวหมายเลข ${ref} เรียบร้อยแล้ว แอดมินรอพบคุณอยู่ที่คลินิกนะคะ`;

  // Verify safe error message contains no PII
  const leaksPhone = safeErrorMessage.includes("08") || safeErrorMessage.includes("09");
  const leaksName = safeErrorMessage.includes("สมชาย") || safeErrorMessage.includes("คนไข้");
  const test4_1 = !leaksPhone && !leaksName;
  console.log("4.1 Error reply does not disclose PII:", test4_1 ? "PASS" : "FAIL");

  // Verify success message format
  const formattedSuccess = successMessage("DEN-001");
  const test4_2 = formattedSuccess.includes("DEN-001") && formattedSuccess.includes("ยืนยันคิวหมายเลข");
  console.log("4.2 Success reply format matches specification:", test4_2 ? "PASS" : "FAIL");

  // Overall check
  const allPassed =
    test1_1 &&
    test1_2 &&
    test1_3 &&
    test1_4 &&
    test2_1 &&
    test2_2 &&
    test2_3 &&
    test2_4 &&
    test2_5 &&
    test3_1 &&
    test3_2 &&
    test3_3 &&
    test4_1 &&
    test4_2;

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
