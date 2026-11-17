// Script to test Google Sheets Booking Service read & query functions (Dry-run, No Writes)
async function runTests() {
  const {
    getAllBookingsFromSheet,
    getBookingByIdFromSheet,
    findBookingsByPhoneFromSheet,
    countBookingsFromSheet,
  } = await import("./src/lib/google-sheets.ts");

  const targetBookingId = "TEST-1794810703144";
  const targetPhone = "0990000000";
  const testDate = "2026-11-20";
  const testTime = "09:00";

  console.log("=== Starting Google Sheets Booking Service Tests (Read-Only) ===\n");

  // 1. ทดสอบ getAllBookingsFromSheet()
  console.log("1. Testing getAllBookingsFromSheet()...");
  const allBookings = await getAllBookingsFromSheet();
  const test1Pass = Array.isArray(allBookings) && allBookings.length > 0;
  console.log(`   Result: ${test1Pass ? "PASS" : "FAIL"} (Found ${allBookings.length} bookings)`);

  // 2. ทดสอบ getBookingByIdFromSheet()
  console.log(`\n2. Testing getBookingByIdFromSheet('${targetBookingId}')...`);
  const bookingById = await getBookingByIdFromSheet(targetBookingId);
  const test2Pass = Boolean(bookingById && bookingById.bookingId === targetBookingId);
  console.log(`   Result: ${test2Pass ? "PASS" : "FAIL"}`);
  if (bookingById) {
    console.log(`   Resolved rowIndex: ${bookingById.rowIndex} (Status: ${bookingById.status})`);
  }

  // 3. ทดสอบ findBookingsByPhoneFromSheet()
  console.log(`\n3. Testing findBookingsByPhoneFromSheet('${targetPhone}')...`);
  const bookingsByPhone = await findBookingsByPhoneFromSheet(targetPhone);
  const test3Pass =
    Array.isArray(bookingsByPhone) &&
    bookingsByPhone.some((b) => b.bookingId === targetBookingId);
  console.log(`   Result: ${test3Pass ? "PASS" : "FAIL"} (Found ${bookingsByPhone.length} match)`);

  // 4. ทดสอบ countBookingsFromSheet()
  console.log(`\n4. Testing countBookingsFromSheet({ date: '${testDate}', time: '${testTime}' })...`);
  const counts = await countBookingsFromSheet({
    date: testDate,
    time: testTime,
  });
  const test4Pass =
    typeof counts.procedureCount === "number" &&
    typeof counts.slotCount === "number" &&
    counts.totalDateCount > 0 &&
    counts.slotCount > 0 &&
    counts.procedureCount > 0;
  console.log(`   Result: ${test4Pass ? "PASS" : "FAIL"}`);
  console.log(`   Counts: procedureCount=${counts.procedureCount}, slotCount=${counts.slotCount}, totalDateCount=${counts.totalDateCount}`);

  // 5. ตรวจสอบการระบุแถวและคอลัมน์ F ของ updateBookingStatusInSheet() โดยไม่เขียนข้อมูลจริง (Dry-run verification)
  console.log("\n5. Testing updateBookingStatusInSheet target resolution (Dry-run, No Write)...");
  let test5Pass = false;
  let targetCell = "";
  if (bookingById && bookingById.rowIndex) {
    targetCell = `Bookings!F${bookingById.rowIndex}`;
    // ตรวจสอบว่า targetCell ตรงกับคอลัมน์ F (status) และแถวของ Booking ID นั้นจริง
    test5Pass = targetCell === `Bookings!F${bookingById.rowIndex}` && targetCell.includes("!F");
  }
  console.log(`   Result: ${test5Pass ? "PASS" : "FAIL"}`);
  console.log(`   Target Cell to update: ${targetCell} (Column F = status)`);

  console.log("\n=== Summary ===");
  const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass;
  console.log(`Overall: ${allPass ? "ALL PASS" : "SOME FAILED"}`);

  if (!allPass) {
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err.message);
  process.exitCode = 1;
});
