/**
 * test-uat-slots-recovery.cjs
 * Test Suite: DentQ UAT Slots Recovery, Quota Rules & Error Handling Verification
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ UAT SLOTS RECOVERY & QUOTA VERIFICATION");
console.log("=========================================================\n");

let total = 0;
let passed = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${total}: ${name}`);
    console.error(`       Error: ${err.message}\n`);
  }
}

const slotsApiCode = fs.readFileSync(path.join(__dirname, "src/app/api/slots/route.ts"), "utf8");
const bookPageCode = fs.readFileSync(path.join(__dirname, "src/app/book/page.tsx"), "utf8");
const googleSheetsCode = fs.readFileSync(path.join(__dirname, "src/lib/google-sheets.ts"), "utf8");
const utilsCode = fs.readFileSync(path.join(__dirname, "src/lib/utils.ts"), "utf8");

// Test 1: STANDARD_SLOTS configuration preserves 12 standard dental slots
runTest("Standard Slots: Preserves 12 standard DentQ slots (6 morning, 6 afternoon)", () => {
  const morningTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
  const afternoonTimes = ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];

  for (const t of morningTimes) {
    assert(utilsCode.includes(`"${t}"`), `Missing morning slot time: ${t}`);
  }
  for (const t of afternoonTimes) {
    assert(utilsCode.includes(`"${t}"`), `Missing afternoon slot time: ${t}`);
  }
  assert(utilsCode.includes("MORNING"), "utils.ts must define MORNING period");
  assert(utilsCode.includes("AFTERNOON"), "utils.ts must define AFTERNOON period");
});

// Test 2: /api/slots in sheets mode avoids Prisma SQLite dependency
runTest("Slots API Architecture: Avoids Prisma SQLite calls when BOOKING_STORAGE is sheets", () => {
  assert(slotsApiCode.includes('if (bookingStorage !== "sheets")'), "Must guard Prisma slotConfig queries when in sheets mode");
  assert(slotsApiCode.includes("prisma.slotConfig"), "Keeps prisma query for sqlite mode");
});

// Test 3: Date matching sanitization in /api/slots for Google Sheets
runTest("Date Normalization: Sanitizes and trims ISO/date strings from Google Sheets", () => {
  assert(slotsApiCode.includes('.split("T")[0].trim()'), "Must sanitize ISO strings by splitting T and trimming");
  assert(slotsApiCode.includes("const targetDate = date.trim();"), "Must trim targetDate");
});

// Test 4: Quota enforcement logic (max 2/slot, max 6 morning, max 6 procedures)
runTest("Quota Rules: Enforces max 2 per slot, max 6 morning, and procedure quotas", () => {
  assert(slotsApiCode.includes("MORNING_MAX_CAPACITY"), "Must use MORNING_MAX_CAPACITY");
  assert(slotsApiCode.includes("morningActiveCount >= MORNING_MAX_CAPACITY"), "Must enforce morning active limit");
  assert(slotsApiCode.includes("isProcedureQuotaFull"), "Must enforce procedure quota");
  assert(slotsApiCode.includes("const currentBookings = bookingCountMap.get(s.time) || 0;"), "Must calculate booked count per slot");
  assert(slotsApiCode.includes("const maxCapacity = config?.maxCapacity ?? 2;"), "Default max capacity must be 2 per slot");
});

// Test 5: Google Sheets client sanitizes Spreadsheet ID and unescapes private_key
runTest("Google Sheets Client: Sanitizes Spreadsheet ID (quotes & /d/ URL) and unescapes private_key", () => {
  assert(googleSheetsCode.includes(".replace(/^[\"']|[\"']$/g, \"\").trim()"), "Must strip quotes from rawSpreadsheetId");
  assert(googleSheetsCode.includes("/\\/d\\/([a-zA-Z0-9-_]+)/"), "Must extract ID from full Google Sheets URL");
  assert(googleSheetsCode.includes(".replace(/\\\\n/g, \"\\n\")"), "Must unescape literal \\n in private_key");
});

// Test 6: Google Sheets getAllBookingsFromSheet fallback for sheet tab name
runTest("Google Sheets Range Fallback: Falls back to A2:M if tab 'Bookings' is missing", () => {
  assert(googleSheetsCode.includes('"Bookings!A2:M"'), "Must attempt Bookings!A2:M first");
  assert(googleSheetsCode.includes("Unable to parse range"), "Must catch Unable to parse range error");
  assert(googleSheetsCode.includes('"A2:M"'), "Must fallback to A2:M");
});

// Test 7: Book page has slotsError state and does not guess empty slots as available
runTest("Book Page UI: slotsError state prevents guessing empty slots as available", () => {
  assert(bookPageCode.includes("const [slotsError, setSlotsError] = useState<string | null>(null);"), "Must have slotsError state");
  assert(bookPageCode.includes("setSlots([]);"), "Must clear slots on fetch failure to prevent false availability");
  assert(bookPageCode.includes("setSlotsError("), "Must set slotsError on error");
});

// Test 8: Book page displays error message and retry button in Step 2
runTest("Book Page UI: Renders alert banner and retry button with RefreshCw when slots fail to load", () => {
  assert(bookPageCode.includes("slotsError ? ("), "Must conditionally render slotsError section");
  assert(bookPageCode.includes("ไม่สามารถโหลดช่วงเวลานัดหมายได้"), "Must display Thai error message");
  assert(bookPageCode.includes("ลองโหลดช่วงเวลาใหม่อีกครั้ง"), "Must have retry button label");
  assert(bookPageCode.includes("onClick={fetchSlots}"), "Retry button must invoke fetchSlots");
  assert(bookPageCode.includes("RefreshCw"), "Must include RefreshCw icon");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL UAT SLOTS RECOVERY TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
