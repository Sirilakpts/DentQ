/**
 * test-line-login-fix-step1.cjs
 * Comprehensive test suite for DentQ — STEP LINE FIX 1: RESTORE LOGIN TO BOOKING FLOW
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let totalTests = 0;
let passedTests = 0;

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

console.log('=========================================================');
console.log('TEST SUITE: STEP LINE FIX 1 RESTORE LOGIN TO BOOKING FLOW');
console.log('=========================================================\n');

// ---------------------------------------------------------------------------
// 1. LIFF State & Rich Menu Routing
// ---------------------------------------------------------------------------
const liffRedirectPath = path.join(__dirname, 'src', 'components', 'LiffRedirect.tsx');
assert.ok(fs.existsSync(liffRedirectPath), 'src/components/LiffRedirect.tsx must exist');
const liffRedirectContent = fs.readFileSync(liffRedirectPath, 'utf8');

runTest('LiffRedirect: Parses liff.state and routes to /book and /tracking', () => {
  assert.ok(
    liffRedirectContent.includes('liff.state') && liffRedirectContent.includes('decodeURIComponent'),
    'Must parse and decode liff.state'
  );
  assert.ok(
    liffRedirectContent.includes('/book'),
    'Must route to /book when target is book'
  );
  assert.ok(
    liffRedirectContent.includes('/tracking'),
    'Must route to /tracking when target is tracking'
  );
});

const homePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const homeContent = fs.readFileSync(homePath, 'utf8');

runTest('Home Page: Embeds LiffRedirect to handle Rich Menu entry points', () => {
  assert.ok(
    homeContent.includes('LiffRedirect'),
    'Home page must import and render LiffRedirect'
  );
  assert.ok(
    homeContent.includes('href="/book"') && homeContent.includes('href="/tracking"'),
    'Home page must provide direct links to /book and /tracking'
  );
});

// ---------------------------------------------------------------------------
// 2. Booking Page LIFF Lifecycle & Login Flow
// ---------------------------------------------------------------------------
const bookPath = path.join(__dirname, 'src', 'app', 'book', 'page.tsx');
const bookContent = fs.readFileSync(bookPath, 'utf8');

runTest('Booking Page: Auto-initializes LIFF if script already loaded on window', () => {
  assert.ok(
    bookContent.includes('(window as any).liff') && bookContent.includes('initLiff()'),
    'Booking page must auto-init LIFF if script is already present on window'
  );
});

runTest('Booking Page: Handles liff.state cross-routing to /tracking', () => {
  assert.ok(
    bookContent.includes('liff.state') && bookContent.includes('tracking'),
    'Booking page must redirect to /tracking if liff.state targets tracking'
  );
});

runTest('Booking Page: liff.login specifies redirectUri to /book', () => {
  assert.ok(
    bookContent.includes('redirectUri') && bookContent.includes('/book'),
    'liff.login must specify redirectUri pointing to /book'
  );
});

runTest('Booking Page: Re-authenticates if already logged in but ID token is expired/null', () => {
  assert.ok(
    bookContent.includes('liff.logout()'),
    'Must support liff.logout() before re-login when session/token expired'
  );
  assert.ok(
    bookContent.includes('liffAuthError'),
    'Must track and display liffAuthError in state'
  );
});

runTest('Booking Page: Does not print or leak raw ID token in console', () => {
  assert.ok(
    !bookContent.includes('console.log(idToken)') &&
    !bookContent.includes('console.log("Token:", idToken)') &&
    !bookContent.includes('console.log(lineIdToken)'),
    'Must NOT print raw ID token'
  );
});

// ---------------------------------------------------------------------------
// 3. Tracking Page LIFF Lifecycle & Login Flow
// ---------------------------------------------------------------------------
const trackingPath = path.join(__dirname, 'src', 'app', 'tracking', 'page.tsx');
const trackingContent = fs.readFileSync(trackingPath, 'utf8');

runTest('Tracking Page: Auto-initializes LIFF if script already loaded on window', () => {
  assert.ok(
    trackingContent.includes('(window as any).liff') && trackingContent.includes('initLiff()'),
    'Tracking page must auto-init LIFF if script is already present on window'
  );
});

runTest('Tracking Page: Handles liff.state cross-routing to /book', () => {
  assert.ok(
    trackingContent.includes('liff.state') && trackingContent.includes('book'),
    'Tracking page must redirect to /book if liff.state targets book'
  );
});

runTest('Tracking Page: liff.login specifies redirectUri to /tracking', () => {
  assert.ok(
    trackingContent.includes('redirectUri') && trackingContent.includes('/tracking'),
    'liff.login must specify redirectUri pointing to /tracking'
  );
});

runTest('Tracking Page: Re-authenticates and shows error if token expired/invalid', () => {
  assert.ok(
    trackingContent.includes('liff.logout()'),
    'Must support liff.logout() before re-login when session/token expired'
  );
  assert.ok(
    trackingContent.includes('liffAuthError'),
    'Must track and display liffAuthError in state'
  );
});

// ---------------------------------------------------------------------------
// 4. Zero Trust & Security Preserved
// ---------------------------------------------------------------------------
runTest('Zero-Trust Security: Token strictly required in Authorization Header', () => {
  assert.ok(
    bookContent.includes('lineIdToken: lineIdToken'),
    'Booking submit must send lineIdToken'
  );
  assert.ok(
    trackingContent.includes('Authorization: `Bearer ${token}`'),
    'Tracking API call must send Bearer token in headers'
  );
  assert.ok(
    bookContent.includes('if (!lineProfile || !lineIdToken)'),
    'Booking stepper must remain gated without profile & token'
  );
});

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP LINE FIX 1 TESTS PASSED! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<');
  process.exit(1);
}
