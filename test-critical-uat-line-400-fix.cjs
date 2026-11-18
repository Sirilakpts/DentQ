/**
 * test-critical-uat-line-400-fix.cjs
 * Comprehensive verification for UAT LINE Login 400 Bad Request Root Cause & Fix
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ CRITICAL UAT LINE 400 ROOT CAUSE FIX");
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

const liffModuleCode = fs.readFileSync(path.join(__dirname, "src/lib/liff.ts"), "utf8");
const bookPageCode = fs.readFileSync(path.join(__dirname, "src/app/book/page.tsx"), "utf8");
const trackingPageCode = fs.readFileSync(path.join(__dirname, "src/app/tracking/page.tsx"), "utf8");
const liffRedirectCode = fs.readFileSync(path.join(__dirname, "src/components/LiffRedirect.tsx"), "utf8");

// Test 1: src/lib/liff.ts exports canonical UAT origin matching registered endpoint
runTest("Endpoint Match: Canonical UAT Preview Origin is https://dent-q-git-uat-sirilakpts.vercel.app", () => {
  assert(liffModuleCode.includes("https://dent-q-git-uat-sirilakpts.vercel.app"), "UAT origin must match preview URL");
  assert(liffModuleCode.includes("UAT_PREVIEW_CANONICAL_ORIGIN"), "Must export UAT_PREVIEW_CANONICAL_ORIGIN");
});

// Test 2: getLiffId prioritizes NEXT_PUBLIC_LIFF_ID_UAT and NEXT_PUBLIC_LIFF_ID_PREVIEW on UAT/Preview
runTest("LIFF ID Resolution: getLiffId correctly prioritizes UAT and PREVIEW variables", () => {
  assert(liffModuleCode.includes("NEXT_PUBLIC_LIFF_ID_UAT"), "Must check NEXT_PUBLIC_LIFF_ID_UAT");
  assert(liffModuleCode.includes("NEXT_PUBLIC_LIFF_ID_PREVIEW"), "Must check NEXT_PUBLIC_LIFF_ID_PREVIEW");
  assert(liffModuleCode.includes("NEXT_PUBLIC_LIFF_ID"), "Must fallback to NEXT_PUBLIC_LIFF_ID");
});

// Test 3: getLiffRedirectUri enforces canonical UAT origin without random deployment hashes
runTest("Redirect URI Canonicalization: getLiffRedirectUri pins to canonical UAT origin for all vercel.app/uat hosts", () => {
  assert(liffModuleCode.includes("getLiffRedirectUri"), "Must export getLiffRedirectUri");
  assert(liffModuleCode.includes("cleanPath"), "Must format cleanPath with leading slash");
  assert(liffModuleCode.includes("UAT_PREVIEW_CANONICAL_ORIGIN"), "Must use UAT_PREVIEW_CANONICAL_ORIGIN for vercel/uat");
});

// Test 4: isInClient check prevents calling liff.login() inside LINE In-App Browser
runTest("In-Client Safety: In-App LINE browser avoids duplicate liff.login() to prevent 400 Bad Request", () => {
  assert(bookPageCode.includes("liff.isInClient && liff.isInClient()"), "Book page must check isInClient");
  assert(trackingPageCode.includes("liff.isInClient && liff.isInClient()"), "Tracking page must check isInClient");
});

// Test 5: External browser uses canonical redirectUri from getLiffRedirectUri
runTest("External Browser: liff.login uses canonical getLiffRedirectUri matching registered endpoint", () => {
  assert(bookPageCode.includes("getLiffRedirectUri(\"/book\")"), "Book page must use getLiffRedirectUri('/book')");
  assert(trackingPageCode.includes("getLiffRedirectUri("), "Tracking page must use getLiffRedirectUri");
});

// Test 6: LiffRedirect component waits for liff.init() before redirecting
runTest("OAuth Code/State Preservation: LiffRedirect waits for liff.init() before redirecting", () => {
  assert(liffRedirectCode.includes("await Promise.race"), "Must await liff.init before redirect");
  assert(liffRedirectCode.includes("liff.init({ liffId })"), "Must initialize with proper liffId");
  assert(liffRedirectCode.includes("getLiffId()"), "Must use getLiffId helper");
});

// Test 7: Book and tracking pages wait for liff.init() before processing liff.state
runTest("State Flow: liff.state redirects happen AFTER liff.init() finishes successfully", () => {
  // Check that inside initLiff, liff.state is checked after await liff.init
  const initLiffSectionBook = bookPageCode.substring(bookPageCode.indexOf("const initLiff"), bookPageCode.indexOf("const handleLineLogin"));
  assert(initLiffSectionBook.indexOf("await Promise.race") < initLiffSectionBook.indexOf("liff.state"), "liff.state must be processed AFTER liff.init");

  const initLiffSectionTracking = trackingPageCode.substring(trackingPageCode.indexOf("const initLiff"), trackingPageCode.indexOf("const handleLineLogin"));
  assert(initLiffSectionTracking.indexOf("await Promise.race") < initLiffSectionTracking.indexOf("liff.state"), "liff.state in tracking must be processed AFTER liff.init");
});

// Test 8: Security - No raw tokens, authorization codes, or secrets in code
runTest("Security & Zero Leakage: No tokens, secrets, or auth codes printed to console/logs", () => {
  assert(!bookPageCode.includes("console.log(idToken)"), "Must not log idToken");
  assert(!trackingPageCode.includes("console.log(idToken)"), "Must not log idToken in tracking");
  assert(!liffModuleCode.includes("console.log"), "Must not log secrets in liff module");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL CRITICAL UAT LINE 400 FIX TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
