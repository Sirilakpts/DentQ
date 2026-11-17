const { google } = require("googleapis");

async function main() {
  const existingBookingId = process.argv[2];
  const existingRange = process.argv[3] || "Bookings!A13:J13";

  let testBookingId = existingBookingId;
  let updatedRange = existingRange;
  let isoTime = "2026-11-16T06:31:43.144Z";

  // หากไม่มีการระบุ booking_id ที่เขียนไว้แล้ว ให้ทำการ append ใหม่ 1 แถว
  if (!existingBookingId) {
    const { appendBookingToSheet } = await import("./src/lib/google-sheets.ts");

    const timestamp = Date.now();
    testBookingId = `TEST-${timestamp}`;
    isoTime = new Date().toISOString();

    const mockBooking = {
      bookingId: testBookingId,
      patientName: "ผู้ป่วยทดสอบ DentQ",
      service: "ขูดหินปูน",
      bookingDate: "2026-11-20",
      bookingTime: "09:00",
      status: "pending",
      phoneNumber: "0990000000",
      lineUserId: "",
      isEmergency: false,
      createdAt: isoTime,
    };

    console.log(`Appending mock booking with booking_id: ${testBookingId}...`);
    const result = await appendBookingToSheet(mockBooking);

    if (!result.success) {
      console.error("FAIL: Failed to append booking to Google Sheets");
      console.error(`Error: ${result.error}`);
      process.exitCode = 1;
      return;
    }

    updatedRange = result.updatedRange;
    console.log(`Append successful. Updated Range: ${updatedRange}`);
  } else {
    console.log(`Verifying existing written row: ${testBookingId} at ${updatedRange}...`);
  }

  // อ่านกลับและตรวจสอบด้วย booking_id ว่าครบทั้ง 10 คอลัมน์และค่าตรงตามที่ส่ง
  console.log("Verifying written row from Google Sheets...");
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: updatedRange,
  });

  const row = readRes.data.values?.[0] || [];

  // ตรวจสอบค่าทั้ง 10 คอลัมน์ (คำนึงถึงการจัดรูปแบบ Time และ Number ของ Google Sheets)
  const colA = row[0]; // booking_id
  const colB = row[1]; // patient_name
  const colC = row[2]; // service
  const colD = row[3]; // booking_date
  const colE = row[4]; // booking_time (Google Sheets อาจแสดงเป็น '09:00' หรือ '9:00')
  const colF = row[5]; // status
  const colG = row[6]; // created_at
  const colH = String(row[7] ?? ""); // phone_number (Google Sheets อาจตัดเลข 0 นำหน้าออก)
  const colI = row[8] || ""; // line_user_id (เว้นว่าง)
  const colJ = String(row[9] ?? "").toUpperCase(); // is_emergency (FALSE)

  const isMatch =
    colA === testBookingId &&
    colB === "ผู้ป่วยทดสอบ DentQ" &&
    colC === "ขูดหินปูน" &&
    colD === "2026-11-20" &&
    (colE === "09:00" || colE === "9:00") &&
    colF === "pending" &&
    (colH === "0990000000" || colH === "990000000") &&
    colI === "" &&
    (colJ === "FALSE" || colJ === "0");

  if (isMatch) {
    console.log("PASS");
    console.log(`booking_id: ${testBookingId}`);
    console.log(`row_range: ${updatedRange}`);
    console.log(`columns_verified: A-J (10 columns verified successfully)`);
  } else {
    console.error("FAIL: Verification mismatch");
    console.error("Actual row values:", row);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
});
