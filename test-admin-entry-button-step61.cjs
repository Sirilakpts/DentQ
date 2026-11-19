/**
 * test-admin-entry-button-step61.cjs
 * Comprehensive test suite verifying STEP 6.1: Minimal Admin Entry Button
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: STEP 6.1 MINIMAL ADMIN ENTRY BUTTON");
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

const navbarCode = fs.readFileSync(path.join(__dirname, "src/components/Navbar.tsx"), "utf8");
const middlewareCode = fs.readFileSync(path.join(__dirname, "src/middleware.ts"), "utf8");
const loginPageCode = fs.readFileSync(path.join(__dirname, "src/app/login/page.tsx"), "utf8");
const homePageCode = fs.readFileSync(path.join(__dirname, "src/app/page.tsx"), "utf8");

// Test 1: Staff button exists in Desktop Navigation
runTest("Desktop Header: 'สำหรับเจ้าหน้าที่' button exists and links to /login", () => {
  assert(navbarCode.includes('href="/login"'), "Navbar must contain link to /login");
  assert(navbarCode.includes("สำหรับเจ้าหน้าที่"), "Navbar must contain text 'สำหรับเจ้าหน้าที่'");
  assert(navbarCode.includes("Lock"), "Navbar must import and use Lock icon");
});

// Test 2: Mobile Header Action preserves both citizen actions (เช็กคิว และ จองคิว)
runTest("Mobile Header Action: Preserves both citizen actions (เช็กคิว และ จองคิว) 100%", () => {
  const mobileActionIdx = navbarCode.indexOf("Mobile Header Action");
  assert(mobileActionIdx !== -1, "Navbar must contain Mobile Header Action section");
  const mobileSection = navbarCode.substring(mobileActionIdx, navbarCode.indexOf("Mobile Sub Navigation"));
  assert(mobileSection.includes('เช็กคิว'), "Mobile header must preserve 'เช็กคิว'");
  assert(mobileSection.includes('จองคิว'), "Mobile header must preserve 'จองคิว'");
  assert(mobileSection.includes('href="/tracking"'), "Mobile header must link to /tracking");
  assert(mobileSection.includes('href="/book"'), "Mobile header must link to /book");
});

// Test 2.1: Mobile Secondary Entry: Staff button placed in secondary strip without crowding header
runTest("Mobile Secondary Entry: Staff button exists in dedicated secondary strip without crowding header", () => {
  assert(navbarCode.includes("Mobile Staff Secondary Entry Strip"), "Navbar must contain Mobile Staff Secondary Entry Strip");
  const secondaryStripIdx = navbarCode.indexOf("Mobile Staff Secondary Entry Strip");
  const secondarySection = navbarCode.substring(secondaryStripIdx);
  assert(secondarySection.includes('href="/login"'), "Mobile secondary strip must link to /login");
  assert(secondarySection.includes("สำหรับเจ้าหน้าที่"), "Mobile secondary strip must display 'สำหรับเจ้าหน้าที่'");
  assert(secondarySection.includes("Lock"), "Mobile secondary strip must use Lock icon");
});

// Test 3: Conditioning on pathname === "/"
runTest("Scoping: Staff button is conditioned on pathname === '/' to avoid cluttering booking/tracking", () => {
  assert(navbarCode.includes('pathname === "/"'), "Button must be conditioned on home page pathname");
});

// Test 4: Styling compliance (#063466 navy, white, minimal)
runTest("Styling: Button uses #063466 navy tone and understated minimal secondary style", () => {
  assert(navbarCode.includes("#063466"), "Button must use navy #063466");
  assert(navbarCode.includes("bg-white"), "Button must use white background to be less prominent than primary booking button");
  assert(navbarCode.includes("border-slate-200"), "Button must have subtle border");
});

// Test 5: Route integrity - Links to actual existing /login route without inventing new routes
runTest("Route Integrity: /login is verified existing route and backed by /api/admin/login", () => {
  assert(fs.existsSync(path.join(__dirname, "src/app/login/page.tsx")), "/login page must physically exist");
  assert(fs.existsSync(path.join(__dirname, "src/app/api/admin/login/route.ts")), "/api/admin/login route must physically exist");
  assert(loginPageCode.includes("/api/admin/login"), "Login page must post to /api/admin/login");
});

// Test 6: Authentication Guard - Middleware continues to protect /admin
runTest("Auth Security: Middleware strictly protects /admin routes against unauthenticated access", () => {
  assert(middlewareCode.includes('pathname.startsWith("/admin")'), "Middleware must intercept /admin");
  assert(middlewareCode.includes('cookies.get("admin_session")'), "Middleware must verify admin_session cookie");
  assert(middlewareCode.includes('NextResponse.redirect(loginUrl)'), "Unauthenticated requests must be redirected to /login");
});

// Test 7: Public booking and tracking links remain untouched
runTest("Zero Regression: Citizen links (/, /book, /tracking) remain fully functional", () => {
  assert(navbarCode.includes('href="/"'), "Navbar must have /");
  assert(navbarCode.includes('href="/book"'), "Navbar must have /book");
  assert(navbarCode.includes('href="/tracking"'), "Navbar must have /tracking");
  assert(homePageCode.includes('href="/book"'), "Home page must have /book");
  assert(homePageCode.includes('href="/tracking"'), "Home page must have /tracking");
});

// Test 8: Zero external or production redirects
runTest("Isolation: No external domains or production URLs used for navigation", () => {
  assert(!navbarCode.includes("https://dent-q.vercel.app"), "Navbar must not hardcode production URLs");
  assert(!navbarCode.includes("q-dentist.clinic/login"), "Navbar must not hardcode external domain for login");
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${total - passed}`);
console.log("=========================================================\n");

if (passed === total) {
  console.log(">>> ALL STEP 6.1 ADMIN ENTRY BUTTON TESTS PASSED! <<<\n");
} else {
  process.exit(1);
}
