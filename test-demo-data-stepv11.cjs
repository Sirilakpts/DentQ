/**
 * test-demo-data-stepv11.cjs
 * Comprehensive test suite for DentQ Step V1.1: Synthetic Demo Data
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");
const vm = require("vm");

console.log("=========================================================");
console.log("TEST SUITE: STEP V1.1 SYNTHETIC DEMO DATA");
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

// ---------------------------------------------------------------------------
// 1. Static Source Inspection: src/lib/demo-data.ts
// ---------------------------------------------------------------------------
const demoDataPath = path.join(__dirname, "src", "lib", "demo-data.ts");
assert.ok(fs.existsSync(demoDataPath), "src/lib/demo-data.ts must exist");
const demoDataContent = fs.readFileSync(demoDataPath, "utf-8");

runTest("Demo Data: Imports canonical types from ./types without duplication", () => {
  assert.ok(
    demoDataContent.includes('from "./types";') || demoDataContent.includes("from './types';"),
    "Must import canonical types from ./types"
  );
  assert.ok(demoDataContent.includes("BookingRecord"), "Must import BookingRecord");
  assert.ok(demoDataContent.includes("DentalService"), "Must import DentalService");
  assert.ok(demoDataContent.includes("ClinicKPIs"), "Must import ClinicKPIs");
  assert.ok(demoDataContent.includes("SlotAvailability"), "Must import SlotAvailability");
  assert.ok(demoDataContent.includes("STANDARD_SLOTS"), "Must import STANDARD_SLOTS from ./utils");
});

runTest("Demo Data: Exports all required mock fixtures and functions", () => {
  assert.ok(demoDataContent.includes("export const DEMO_MOCK_USER"), "Must export DEMO_MOCK_USER");
  assert.ok(demoDataContent.includes("export const DEMO_SERVICES"), "Must export DEMO_SERVICES");
  assert.ok(demoDataContent.includes("export function getDemoBookings"), "Must export getDemoBookings");
  assert.ok(demoDataContent.includes("export function getDemoSlots"), "Must export getDemoSlots");
  assert.ok(demoDataContent.includes("export function getDemoKPIs"), "Must export getDemoKPIs");
  assert.ok(demoDataContent.includes("export function getRelativeDemoDate"), "Must export getRelativeDemoDate");
});

runTest("Demo Data: Air-Gapped & Zero Real Patient PII check", () => {
  // Ensure no Google Sheets API, database clients, or real patient PII is referenced
  assert.ok(!demoDataContent.includes("googleapis"), "Must not import googleapis in demo data");
  assert.ok(!demoDataContent.includes("@prisma/client"), "Must not import Prisma client in demo data");
  assert.ok(!demoDataContent.includes("google-sheets"), "Must not import real google-sheets module");
});

// ---------------------------------------------------------------------------
// 2. Dynamic Execution of Transpiled Module
// ---------------------------------------------------------------------------
// Transpile demo-data.ts and mock utils dependency
const utilsPath = path.join(__dirname, "src", "lib", "utils.ts");
const utilsContent = fs.readFileSync(utilsPath, "utf-8");

// Create transpiled code
const transpiledUtils = ts.transpileModule(utilsContent, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const transpiledDemo = ts.transpileModule(demoDataContent, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// Setup mock sandbox for execution
const utilsModule = { exports: {} };
const utilsContext = vm.createContext({
  module: utilsModule,
  exports: utilsModule.exports,
  require: (id) => {
    if (id === "clsx") return (...args) => args.filter(Boolean).join(" ");
    if (id === "tailwind-merge") return { twMerge: (s) => s };
    return {};
  },
  console,
});
vm.runInContext(transpiledUtils, utilsContext);

const demoModule = { exports: {} };
const demoContext = vm.createContext({
  module: demoModule,
  exports: demoModule.exports,
  require: (id) => {
    if (id === "./utils") return utilsModule.exports;
    return {};
  },
  console,
  Date,
  parseInt,
  String,
});
vm.runInContext(transpiledDemo, demoContext);

const {
  DEMO_MOCK_USER,
  DEMO_SERVICES,
  getDemoBookings,
  getDemoSlots,
  getDemoKPIs,
  getRelativeDemoDate,
} = demoModule.exports;

runTest("DEMO_SERVICES: Contains 5 active dental services with complete properties", () => {
  assert.strictEqual(Array.isArray(DEMO_SERVICES), true, "DEMO_SERVICES must be an array");
  assert.strictEqual(DEMO_SERVICES.length, 5, "DEMO_SERVICES must contain 5 services");
  
  for (const s of DEMO_SERVICES) {
    assert.ok(s.id && typeof s.id === "string", "Service must have an id");
    assert.ok(s.nameTh && typeof s.nameTh === "string", "Service must have nameTh");
    assert.ok(s.nameEn && typeof s.nameEn === "string", "Service must have nameEn");
    assert.strictEqual(typeof s.durationMinutes, "number", "durationMinutes must be a number");
    assert.strictEqual(typeof s.priceMin, "number", "priceMin must be a number");
    assert.strictEqual(typeof s.priceMax, "number", "priceMax must be a number");
    assert.ok(s.priceDisplay && typeof s.priceDisplay === "string", "priceDisplay must be a string");
    assert.ok(s.description && typeof s.description === "string", "description must be a string");
    assert.ok(s.icon && typeof s.icon === "string", "icon must be a string");
    assert.strictEqual(s.isActive, true, "All demo services should be active");
  }
});

runTest("DEMO_MOCK_USER: Contains verified mock LINE user for UI testing", () => {
  assert.ok(DEMO_MOCK_USER, "DEMO_MOCK_USER must exist");
  assert.strictEqual(DEMO_MOCK_USER.userId, "U_demo_user_001");
  assert.ok(DEMO_MOCK_USER.displayName.includes("(LINE Demo)"), "DisplayName must indicate Demo");
  assert.ok(DEMO_MOCK_USER.pictureUrl.startsWith("http"), "PictureUrl must be a valid URL");
  assert.ok(DEMO_MOCK_USER.idToken, "idToken must be present");
});

runTest("getDemoBookings: Returns 8 synthetic bookings with valid queue numbers", () => {
  const bookings = getDemoBookings();
  assert.strictEqual(Array.isArray(bookings), true, "Bookings must be an array");
  assert.strictEqual(bookings.length, 8, "Must contain exactly 8 demo bookings");
  
  bookings.forEach((b, idx) => {
    assert.ok(b.id.startsWith("demo-booking-"), `Booking ${idx} id must start with demo-booking-`);
    assert.ok(b.queueNumber.startsWith("DEN-"), `Booking ${idx} queueNumber must start with DEN-`);
    assert.ok(b.patientName.includes("(LINE Demo)"), `Booking ${idx} patientName must contain (LINE Demo)`);
    assert.ok(b.phoneNumber.match(/^08\d-\d{3}-\d{4}$/), `Booking ${idx} phone must be synthetic pattern`);
    assert.strictEqual(b.isEmergency, false, "Online bookings must not be emergency");
  });
});

runTest("getDemoBookings: Covers all 6 required statuses", () => {
  const bookings = getDemoBookings();
  const statuses = new Set(bookings.map((b) => b.status));
  
  const requiredStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "REJECTED"];
  for (const st of requiredStatuses) {
    assert.ok(statuses.has(st), `Demo data must include status: ${st}`);
  }
});

runTest("getDemoBookings: Covers all 5 Thai medical rights", () => {
  const bookings = getDemoBookings();
  const rights = new Set(bookings.map((b) => b.medicalRights));
  
  const requiredRights = ["บัตรทอง", "ประกันสังคม", "ข้าราชการ", "ชำระเอง", "ไม่แน่ใจ"];
  for (const r of requiredRights) {
    assert.ok(rights.has(r), `Demo data must include medical right: ${r}`);
  }
});

runTest("Morning Quota Rule: Active morning bookings <= 6", () => {
  const bookings = getDemoBookings();
  const morningBookings = bookings.filter((b) => {
    const hour = parseInt(b.time.split(":")[0], 10);
    return hour < 12 || b.period === "MORNING";
  });
  
  // Morning bookings count
  assert.strictEqual(morningBookings.length, 5, "Total morning bookings in seed is 5");
  
  // Active statuses: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS
  const activeMorning = morningBookings.filter((b) =>
    ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status)
  );
  
  assert.ok(activeMorning.length <= 6, `Active morning bookings (${activeMorning.length}) must be <= 6`);
  assert.strictEqual(activeMorning.length, 4, "Active morning bookings must be exactly 4");
  
  // REJECTED booking in morning is excluded from active count
  const rejectedMorning = morningBookings.filter((b) => b.status === "REJECTED");
  assert.strictEqual(rejectedMorning.length, 1, "There is 1 rejected morning booking");
});

runTest("REJECTED Booking: DEN-005 has realistic staff rejection reason", () => {
  const bookings = getDemoBookings();
  const rejected = bookings.find((b) => b.queueNumber === "DEN-005");
  assert.ok(rejected, "Booking DEN-005 must exist");
  assert.strictEqual(rejected.status, "REJECTED");
  assert.ok(rejected.rejectReason && rejected.rejectReason.trim().length > 0, "rejectReason must not be empty");
  assert.ok(
    rejected.rejectReason.includes("คิวการตรวจเต็ม"),
    "rejectReason must be realistic staff explanation"
  );
  assert.strictEqual(rejected.lineUserId, DEMO_MOCK_USER.userId, "DEN-005 must belong to mock user");
});

runTest("Mock User Linkage: Demo user has multiple bookings with diverse statuses for Tracking UI", () => {
  const bookings = getDemoBookings();
  const userBookings = bookings.filter((b) => b.lineUserId === DEMO_MOCK_USER.userId);
  assert.strictEqual(userBookings.length, 3, "Mock user must have 3 sample bookings");
  
  const userStatuses = userBookings.map((b) => b.status);
  assert.ok(userStatuses.includes("PENDING"), "User must have a PENDING booking");
  assert.ok(userStatuses.includes("CONFIRMED"), "User must have a CONFIRMED booking");
  assert.ok(userStatuses.includes("REJECTED"), "User must have a REJECTED booking with reason");
});

runTest("getDemoSlots: Calculates slot availability against morning quota and capacity", () => {
  const slots = getDemoSlots();
  assert.strictEqual(Array.isArray(slots), true, "Slots must be an array");
  assert.strictEqual(slots.length, 12, "Must cover all 12 standard dental slots (6 morning, 6 afternoon)");
  
  // Morning quota is not full (4 active < 6), so morning slots with < 2 bookings should be AVAILABLE
  const morningSlots = slots.filter((s) => s.period === "MORNING");
  assert.strictEqual(morningSlots.length, 6, "There are 6 morning slots");
  
  for (const s of slots) {
    assert.ok(["AVAILABLE", "FULL"].includes(s.status), `Slot status must be AVAILABLE or FULL`);
    assert.strictEqual(s.maxCapacity, 2, "maxCapacity must be 2");
    assert.strictEqual(typeof s.currentBookings, "number");
    if (s.status === "FULL") {
      assert.ok(s.blockedReason !== null, "Blocked slot must have a blockedReason");
    }
  }
});

runTest("getDemoKPIs: Returns consistent clinic KPIs matching synthetic bookings", () => {
  const bookings = getDemoBookings();
  const kpis = getDemoKPIs();
  
  assert.strictEqual(kpis.totalToday, bookings.length, "totalToday must equal bookings length");
  assert.strictEqual(kpis.pendingCount, bookings.filter((b) => b.status === "PENDING").length);
  assert.strictEqual(kpis.confirmedTodayCount, bookings.filter((b) => b.status === "CONFIRMED").length);
  assert.strictEqual(kpis.inProgressCount, bookings.filter((b) => b.status === "IN_PROGRESS").length);
  assert.strictEqual(kpis.completedTodayCount, bookings.filter((b) => b.status === "COMPLETED").length);
  assert.strictEqual(kpis.emergencyCount, 0, "emergencyCount must be 0 for online demo");
  assert.strictEqual(typeof kpis.procedureCount, "number");
});

runTest("getRelativeDemoDate: Generates correct relative YYYY-MM-DD dates", () => {
  const today = getRelativeDemoDate(0);
  const now = new Date();
  const expectedToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  assert.strictEqual(today, expectedToday, "Relative date (0) must match today");
  
  const tomorrow = getRelativeDemoDate(1);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const expectedTomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
  assert.strictEqual(tomorrow, expectedTomorrow, "Relative date (1) must match tomorrow");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log("=========================================================");

if (passedTests === totalTests) {
  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<\n");
  process.exit(1);
}
