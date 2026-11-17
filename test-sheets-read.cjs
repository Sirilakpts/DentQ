const { google } = require("googleapis");

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly"
    ]
  });

  const sheets = google.sheets({
    version: "v4",
    auth
  });

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: "Bookings!A1:G1"
  });

  console.log("PASS: Google Sheets connected");
  console.log("Columns:", result.data.values?.[0]?.join(", "));
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exitCode = 1;
});
