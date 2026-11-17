const { google } = require("googleapis");

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 1. อ่านหัวตารางปัจจุบัน
  console.log("Reading current headers Bookings!A1:J1...");
  const initialRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Bookings!A1:J1",
  });

  const currentHeaders = initialRes.data.values?.[0] || [];
  console.log("Current headers count:", currentHeaders.length);
  console.log("Current headers:", currentHeaders.join(", "));

  // 2. คง A-G เดิม และอัปเดตเฉพาะ H1:J1
  console.log("Updating headers H1:J1...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Bookings!H1:J1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["phone_number", "line_user_id", "is_emergency"]],
    },
  });

  // 3. อ่านหัวตารางซ้ำเพื่อยืนยันว่าครบ 10 คอลัมน์
  const finalRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Bookings!A1:J1",
  });

  const finalHeaders = finalRes.data.values?.[0] || [];
  console.log("\n--- Final Verification ---");
  console.log("Columns count:", finalHeaders.length);
  console.log("Columns:", finalHeaders.join(", "));

  if (finalHeaders.length === 10) {
    console.log("PASS: Successfully updated and verified 10 columns (A-J)");
  } else {
    console.error("FAIL: Columns count is not 10");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
});
