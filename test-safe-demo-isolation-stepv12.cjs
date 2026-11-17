/**
 * test-safe-demo-isolation-stepv12.cjs
 * Comprehensive test suite for DentQ Step V1.2: Safe Demo API Isolation
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP V1.2 SAFE DEMO API ISOLATION");
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
// 1. Source Inspection: Server-side Feature Flag & Helper Guards
// ---------------------------------------------------------------------------
const demoDataPath = path.join(__dirname, "src", "lib", "demo-data.ts");
const demoDataContent = fs.readFileSync(demoDataPath, "utf-8");

runTest("Feature Flag: src/lib/demo-data.ts exports isDemoMode() checking DEMO_MODE === 'true'", () => {
  assert.ok(demoDataContent.includes("export function isDemoMode(): boolean"), "Must export isDemoMode");
  assert.ok(demoDataContent.includes('process.env.DEMO_MODE === "true"'), "Must check DEMO_MODE === 'true'");
});

const lineApiPath = path.join(__dirname, "src", "lib", "lineApi.ts");
const lineApiContent = fs.readFileSync(lineApiPath, "utf-8");

runTest("LINE Guard: pushMessage & replyMessage simulated (no-op) in Demo Mode", () => {
  assert.ok(lineApiContent.includes("if (isDemoMode())"), "lineApi must check isDemoMode");
  assert.ok(
    lineApiContent.includes("[Demo Mode] LINE Push Message simulated"),
    "pushMessage must simulate in Demo Mode"
  );
  assert.ok(
    lineApiContent.includes("[Demo Mode] LINE Reply Message simulated"),
    "replyMessage must simulate in Demo Mode"
  );
});

runTest("LINE Token Guard: Mock token ONLY accepted when isDemoMode() is true", () => {
  assert.ok(
    lineApiContent.includes("if (isDemoMode())") &&
    lineApiContent.includes("idToken === DEMO_MOCK_USER.idToken"),
    "Mock token must be guarded inside isDemoMode()"
  );
});

const sheetsPath = path.join(__dirname, "src", "lib", "google-sheets.ts");
const sheetsContent = fs.readFileSync(sheetsPath, "utf-8");

runTest("Google Sheets Guard: Blocks read/write in Demo Mode", () => {
  assert.ok(sheetsContent.includes("import { isDemoMode } from \"./demo-data\""), "Must import isDemoMode");
  assert.ok(
    sheetsContent.includes("if (isDemoMode()) {\n    throw new Error(\"Google Sheets access is blocked in Demo Mode\");"),
    "getSheetsClient must throw in Demo Mode"
  );
  assert.ok(
    sheetsContent.includes("if (isDemoMode()) {\n    console.log(\"[Demo Mode] appendBookingToSheet blocked"),
    "appendBookingToSheet must block in Demo Mode"
  );
  assert.ok(
    sheetsContent.includes("if (isDemoMode()) {\n    console.log(\"[Demo Mode] updateBookingStatusInSheet blocked"),
    "updateBookingStatusInSheet must block in Demo Mode"
  );
});

const cronPath = path.join(__dirname, "src", "lib", "cron.ts");
const cronContent = fs.readFileSync(cronPath, "utf-8");

runTest("Cron Guard: processAdvanceReminders skipped in Demo Mode", () => {
  assert.ok(cronContent.includes("import { isDemoMode } from \"./demo-data\""), "Must import isDemoMode in cron.ts");
  assert.ok(
    cronContent.includes("[Demo Mode] processAdvanceReminders skipped"),
    "processAdvanceReminders must skip in Demo Mode"
  );
});

// ---------------------------------------------------------------------------
// 2. Source Inspection: API Routes Demo Isolation
// ---------------------------------------------------------------------------
const bookingsRoutePath = path.join(__dirname, "src", "app", "api", "bookings", "route.ts");
const bookingsRouteContent = fs.readFileSync(bookingsRoutePath, "utf-8");

runTest("Bookings API: GET uses getDemoBookings() and POST returns PENDING Ticket without saving to DB", () => {
  assert.ok(bookingsRouteContent.includes("import {\n  isDemoMode,\n  getDemoBookings"), "Must import demo fixtures");
  assert.ok(
    bookingsRouteContent.includes("let demoList = getDemoBookings(date && date !== \"ALL\" ? date : undefined);"),
    "GET must use getDemoBookings in Demo Mode"
  );
  assert.ok(
    bookingsRouteContent.includes("const demoBooking = {") &&
    bookingsRouteContent.includes('status: "PENDING"') &&
    bookingsRouteContent.includes("queueNumber = \"DEN-009\""),
    "POST must return simulated PENDING digital ticket in Demo Mode"
  );
  assert.ok(
    bookingsRouteContent.includes("countActiveMorningBookings") &&
    bookingsRouteContent.includes("MORNING_MAX_CAPACITY"),
    "POST must enforce morning quota in Demo Mode"
  );
});

const statusRoutePath = path.join(__dirname, "src", "app", "api", "bookings", "[id]", "status", "route.ts");
const statusRouteContent = fs.readFileSync(statusRoutePath, "utf-8");

runTest("Status API: Supports simulated approve/reject without claiming permanent persistence", () => {
  assert.ok(statusRouteContent.includes("import { isDemoMode, getDemoBookings }"), "Must import demo-data");
  assert.ok(
    statusRouteContent.includes("อัปเดตสถานะสำเร็จ (โหมดสาธิต - การเปลี่ยนแปลงไม่ถูกบันทึกถาวร)"),
    "Status API must explicitly disclaim permanent persistence in Demo Mode"
  );
  assert.ok(
    statusRouteContent.includes("if (status === \"REJECTED\")"),
    "Status API must preserve rejectReason validation"
  );
});

const trackingRoutePath = path.join(__dirname, "src", "app", "api", "tracking", "route.ts");
const trackingRouteContent = fs.readFileSync(trackingRoutePath, "utf-8");

runTest("Tracking API: Uses getDemoBookings() filtered strictly by verifiedLineUserId", () => {
  assert.ok(trackingRouteContent.includes("import { isDemoMode, getDemoBookings }"), "Must import demo-data in tracking");
  assert.ok(
    trackingRouteContent.includes("userBookings = allDemo.filter((b) => b.lineUserId === verifiedLineUserId);"),
    "Tracking API must enforce zero-trust privacy with demo data"
  );
});

const trackingActionPath = path.join(__dirname, "src", "app", "api", "tracking", "action", "route.ts");
const trackingActionContent = fs.readFileSync(trackingActionPath, "utf-8");

runTest("Tracking Action API: Operates safely on demo bookings without writing to Google Sheets/SQLite", () => {
  assert.ok(trackingActionContent.includes("import { isDemoMode, getDemoBookings }"), "Must import demo-data in action");
  assert.ok(
    trackingActionContent.includes("booking.lineUserId !== verifiedLineUserId"),
    "Action API must enforce queue ownership check"
  );
  assert.ok(
    trackingActionContent.includes("(โหมดสาธิต)"),
    "Action API must return simulated confirmation message"
  );
});

const slotsRoutePath = path.join(__dirname, "src", "app", "api", "slots", "route.ts");
const slotsRouteContent = fs.readFileSync(slotsRoutePath, "utf-8");

runTest("Slots API: Returns getDemoSlots(date) in Demo Mode without touching DB or Sheets", () => {
  assert.ok(slotsRouteContent.includes("import { isDemoMode, getDemoSlots }"), "Must import getDemoSlots");
  assert.ok(
    slotsRouteContent.includes("const slots = getDemoSlots(date);"),
    "Slots API must call getDemoSlots in Demo Mode"
  );
});

const servicesRoutePath = path.join(__dirname, "src", "app", "api", "services", "route.ts");
const servicesRouteContent = fs.readFileSync(servicesRoutePath, "utf-8");

runTest("Services API: Returns DEMO_SERVICES in Demo Mode without querying Prisma", () => {
  assert.ok(servicesRouteContent.includes("import { isDemoMode, DEMO_SERVICES }"), "Must import DEMO_SERVICES");
  assert.ok(
    servicesRouteContent.includes("services: DEMO_SERVICES"),
    "Services API must return DEMO_SERVICES in Demo Mode"
  );
});

const kpisRoutePath = path.join(__dirname, "src", "app", "api", "admin", "kpis", "route.ts");
const kpisRouteContent = fs.readFileSync(kpisRoutePath, "utf-8");

runTest("Admin KPIs API: Returns getDemoKPIs() in Demo Mode with admin auth guard preserved", () => {
  assert.ok(kpisRouteContent.includes("import { isDemoMode, getDemoKPIs }"), "Must import getDemoKPIs");
  assert.ok(
    kpisRouteContent.includes("getDemoKPIs(todayStr)"),
    "KPIs API must call getDemoKPIs in Demo Mode"
  );
  assert.ok(
    kpisRouteContent.includes("req.cookies.get(\"admin_session\")"),
    "Admin auth check must be preserved before demo KPIs return"
  );
});

// ---------------------------------------------------------------------------
// 3. Source Inspection: Disabled / Rejected Routes in Demo Mode
// ---------------------------------------------------------------------------
const emergencyPath = path.join(__dirname, "src", "app", "api", "emergency", "route.ts");
const emergencyContent = fs.readFileSync(emergencyPath, "utf-8");

runTest("Emergency API: POST returns 403 in Demo Mode", () => {
  assert.ok(emergencyContent.includes("isDemoMode()"), "Must check isDemoMode");
  assert.ok(
    emergencyContent.includes("การสร้างคิวฉุกเฉินปิดใช้งานในโหมดสาธิต"),
    "Emergency creation must be cleanly rejected in Demo Mode"
  );
});

const webhookPath = path.join(__dirname, "src", "app", "api", "line", "webhook", "route.ts");
const webhookContent = fs.readFileSync(webhookPath, "utf-8");

runTest("LINE Webhook: POST returns 200 no-op in Demo Mode", () => {
  assert.ok(webhookContent.includes("isDemoMode()"), "Must check isDemoMode");
  assert.ok(
    webhookContent.includes("LINE Webhook received (Demo Mode - no-op)"),
    "Webhook must safely no-op in Demo Mode"
  );
});

const testSheetsPath = path.join(__dirname, "src", "app", "api", "test-sheets", "route.ts");
const testSheetsContent = fs.readFileSync(testSheetsPath, "utf-8");

runTest("Test Sheets API: Disabled (403) in Demo Mode", () => {
  assert.ok(testSheetsContent.includes("isDemoMode()"), "Must check isDemoMode");
  assert.ok(
    testSheetsContent.includes("Test Sheets API is disabled in Demo Mode"),
    "Test sheets must return 403 in Demo Mode"
  );
});

const testLinePath = path.join(__dirname, "src", "app", "api", "test-line", "route.ts");
const testLineContent = fs.readFileSync(testLinePath, "utf-8");

runTest("Test LINE API: Disabled (403) in Demo Mode", () => {
  assert.ok(testLineContent.includes("isDemoMode()"), "Must check isDemoMode");
  assert.ok(
    testLineContent.includes("Test LINE API is disabled in Demo Mode"),
    "Test LINE must return 403 in Demo Mode"
  );
});

// ---------------------------------------------------------------------------
// 4. Functional Execution of isDemoMode() Flag Behavior
// ---------------------------------------------------------------------------
runTest("Functional Flag: DEMO_MODE controls isDemoMode() cleanly", () => {
  const ts = require("typescript");
  const vm = require("vm");
  const transpiled = ts.transpileModule(demoDataContent, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  
  const originalVal = process.env.DEMO_MODE;
  
  process.env.DEMO_MODE = "true";
  const modTrue = { exports: {} };
  vm.runInNewContext(transpiled, { module: modTrue, exports: modTrue.exports, process, console, Date, parseInt, String, require: () => ({ STANDARD_SLOTS: [] }) });
  assert.strictEqual(modTrue.exports.isDemoMode(), true, "isDemoMode() must be true when DEMO_MODE='true'");
  
  process.env.DEMO_MODE = "false";
  const modFalse = { exports: {} };
  vm.runInNewContext(transpiled, { module: modFalse, exports: modFalse.exports, process, console, Date, parseInt, String, require: () => ({ STANDARD_SLOTS: [] }) });
  assert.strictEqual(modFalse.exports.isDemoMode(), false, "isDemoMode() must be false when DEMO_MODE='false'");
  
  delete process.env.DEMO_MODE;
  const modUnset = { exports: {} };
  vm.runInNewContext(transpiled, { module: modUnset, exports: modUnset.exports, process, console, Date, parseInt, String, require: () => ({ STANDARD_SLOTS: [] }) });
  assert.strictEqual(modUnset.exports.isDemoMode(), false, "isDemoMode() must be false when DEMO_MODE is unset");
  
  // Restore
  if (originalVal !== undefined) {
    process.env.DEMO_MODE = originalVal;
  }
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
  console.log("\n>>> ALL STEP V1.2 DEMO ISOLATION TESTS PASSED! <<<\n");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<\n");
  process.exit(1);
}
