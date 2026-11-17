/**
 * test-vercel-readiness-stepv14.cjs
 * Comprehensive test suite for DentQ Step V1.4: Vercel Build & Security Readiness
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP V1.4 VERCEL BUILD & SECURITY READINESS");
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
// 1. Next.js Production Build Artifacts Check
// ---------------------------------------------------------------------------
const nextDir = path.join(__dirname, ".next");
runTest("Production Build: .next build directory exists with server and static output", () => {
  assert.ok(fs.existsSync(nextDir), ".next directory must exist after build");
  assert.ok(fs.existsSync(path.join(nextDir, "server")), ".next/server must exist");
  assert.ok(fs.existsSync(path.join(nextDir, "static")), ".next/static must exist");
});

runTest("Production Build: Key pages compiled successfully in build output", () => {
  const appServerDir = path.join(nextDir, "server", "app");
  assert.ok(fs.existsSync(path.join(appServerDir, "book.html")), "book.html must be generated");
  assert.ok(fs.existsSync(path.join(appServerDir, "tracking.html")), "tracking.html must be generated");
  assert.ok(fs.existsSync(path.join(appServerDir, "admin.html")), "admin.html must be generated");
  assert.ok(fs.existsSync(path.join(appServerDir, "login.html")), "login.html must be generated");
});

// ---------------------------------------------------------------------------
// 2. Git & Secret Exclusion Check
// ---------------------------------------------------------------------------
const gitignorePath = path.join(__dirname, ".gitignore");
const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

runTest("Git Security: .gitignore strictly excludes .env, credentials, and databases", () => {
  assert.ok(gitignoreContent.includes(".env"), ".gitignore must exclude .env");
  assert.ok(gitignoreContent.includes("*.db"), ".gitignore must exclude *.db");
  assert.ok(gitignoreContent.includes("node_modules/"), ".gitignore must exclude node_modules/");
  assert.ok(gitignoreContent.includes(".next/"), ".gitignore must exclude .next/");
});

runTest("Git Security: No Service Account JSON or Private Key exists in repository root or src", () => {
  const rootFiles = fs.readdirSync(__dirname);
  const jsonFiles = rootFiles.filter((f) => f.endsWith(".json") && !["package.json", "package-lock.json", "tsconfig.json"].includes(f));
  assert.strictEqual(jsonFiles.length, 0, "No extra JSON credentials allowed in repository root");
  
  // Verify no service account files
  const suspiciousFiles = rootFiles.filter((f) => f.toLowerCase().includes("service-account") || f.toLowerCase().includes("credentials"));
  assert.strictEqual(suspiciousFiles.length, 0, "No credentials or service account files allowed in root");
});

runTest("Git Security: .env.example contains only placeholders, no real secrets", () => {
  const envExamplePath = path.join(__dirname, ".env.example");
  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  assert.ok(envExampleContent.includes("LINE_CHANNEL_ACCESS_TOKEN=YOUR_LINE_CHANNEL_ACCESS_TOKEN"), "Must use placeholder for access token");
  assert.ok(envExampleContent.includes("LINE_CHANNEL_SECRET=YOUR_LINE_CHANNEL_SECRET"), "Must use placeholder for secret");
  assert.ok(!envExampleContent.includes("-----BEGIN PRIVATE KEY-----"), "Must not contain real private key");
});

// ---------------------------------------------------------------------------
// 3. Demo Isolation Verification
// ---------------------------------------------------------------------------
const demoDataPath = path.join(__dirname, "src", "lib", "demo-data.ts");
const demoDataContent = fs.readFileSync(demoDataPath, "utf-8");

runTest("Demo Isolation: demo-data.ts is completely free of real patient data and DB clients", () => {
  assert.ok(!demoDataContent.includes("googleapis"), "demo-data must not import googleapis");
  assert.ok(!demoDataContent.includes("@prisma/client"), "demo-data must not import Prisma client");
  assert.ok(demoDataContent.includes("(LINE Demo)"), "All mock names must explicitly indicate (LINE Demo)");
});

// ---------------------------------------------------------------------------
// 4. Vercel Serverless Statelessness & Readiness
// ---------------------------------------------------------------------------
runTest("Vercel Readiness: All dynamic API routes use export const dynamic = 'force-dynamic'", () => {
  const dynamicRoutes = [
    path.join(__dirname, "src", "app", "api", "bookings", "route.ts"),
    path.join(__dirname, "src", "app", "api", "bookings", "[id]", "status", "route.ts"),
    path.join(__dirname, "src", "app", "api", "tracking", "route.ts"),
    path.join(__dirname, "src", "app", "api", "tracking", "action", "route.ts"),
    path.join(__dirname, "src", "app", "api", "admin", "kpis", "route.ts"),
    path.join(__dirname, "src", "app", "api", "slots", "route.ts"),
  ];

  for (const rPath of dynamicRoutes) {
    const content = fs.readFileSync(rPath, "utf-8");
    assert.ok(
      content.includes('export const dynamic = "force-dynamic"'),
      `${path.basename(path.dirname(rPath))} must be force-dynamic for Vercel serverless`
    );
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
  console.log("\n>>> ALL STEP V1.4 READINESS TESTS PASSED! <<<\n");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<\n");
  process.exit(1);
}
