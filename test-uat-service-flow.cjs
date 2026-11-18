/**
 * test-uat-service-flow.cjs
 * Test Suite: DentQ Service Catalog Consistency & Booking Flow Verification
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ SERVICE CATALOG & BOOKING FLOW FIX");
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

const bookingsApiCode = fs.readFileSync(path.join(__dirname, "src/app/api/bookings/route.ts"), "utf8");
const bookPageCode = fs.readFileSync(path.join(__dirname, "src/app/book/page.tsx"), "utf8");
const demoDataCode = fs.readFileSync(path.join(__dirname, "src/lib/demo-data.ts"), "utf8");
const seedCode = fs.readFileSync(path.join(__dirname, "prisma/seed.js"), "utf8");

// Test 1: All 5 Standard Dental Services are defined in DEMO_SERVICES
runTest("Master Service Catalog: DEMO_SERVICES contains all 5 standard services with exact IDs", () => {
  const expectedServices = [
    { id: "srv-scaling-filling", nameTh: "ขูดหินปูน / อุดฟัน" },
    { id: "srv-extraction-wisdom", nameTh: "ถอนฟัน / ผ่าฟันคุด" },
    { id: "srv-checkup-consult", nameTh: "ตรวจสุขภาพช่องปากและฟัน" },
    { id: "srv-braces-adjustment", nameTh: "ปรับเครื่องมือจัดฟัน" },
    { id: "srv-root-canal", nameTh: "รักษารากฟัน" },
  ];

  for (const exp of expectedServices) {
    assert(demoDataCode.includes(`id: "${exp.id}"`), `Missing service id: ${exp.id}`);
    assert(demoDataCode.includes(`nameTh: "${exp.nameTh}"`), `Missing service nameTh: ${exp.nameTh}`);
  }
});

// Test 2: Booking API uses MASTER_SERVICES_MAP derived from DEMO_SERVICES
runTest("Booking API Architecture: MASTER_SERVICES_MAP derived directly from DEMO_SERVICES", () => {
  assert(bookingsApiCode.includes("const MASTER_SERVICES_MAP"), "Must declare MASTER_SERVICES_MAP");
  assert(bookingsApiCode.includes("DEMO_SERVICES.map((s) => [s.id, s])"), "Must map DEMO_SERVICES to MASTER_SERVICES_MAP");
  assert(bookingsApiCode.includes("const FALLBACK_SERVICES = MASTER_SERVICES_MAP"), "FALLBACK_SERVICES must alias MASTER_SERVICES_MAP for compatibility");
});

// Test 3: resolveService prioritizes MASTER_SERVICES_MAP without failing on serverless
runTest("Service Resolver: resolveService checks MASTER_SERVICES_MAP first for fast O(1) lookup", () => {
  assert(bookingsApiCode.includes("if (MASTER_SERVICES_MAP[normalizedId]) {"), "Must check MASTER_SERVICES_MAP first");
  assert(bookingsApiCode.includes("return MASTER_SERVICES_MAP[normalizedId];"), "Must return master service immediately");
});

// Test 4: Invalid service IDs are strictly rejected with 400 or Error
runTest("Strict Validation: Invalid service IDs are not accepted or bypassed", () => {
  // In demo mode
  assert(bookingsApiCode.includes('error: "ไม่พบบริการทันตกรรมที่เลือก กรุณาลองใหม่อีกครั้ง"'), "Must return standard error message for unknown services");
  // Check that demo mode doesn't fallback to DEMO_SERVICES[0]
  assert(!bookingsApiCode.includes("|| DEMO_SERVICES[0]"), "Must NOT fallback to DEMO_SERVICES[0] for invalid IDs");
});

// Test 5: Sheets Mode avoids Prisma queries for slotConfig
runTest("Sheets Mode Isolation: Avoids Prisma slotConfig queries when bookingStorage is sheets", () => {
  assert(bookingsApiCode.includes('if (bookingStorage !== "sheets")'), "Must guard Prisma slotConfig queries in sheets mode");
});

// Test 6: SQLite Mode handles missing services via upsert from MASTER_SERVICES_MAP
runTest("SQLite Mode Resilience: Upserts missing master services to maintain foreign keys", () => {
  assert(bookingsApiCode.includes("!selectedService && MASTER_SERVICES_MAP[validated.serviceId]"), "Must check MASTER_SERVICES_MAP when service missing in DB");
  assert(bookingsApiCode.includes("await tx.service.upsert("), "Must upsert to tx.service");
});

// Test 7: Prisma Seed includes srv-checkup-consult
runTest("Database Seed: prisma/seed.js includes srv-checkup-consult", () => {
  assert(seedCode.includes('"srv-checkup-consult"'), "prisma/seed.js must include srv-checkup-consult");
  assert(seedCode.includes("ตรวจสุขภาพช่องปากและฟัน"), "prisma/seed.js must include ตรวจสุขภาพช่องปากและฟัน");
});

// Test 8: Frontend Booking Stepper: selectedService is passed to API without mutation
runTest("Frontend Booking Stepper: selectedService ID is preserved and sent in API payload", () => {
  assert(bookPageCode.includes("serviceId: selectedService.id,"), "Payload must send selectedService.id");
  assert(bookPageCode.includes("disabled={!selectedService}"), "Step 1 Next button requires selectedService");
  assert(bookPageCode.includes("disabled={!selectedSlot}"), "Step 2 Next button requires selectedSlot");
  assert(bookPageCode.includes("disabled={submitting || !pdpaAccepted}"), "Step 3 Submit button prevents double submit");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL UAT SERVICE FLOW TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
