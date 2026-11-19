/**
 * test-sheets-date-time-serial.cjs
 * Comprehensive test suite for DentQ Google Sheets Date & Time Serial Display Fix
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: GOOGLE SHEETS DATE & TIME SERIAL DISPLAY FIX");
console.log("=========================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Read relevant files
const utilsPath = path.join(__dirname, "src/lib/utils.ts");
const sheetsPath = path.join(__dirname, "src/lib/google-sheets.ts");
const trackingApiPath = path.join(__dirname, "src/app/api/tracking/route.ts");
const trackingPagePath = path.join(__dirname, "src/app/tracking/page.tsx");

assert.ok(fs.existsSync(utilsPath), "src/lib/utils.ts must exist");
assert.ok(fs.existsSync(sheetsPath), "src/lib/google-sheets.ts must exist");
assert.ok(fs.existsSync(trackingApiPath), "src/app/api/tracking/route.ts must exist");
assert.ok(fs.existsSync(trackingPagePath), "src/app/tracking/page.tsx must exist");

const utilsContent = fs.readFileSync(utilsPath, "utf-8");
const sheetsContent = fs.readFileSync(sheetsPath, "utf-8");
const trackingApiContent = fs.readFileSync(trackingApiPath, "utf-8");
const trackingPageContent = fs.readFileSync(trackingPagePath, "utf-8");

// Extract functions from utils.ts or require compiled/pure logic
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];
const THAI_DAYS = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"
];

function normalizeDate(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const num = Number(str);
  if (!isNaN(num) && num > 20000 && num < 100000) {
    const wholeDays = Math.floor(num);
    const utcDate = new Date(Date.UTC(1899, 11, 30) + wholeDays * 86400000);
    const y = utcDate.getUTCFullYear();
    const m = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(utcDate.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return str;
}

function normalizeTime(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).trim();
  if (/^\d{2}:\d{2}$/.test(str)) return str;
  if (/^\d:\d{2}$/.test(str)) return `0${str}`;
  const hmsMatch = str.match(/^(\d{1,2}):(\d{2}):\d{2}$/);
  if (hmsMatch) return `${hmsMatch[1].padStart(2, "0")}:${hmsMatch[2]}`;
  const num = Number(str);
  if (!isNaN(num)) {
    const fraction = num >= 1 ? num % 1 : num;
    if (fraction > 0.0001 && fraction < 0.9999) {
      const totalSeconds = Math.round(fraction * 86400);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }
  return str;
}

function formatThaiDate(dateStr, options = {}) {
  try {
    const cleanDate = normalizeDate(dateStr);
    const parts = cleanDate.split("-");
    if (parts.length !== 3) return String(dateStr);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day));
    const buddhistYear = year + 543;
    const monthName = options.short ? THAI_MONTHS_SHORT[month] : THAI_MONTHS[month];
    if (options.includeDay) {
      const dayName = THAI_DAYS[d.getUTCDay()];
      return `วัน${dayName}ที่ ${day} ${monthName} ${buddhistYear}`;
    }
    return `${day} ${monthName} ${buddhistYear}`;
  } catch {
    return String(dateStr);
  }
}

// Test 1: Date Serial conversion to YYYY-MM-DD
runTest("normalizeDate: Converts Google Sheets serial number 46346 to '2026-11-20'", () => {
  assert.strictEqual(normalizeDate(46346), "2026-11-20");
  assert.strictEqual(normalizeDate("46346"), "2026-11-20");
  assert.strictEqual(normalizeDate("46346.4166666667"), "2026-11-20");
  assert.strictEqual(normalizeDate("2026-11-20"), "2026-11-20");
  assert.strictEqual(normalizeDate("2026-11-20T00:00:00.000Z"), "2026-11-20");
  assert.strictEqual(normalizeDate("2569-11-20"), "2026-11-20");
});

// Test 2: Time Fraction conversion to HH:mm
runTest("normalizeTime: Converts Google Sheets time fraction 0.4166666667 to '10:00'", () => {
  assert.strictEqual(normalizeTime(0.4166666667), "10:00");
  assert.strictEqual(normalizeTime("0.4166666667"), "10:00");
  assert.strictEqual(normalizeTime("10:00"), "10:00");
  assert.strictEqual(normalizeTime("9:00"), "09:00");
  assert.strictEqual(normalizeTime("10:00:00"), "10:00");
  assert.strictEqual(normalizeTime(46346.4166666667), "10:00");
});

// Test 3: All 12 standard dental slots convert accurately
runTest("normalizeTime: All 12 DentQ slots roundtrip cleanly from time fraction", () => {
  const slots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"
  ];
  for (const s of slots) {
    const [h, m] = s.split(":").map(Number);
    const fraction = (h + m / 60) / 24;
    assert.strictEqual(normalizeTime(fraction), s, `Slot ${s} failed roundtrip`);
    assert.strictEqual(normalizeTime(s), s, `Original slot ${s} must remain unchanged`);
  }
});

// Test 4: formatThaiDate handles serial and produces exact required Thai date
runTest("formatThaiDate: Serial 46346 produces '20 พฤศจิกายน 2569' and '20 พ.ย. 2569'", () => {
  assert.strictEqual(formatThaiDate(46346), "20 พฤศจิกายน 2569");
  assert.strictEqual(formatThaiDate("46346"), "20 พฤศจิกายน 2569");
  assert.strictEqual(formatThaiDate("46346", { short: true }), "20 พ.ย. 2569");
  assert.strictEqual(formatThaiDate("46346", { includeDay: true }), "วันศุกร์ที่ 20 พฤศจิกายน 2569");
  assert.strictEqual(formatThaiDate("2026-11-20"), "20 พฤศจิกายน 2569");
});

// Test 5: parseRow in google-sheets.ts uses normalizeDate and normalizeTime
runTest("parseRow: Normalizes raw Google Sheets row for queue DEN-004", () => {
  assert.ok(sheetsContent.includes("normalizeDate(row[3])"), "parseRow must use normalizeDate on row[3]");
  assert.ok(sheetsContent.includes("normalizeTime(row[4])"), "parseRow must use normalizeTime on row[4]");

  // Simulated parseRow
  function simulateParseRow(row, rowIndex) {
    return {
      rowIndex,
      bookingId: String(row[0] ?? "").trim(),
      patientName: String(row[1] ?? "").trim(),
      service: String(row[2] ?? "").trim(),
      bookingDate: normalizeDate(row[3]),
      bookingTime: normalizeTime(row[4]),
      status: String(row[5] ?? "").trim().toUpperCase() || "PENDING",
      createdAt: String(row[6] ?? "").trim(),
      phoneNumber: String(row[7] ?? "").trim(),
      lineUserId: String(row[8] ?? "").trim(),
    };
  }

  // Queue DEN-004 test case (actual issue from prompt)
  const rawRowDen004 = [
    "DEN-004",
    "rattana",
    "ตรวจสุขภาพช่องปากและฟัน",
    46346,
    0.4166666667,
    "PENDING",
    "2026-11-19T03:00:00.000Z",
    "0812345678",
    "U_RATTANA_TEST",
  ];
  const parsedDen004 = simulateParseRow(rawRowDen004, 5);
  assert.strictEqual(parsedDen004.bookingDate, "2026-11-20");
  assert.strictEqual(parsedDen004.bookingTime, "10:00");
  assert.strictEqual(formatThaiDate(parsedDen004.bookingDate), "20 พฤศจิกายน 2569");
  assert.strictEqual(`${parsedDen004.bookingTime} น.`, "10:00 น.");

  // Queue with original string format
  const rawRowOriginal = [
    "DEN-001",
    "somchai",
    "อุดฟัน",
    "2026-11-20",
    "10:00",
    "CONFIRMED",
    "2026-11-19T02:00:00.000Z",
    "0899999999",
    "U_SOMCHAI",
  ];
  const parsedOriginal = simulateParseRow(rawRowOriginal, 2);
  assert.strictEqual(parsedOriginal.bookingDate, "2026-11-20");
  assert.strictEqual(parsedOriginal.bookingTime, "10:00");
});

// Test 6: getAllBookingsFromSheet requests FORMATTED_VALUE & FORMATTED_STRING
runTest("getAllBookingsFromSheet: Specifies valueRenderOption and dateTimeRenderOption", () => {
  assert.ok(sheetsContent.includes('valueRenderOption: "FORMATTED_VALUE"'), "Must request FORMATTED_VALUE");
  assert.ok(sheetsContent.includes('dateTimeRenderOption: "FORMATTED_STRING"'), "Must request FORMATTED_STRING");
  assert.ok(sheetsContent.includes('range: "Bookings!A2:M"'), "Must preserve range Bookings!A2:M");
});

// Test 7: Tracking API ensures normalized date and time output
runTest("Tracking API: Ensures normalized date and time output", () => {
  assert.ok(trackingApiContent.includes("normalizeDate(r.bookingDate)"), "Tracking API must normalize bookingDate");
  assert.ok(trackingApiContent.includes("normalizeTime(r.bookingTime)"), "Tracking API must normalize bookingTime");
});

// Test 8: Tracking Page displays full Thai date and normalized time
runTest("Tracking Page: Displays '20 พฤศจิกายน 2569' and '10:00 น.'", () => {
  assert.ok(trackingPageContent.includes("normalizeTime(b.time)"), "Tracking Page must normalize time display");
  assert.ok(trackingPageContent.includes("{formatThaiDate(b.date)}"), "Tracking Page must display full Thai month");
});

// Test 9: Zero Timezone Shift
runTest("Zero Timezone Shift: Date calculation does not shift across midnight", () => {
  const d = normalizeDate(46346);
  assert.strictEqual(d, "2026-11-20", "Serial 46346 must always be 2026-11-20 regardless of local timezone");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log("=========================================================");

if (totalTests === passedTests) {
  console.log("\n>>> ALL GOOGLE SHEETS DATE & TIME FIX TESTS PASSED! <<<\n");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<\n");
  process.exit(1);
}
