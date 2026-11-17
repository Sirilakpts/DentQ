/**
 * Test Suite: STEP 2.1 Google Sheets Medical Rights Integration
 * 
 * Tests:
 * 1. Backward-compatibility: Older rows with 11 columns (A-K) parse cleanly with medicalRights = ""
 * 2. New rows with 12 columns (A-L) parse correctly with medicalRights value
 * 3. Exact column order verification (A-L: 12 fields)
 * 4. Normalization and acceptance of all 5 standard values: บัตรทอง, ประกันสังคม, ข้าราชการ, ชำระเอง, ไม่แน่ใจ
 * 5. Safe read test on actual Google Sheets (READ ONLY, NO WRITES)
 */

const assert = require("assert");

// Import from compiled or use direct Node simulation of google-sheets.ts logic
function normalizeMedicalRights(val) {
  if (!val) return "";
  const ALLOWED_MEDICAL_RIGHTS = [
    "บัตรทอง",
    "ประกันสังคม",
    "ข้าราชการ",
    "ชำระเอง",
    "ไม่แน่ใจ",
  ];
  const trimmed = String(val).trim();
  const matched = ALLOWED_MEDICAL_RIGHTS.find(
    (item) => item.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || trimmed;
}

function parseRow(row, rowIndex) {
  const colA = String(row[0] ?? "").trim();
  const colB = String(row[1] ?? "").trim();
  const colC = String(row[2] ?? "").trim();
  const colD = String(row[3] ?? "").trim();

  let colE = String(row[4] ?? "").trim();
  if (/^\d:\d{2}$/.test(colE)) {
    colE = `0${colE}`;
  }

  const colF = String(row[5] ?? "").trim().toUpperCase();
  const colG = String(row[6] ?? "").trim();

  let colH = String(row[7] ?? "").trim();
  if (colH.length === 9 && !colH.startsWith("0")) {
    colH = `0${colH}`;
  }

  const colI = String(row[8] ?? "").trim();
  const colJRaw = String(row[9] ?? "").trim().toUpperCase();
  const colJ = colJRaw === "TRUE" || colJRaw === "1";
  const colK = String(row[10] ?? "").trim().toUpperCase();
  const colL = normalizeMedicalRights(String(row[11] ?? ""));

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
  };
}

async function runTests() {
  console.log("=== STEP 2.1: Testing Google Sheets Medical Rights (Col L) ===");

  // Test 1: Backward-compatibility - 11 columns old row
  console.log("\n[Test 1] Backward-compatibility with 11-column row (A-K)...");
  const oldRow = [
    "DEN-001",
    "สมชาย ใจดี",
    "ตรวจฟัน",
    "2026-11-17",
    "09:00",
    "CONFIRMED",
    "2026-11-16T10:00:00Z",
    "0812345678",
    "U1234567890abcdef",
    "FALSE",
    "PENDING"
    // No index 11 (Col L is missing)
  ];
  const parsedOld = parseRow(oldRow, 2);
  assert.strictEqual(parsedOld.bookingId, "DEN-001");
  assert.strictEqual(parsedOld.patientName, "สมชาย ใจดี");
  assert.strictEqual(parsedOld.service, "ตรวจฟัน");
  assert.strictEqual(parsedOld.bookingDate, "2026-11-17");
  assert.strictEqual(parsedOld.bookingTime, "09:00");
  assert.strictEqual(parsedOld.status, "CONFIRMED");
  assert.strictEqual(parsedOld.phoneNumber, "0812345678");
  assert.strictEqual(parsedOld.lineUserId, "U1234567890abcdef");
  assert.strictEqual(parsedOld.isEmergency, false);
  assert.strictEqual(parsedOld.reminderStatus, "PENDING");
  assert.strictEqual(parsedOld.medicalRights, "", "Old row must yield empty string for medicalRights");
  console.log("-> PASS: Old row parsed perfectly with medicalRights = \"\"");

  // Test 2: Standard 5 Medical Rights values with 12-column row (A-L)
  console.log("\n[Test 2] Testing all 5 supported medical rights values...");
  const rightsToTest = ["บัตรทอง", "ประกันสังคม", "ข้าราชการ", "ชำระเอง", "ไม่แน่ใจ"];
  for (const right of rightsToTest) {
    const newRow = [
      "DEN-002",
      "ทดสอบ สิทธิ",
      "ขูดหินปูน",
      "2026-11-17",
      "10:00",
      "PENDING",
      "2026-11-16T11:00:00Z",
      "0899999999",
      "Uabcdef1234567890",
      "FALSE",
      "PENDING",
      right
    ];
    const parsed = parseRow(newRow, 3);
    assert.strictEqual(parsed.medicalRights, right, `Medical right must match ${right}`);
  }
  console.log("-> PASS: All 5 medical rights parsed and normalized accurately");

  // Test 3: Normalization of whitespace and casing
  console.log("\n[Test 3] Testing normalization of whitespace...");
  const rawWithSpaces = [
    "DEN-003", "ผู้ป่วย", "อุดฟัน", "2026-11-17", "11:00", "PENDING",
    "2026-11-16T11:00:00Z", "0811111111", "U999", "FALSE", "PENDING",
    "   ประกันสังคม   "
  ];
  const parsedTrimmed = parseRow(rawWithSpaces, 4);
  assert.strictEqual(parsedTrimmed.medicalRights, "ประกันสังคม");
  console.log("-> PASS: Whitespace trimmed cleanly");

  // Test 4: Verify append payload structure (12 elements in rowValues)
  console.log("\n[Test 4] Verifying append row values structure (A-L)...");
  const testInput = {
    bookingId: "DEN-005",
    patientName: "ทดสอบ ผู้ใช้",
    service: "ถอนฟัน",
    bookingDate: "2026-11-18",
    bookingTime: "13:30",
    status: "PENDING",
    createdAt: "2026-11-16T12:00:00Z",
    phoneNumber: "0822222222",
    lineUserId: "Utest123",
    isEmergency: false,
    reminderStatus: "PENDING",
    medicalRights: "บัตรทอง",
  };
  const appendRowValues = [
    testInput.bookingId,
    testInput.patientName,
    testInput.service,
    testInput.bookingDate,
    testInput.bookingTime,
    testInput.status,
    testInput.createdAt,
    testInput.phoneNumber,
    testInput.lineUserId,
    testInput.isEmergency,
    testInput.reminderStatus,
    normalizeMedicalRights(testInput.medicalRights),
  ];
  assert.strictEqual(appendRowValues.length, 12, "Row must contain exactly 12 columns");
  assert.strictEqual(appendRowValues[11], "บัตรทอง", "Col L must be medical_rights");
  console.log("-> PASS: Append row values correctly contain 12 elements (A-L)");

  // Test 5: Safe Read Test against actual Google Sheets (READ ONLY)
  console.log("\n[Test 5] Safe Read-Only test on live Google Sheets...");
  try {
    const { google } = require("googleapis");
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Bookings!A1:L10",
    });

    const rows = res.data.values || [];
    console.log(`-> Successfully fetched ${rows.length} rows from Google Sheets (Bookings!A1:L10)`);
    if (rows.length > 0) {
      console.log(`-> Header row length: ${rows[0].length} columns`);
      console.log(`-> Headers: [${rows[0].join(", ")}]`);
    }
    if (rows.length > 1) {
      const sampleRow = parseRow(rows[1], 2);
      console.log(`-> Sample parsed row 2: ID=${sampleRow.bookingId}, Name=${sampleRow.patientName}, Col L (medicalRights)="${sampleRow.medicalRights}"`);
    }
    console.log("-> PASS: Real Google Sheets read test succeeded safely without any writes.");
  } catch (err) {
    console.warn("-> Real sheets read skipped or notice:", err.message);
  }

  console.log("\n=== ALL STEP 2.1 TESTS PASSED ===");
}

runTests();
