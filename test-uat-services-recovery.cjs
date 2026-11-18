/**
 * test-uat-services-recovery.cjs
 * Test Suite: DentQ UAT Dental Services Recovery & Availability Verification
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ UAT SERVICES RECOVERY & AVAILABILITY");
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

const servicesApiCode = fs.readFileSync(path.join(__dirname, "src/app/api/services/route.ts"), "utf8");
const bookPageCode = fs.readFileSync(path.join(__dirname, "src/app/book/page.tsx"), "utf8");
const demoDataCode = fs.readFileSync(path.join(__dirname, "src/lib/demo-data.ts"), "utf8");

// Test 1: API /api/services handles DEMO_MODE=false with fallback to standard services
runTest("Services API UAT Mode: Returns standard dental services when DEMO_MODE=false without requiring SQLite", () => {
  assert(servicesApiCode.includes("DEMO_SERVICES"), "Services API must import DEMO_SERVICES");
  assert(servicesApiCode.includes("prisma.service"), "Services API must attempt prisma query");
  assert(servicesApiCode.includes(".catch(() => [])"), "Prisma query must catch errors safely for serverless");
  assert(servicesApiCode.includes("return NextResponse.json({ success: true, services: DEMO_SERVICES });"), "Must fallback to standard dental services");
});

// Test 2: Standard services list preserves exact 5 original services
runTest("Service Integrity: Standard service catalog preserves exact 5 original services", () => {
  const expectedServices = [
    { id: "srv-scaling-filling", nameTh: "ขูดหินปูน / อุดฟัน" },
    { id: "srv-extraction-wisdom", nameTh: "ถอนฟัน / ผ่าฟันคุด" },
    { id: "srv-checkup-consult", nameTh: "ตรวจสุขภาพช่องปากและฟัน" },
    { id: "srv-braces-adjustment", nameTh: "ปรับเครื่องมือจัดฟัน" },
    { id: "srv-root-canal", nameTh: "รักษารากฟัน" },
  ];

  for (const s of expectedServices) {
    assert(demoDataCode.includes(s.id), `Missing service id: ${s.id}`);
    assert(demoDataCode.includes(s.nameTh), `Missing service nameTh: ${s.nameTh}`);
  }
});

// Test 3: Demo Mode returns services with isDemo: true
runTest("Demo Mode Compatibility: Returns services with isDemo: true when isDemoMode()", () => {
  assert(servicesApiCode.includes("if (isDemoMode()) {"), "Must check isDemoMode()");
  assert(servicesApiCode.includes("return NextResponse.json({ success: true, services: DEMO_SERVICES, isDemo: true });"), "Demo mode must return services with isDemo: true");
});

// Test 4: Book page has error handling and client fallback
runTest("Book Page Robustness: fetchServices has try-catch and client fallback to prevent empty state", () => {
  assert(bookPageCode.includes("const [servicesError, setServicesError] = useState<string | null>(null);"), "Must have servicesError state");
  assert(bookPageCode.includes("setServices(DEMO_SERVICES);"), "Must set DEMO_SERVICES fallback on fetch error");
  assert(bookPageCode.includes("fetchServices();"), "Must call fetchServices on mount");
});

// Test 5: Book page displays error message and retry button if services list is ever empty
runTest("Book Page UI: Displays error guidance and retry button instead of a blank card if empty", () => {
  assert(bookPageCode.includes("services.length === 0"), "Must check for empty services");
  assert(bookPageCode.includes("ลองใหม่อีกครั้ง"), "Must provide retry button");
  assert(bookPageCode.includes("onClick={fetchServices}"), "Retry button must trigger fetchServices");
});

// Test 6: Next button is enabled once service is selected and goes to Step 2
runTest("Booking Stepper: Next button enables on selection and advances to Step 2 (Date & Slot)", () => {
  assert(bookPageCode.includes("disabled={!selectedService}"), "Next button must be disabled only when !selectedService");
  assert(bookPageCode.includes("onClick={() => setStep(2)}"), "Next button must advance to Step 2");
  assert(bookPageCode.includes("ขั้นตอนที่ 1: เลือกสาเหตุที่มาพบทันตแพทย์"), "Step 1 title preserved");
  assert(bookPageCode.includes("ขั้นตอนที่ 2: เลือกวันและช่วงเวลานัดหมาย"), "Step 2 title preserved");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL UAT SERVICES RECOVERY TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
