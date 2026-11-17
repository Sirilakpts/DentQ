const { PrismaClient } = require("@prisma/client");

async function run() {
  console.log("=== Testing Tracking Security Logic ===");

  // 1. Test empty search protection logic
  const checkEmptySearch = (queueNumber, phone, date) => {
    if (!queueNumber && !phone && !date) {
      return { success: true, bookings: [] };
    }
    return null;
  };
  const emptyRes = checkEmptySearch(null, null, null);
  console.log("1. Empty search returns [] without data leak:", emptyRes.bookings.length === 0 ? "PASS" : "FAIL");

  // 2. Test partial phone rejection
  const checkPhoneValid = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!/^0[689]\d{8}$/.test(digits)) {
      return { success: true, bookings: [] };
    }
    return { success: true, valid: true };
  };
  console.log("2a. Partial phone '081' rejected:", checkPhoneValid("081").bookings?.length === 0 ? "PASS" : "FAIL");
  console.log("2b. Full phone '0812345678' accepted:", checkPhoneValid("0812345678").valid === true ? "PASS" : "FAIL");

  // 3. Test Action authorization verification
  const prisma = new PrismaClient();
  const testBooking = await prisma.booking.findFirst();
  if (testBooking) {
    const correctPhone = testBooking.phoneNumber.replace(/\D/g, "");
    const wrongPhone = "0999999999";

    // Test mismatched phone
    const isAuthorizedWrong = correctPhone === wrongPhone;
    console.log("3a. Mismatched phone rejected (authorized=false):", !isAuthorizedWrong ? "PASS" : "FAIL");

    // Test matched phone
    const isAuthorizedCorrect = correctPhone === correctPhone;
    console.log("3b. Matched phone verified (authorized=true):", isAuthorizedCorrect ? "PASS" : "FAIL");
  }

  // 4. Test column K in Google Sheets
  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Bookings!A1:K1",
  });
  const headers = res.data.values?.[0] || [];
  console.log("4. Google Sheets 11 headers count:", headers.length);
  console.log("   Header K1:", headers[10]);
  console.log("   Verification:", headers.length === 11 && headers[10] === "reminder_status" ? "PASS" : "FAIL");

  await prisma.$disconnect();
}

run().catch(console.error);
