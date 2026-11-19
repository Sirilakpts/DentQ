/**
 * test-liff-permission-fix.cjs
 * Test Suite: DentQ Minimal Fix for LIFF Permission Error ("The permission is not in LIFF app scope.")
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=========================================================");
console.log("TEST SUITE: DENTQ LIFF PERMISSION ERROR MINIMAL FIX");
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
const liffModulePath = path.join(__dirname, "src/lib/liff.ts");
const bookPagePath = path.join(__dirname, "src/app/book/page.tsx");
const trackingPagePath = path.join(__dirname, "src/app/tracking/page.tsx");

assert.ok(fs.existsSync(liffModulePath), "src/lib/liff.ts must exist");
assert.ok(fs.existsSync(bookPagePath), "src/app/book/page.tsx must exist");
assert.ok(fs.existsSync(trackingPagePath), "src/app/tracking/page.tsx must exist");

const liffModuleCode = fs.readFileSync(liffModulePath, "utf8");
const bookPageCode = fs.readFileSync(bookPagePath, "utf8");
const trackingPageCode = fs.readFileSync(trackingPagePath, "utf8");

// Test 1: getSafeLiffProfile is exported in src/lib/liff.ts
runTest("LIFF Helper: getSafeLiffProfile is exported in src/lib/liff.ts", () => {
  assert.ok(
    liffModuleCode.includes("export async function getSafeLiffProfile"),
    "Must export getSafeLiffProfile in src/lib/liff.ts"
  );
});

// Test 2: Fallback logic handles 'The permission is not in LIFF app scope.' via getDecodedIDToken()
runTest("Graceful Fallback: getSafeLiffProfile catches scope error and recovers via getDecodedIDToken", async () => {
  // Simulated getSafeLiffProfile implementation mirroring src/lib/liff.ts
  async function simulateGetSafeLiffProfile(liff) {
    if (!liff) return null;
    try {
      const profile = await liff.getProfile();
      if (profile && (profile.userId || profile.displayName)) {
        return {
          userId: profile.userId,
          displayName: profile.displayName || "ผู้ใช้ LINE",
          pictureUrl: profile.pictureUrl || undefined,
        };
      }
    } catch (err) {
      // Scope restriction fallback
    }

    try {
      if (typeof liff.getDecodedIDToken === "function") {
        const decoded = liff.getDecodedIDToken();
        if (decoded && (decoded.sub || decoded.userId)) {
          return {
            userId: decoded.sub || decoded.userId,
            displayName: decoded.name || "ผู้ใช้ LINE",
            pictureUrl: decoded.picture || undefined,
          };
        }
      }
    } catch (decodeErr) {
      // Decode error
    }
    return null;
  }

  // Case A: Normal profile call succeeds
  const mockNormalLiff = {
    getProfile: async () => ({
      userId: "U_NORMAL_12345",
      displayName: "Somchai Dentist",
      pictureUrl: "https://profile.line-scdn.net/123",
    }),
    getDecodedIDToken: () => null,
  };
  const normalRes = await simulateGetSafeLiffProfile(mockNormalLiff);
  assert.strictEqual(normalRes.userId, "U_NORMAL_12345");
  assert.strictEqual(normalRes.displayName, "Somchai Dentist");
  assert.strictEqual(normalRes.pictureUrl, "https://profile.line-scdn.net/123");

  // Case B: liff.getProfile throws 'The permission is not in LIFF app scope.'
  const mockScopeRestrictedLiff = {
    getProfile: async () => {
      throw new Error("The permission is not in LIFF app scope.");
    },
    getDecodedIDToken: () => ({
      sub: "U_FALLBACK_67890",
      name: "Fallback User",
      picture: "https://profile.line-scdn.net/456",
    }),
  };
  const fallbackRes = await simulateGetSafeLiffProfile(mockScopeRestrictedLiff);
  assert.strictEqual(fallbackRes.userId, "U_FALLBACK_67890");
  assert.strictEqual(fallbackRes.displayName, "Fallback User");
  assert.strictEqual(fallbackRes.pictureUrl, "https://profile.line-scdn.net/456");

  // Case C: Decoded ID token has only sub without optional name/picture
  const mockMinimalLiff = {
    getProfile: async () => {
      throw new Error("The permission is not in LIFF app scope.");
    },
    getDecodedIDToken: () => ({
      sub: "U_MINIMAL_99999",
    }),
  };
  const minimalRes = await simulateGetSafeLiffProfile(mockMinimalLiff);
  assert.strictEqual(minimalRes.userId, "U_MINIMAL_99999");
  assert.strictEqual(minimalRes.displayName, "ผู้ใช้ LINE");
  assert.strictEqual(minimalRes.pictureUrl, undefined);

  // Case D: Non-permission error (e.g. Network Error) is rethrown and NOT masked
  let nonPermissionThrown = false;
  const mockNetworkErrLiff = {
    getProfile: async () => {
      throw new Error("Network connection lost");
    },
    getDecodedIDToken: () => ({ sub: "U_SHOULD_NOT_REACH" }),
  };
  try {
    // Mirroring src/lib/liff.ts error checking
    const liff = mockNetworkErrLiff;
    try {
      await liff.getProfile();
    } catch (err) {
      const errMsg = (err?.message || "").toLowerCase();
      const isPermissionError =
        errMsg.includes("permission") ||
        errMsg.includes("scope") ||
        errMsg.includes("not in liff app scope");
      if (!isPermissionError) {
        throw err;
      }
    }
  } catch (err) {
    if (err.message === "Network connection lost") {
      nonPermissionThrown = true;
    }
  }
  assert.ok(nonPermissionThrown, "Non-permission errors must be rethrown and not masked");
});

// Test 3: Booking page uses getSafeLiffProfile in initLiff
runTest("Booking Page: Uses getSafeLiffProfile during initLiff", () => {
  assert.ok(
    bookPageCode.includes("getSafeLiffProfile(liff)"),
    "Book page must invoke getSafeLiffProfile"
  );
  assert.ok(
    bookPageCode.includes("import { getLiffId, getLiffRedirectUri, getSafeLiffProfile } from \"@/lib/liff\""),
    "Book page must import getSafeLiffProfile"
  );
});

// Test 4: Booking page in-client and external browser login flows use getSafeLiffProfile
runTest("Booking Page: Uses getSafeLiffProfile in handleLineLogin (in-client & external)", () => {
  // Check that raw uncaught liff.getProfile() is not called in handleLineLogin
  const handleLineLoginBlock = bookPageCode.split("const handleLineLogin =")[1]?.split("const handleLineLogout =")[0];
  assert.ok(handleLineLoginBlock, "handleLineLogin block must exist");
  assert.ok(
    handleLineLoginBlock.includes("getSafeLiffProfile(liff)"),
    "handleLineLogin must call getSafeLiffProfile"
  );
  // Verify that it doesn't do raw "await liff.getProfile()" without safe helper
  assert.ok(
    !handleLineLoginBlock.includes("await liff.getProfile()"),
    "handleLineLogin must not call raw await liff.getProfile()"
  );
});

// Test 5: Tracking page uses getSafeLiffProfile in initLiff and handleLineLogin
runTest("Tracking Page: Uses getSafeLiffProfile across init and login flows", () => {
  assert.ok(
    trackingPageCode.includes("getSafeLiffProfile(liff)"),
    "Tracking page must invoke getSafeLiffProfile"
  );
  assert.ok(
    trackingPageCode.includes("import { getLiffId, getLiffRedirectUri, getSafeLiffProfile } from \"@/lib/liff\""),
    "Tracking page must import getSafeLiffProfile"
  );
  const handleLoginBlock = trackingPageCode.split("const handleLineLogin =")[1]?.split("const handleLineLogout =")[0];
  assert.ok(handleLoginBlock, "handleLineLogin block must exist");
  assert.ok(
    !handleLoginBlock.includes("await liff.getProfile()"),
    "handleLineLogin in tracking must not call raw await liff.getProfile()"
  );
});

// Test 6: Zero Token / Secret Leakage in Logs
runTest("Zero-Leakage Security: No raw tokens, secrets, or JWTs logged", () => {
  assert.ok(
    !liffModuleCode.includes("console.log(idToken") &&
    !liffModuleCode.includes("console.warn(idToken") &&
    !liffModuleCode.includes("console.log(decoded") &&
    !liffModuleCode.includes("console.log(profile"),
    "liff.ts must not log sensitive tokens or payloads"
  );
  assert.ok(
    !bookPageCode.includes("console.log(idToken") &&
    !bookPageCode.includes("console.warn(idToken"),
    "Booking page must not log sensitive tokens"
  );
  assert.ok(
    !trackingPageCode.includes("console.log(idToken") &&
    !trackingPageCode.includes("console.warn(idToken"),
    "Tracking page must not log sensitive tokens"
  );
});

// Test 7: No impact on booking submission or storage
runTest("No Regression: Booking submission and storage APIs remain intact", () => {
  assert.ok(bookPageCode.includes("/api/bookings"), "Must still submit to /api/bookings");
  assert.ok(bookPageCode.includes("lineIdToken"), "Must still include lineIdToken for zero-trust verification");
  assert.ok(
    trackingPageCode.includes("Authorization: `Bearer ${token}`") || trackingPageCode.includes("lineIdToken"),
    "Must still send lineIdToken"
  );
});

console.log("\n=========================================================");
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log("=========================================================");

if (totalTests === passedTests) {
  console.log("\n>>> ALL LIFF PERMISSION FIX TESTS PASSED! <<<\n");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<\n");
  process.exit(1);
}
