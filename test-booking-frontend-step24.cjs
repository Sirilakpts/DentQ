/**
 * test-booking-frontend-step24.cjs
 * Comprehensive test suite for DentQ Step 2.4: LINE-First Booking Frontend
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=================================================");
console.log("TEST SUITE: STEP 2.4 LINE-FIRST BOOKING FRONTEND");
console.log("=================================================\n");

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

const bookingPagePath = path.join(__dirname, "src", "app", "book", "page.tsx");
assert.ok(fs.existsSync(bookingPagePath), "src/app/book/page.tsx must exist");
const pageContent = fs.readFileSync(bookingPagePath, "utf-8");

// Test 1: Gate Screen enforces LINE Login and has NO Guest Mode
runTest("Enforce LINE Login Gate and NO Guest Mode", () => {
  assert.ok(
    pageContent.includes("if (!lineProfile || !lineIdToken)"),
    "Must gate the booking wizard when not logged in with LINE"
  );
  assert.ok(
    pageContent.includes("เข้าสู่ระบบด้วย LINE เพื่อเริ่มจองคิว"),
    "Must have prominent LINE Login button"
  );
  assert.ok(
    pageContent.includes("ไม่มี Guest Mode") || pageContent.includes("ไม่มี Guest mode"),
    "Must explicitly state or enforce no guest mode"
  );
  assert.ok(
    !pageContent.includes("กรณีไม่เชื่อมต่อ LINE: ท่านยังสามารถจองคิวได้ตามปกติ"),
    "Old guest mode fallback banner must be removed"
  );
});

// Test 2: Reuse existing LIFF SDK without creating new login app
runTest("LIFF SDK setup and token handling", () => {
  assert.ok(
    pageContent.includes("https://static.line-scdn.net/liff/edge/2/sdk.js"),
    "Must use official LIFF SDK script"
  );
  assert.ok(
    pageContent.includes("process.env.NEXT_PUBLIC_LIFF_ID"),
    "Must reuse NEXT_PUBLIC_LIFF_ID"
  );
  assert.ok(
    pageContent.includes("liff.getIDToken()"),
    "Must fetch idToken using liff.getIDToken()"
  );
  assert.ok(
    pageContent.includes("liff.getProfile()"),
    "Must fetch profile using liff.getProfile()"
  );
});

// Test 3: Display verified LINE Profile name and avatar
runTest("Display verified LINE Profile name and avatar", () => {
  assert.ok(
    pageContent.includes("lineProfile.displayName"),
    "Must display LINE displayName"
  );
  assert.ok(
    pageContent.includes("lineProfile.pictureUrl"),
    "Must render LINE pictureUrl if available"
  );
  assert.ok(
    pageContent.includes("ยืนยันตัวตนผ่าน LINE แล้ว"),
    "Must show verified LINE status badge"
  );
});

// Test 4: National ID and HN input fields are completely removed
runTest("NO National ID or HN input fields in UI", () => {
  assert.ok(
    !pageContent.includes('placeholder="เลขบัตรประชาชน 13 หลัก"'),
    "National ID input field placeholder must be removed"
  );
  assert.ok(
    !pageContent.includes("เลขประจำตัวประชาชน 13 หลัก"),
    "National ID label must be removed"
  );
  assert.ok(
    pageContent.includes('nationalIdOrHn: ""'),
    "Payload must send empty string for nationalIdOrHn"
  );
});

// Test 5: NO toggle for LINE notification (strictly automatic)
runTest("NO toggle for LINE notification (automatic)", () => {
  assert.ok(
    pageContent.includes("ระบบจะส่งบัตรคิวและการแจ้งเตือนอัตโนมัติผ่าน LINE"),
    "Must display automated LINE notification notice"
  );
  assert.ok(
    !pageContent.includes("ต้องการรับการแจ้งเตือนผ่าน LINE หรือไม่"),
    "Must not have toggle to disable LINE notification"
  );
});

// Test 6: NO online emergency booking option
runTest("NO online emergency booking option", () => {
  assert.ok(
    pageContent.includes("isEmergency: false"),
    "Payload must explicitly set isEmergency to false"
  );
  assert.ok(
    !pageContent.includes("จองคิวฉุกเฉิน"),
    "Must not provide emergency booking checkbox or option in UI"
  );
});

// Test 7: Toothache Walk-in Guidance notice
runTest("Toothache Walk-in Guidance notice", () => {
  assert.ok(
    pageContent.includes("คำแนะนำกรณีปวดฟันเร่งด่วน:"),
    "Must have toothache guidance headline"
  );
  assert.ok(
    pageContent.includes("Walk-in เพื่อรับการคัดกรองอาการ"),
    "Must mention walk-in for triage"
  );
  assert.ok(
    pageContent.includes("ไม่การันตีว่าจะได้รับการทำหัตถการทันที"),
    "Must clearly state immediate treatment is not guaranteed"
  );
});

// Test 8: Red-flag critical symptoms warning
runTest("Red-flag critical symptoms warning (1669 / ER)", () => {
  assert.ok(
    pageContent.includes("Red-Flag Symptoms") || pageContent.includes("อาการวิกฤต"),
    "Must have red-flag symptoms alert"
  );
  assert.ok(
    pageContent.includes("1669"),
    "Must advise calling 1669 or visiting ER for critical symptoms"
  );
  assert.ok(
    pageContent.includes("หายใจลำบาก") || pageContent.includes("กลืนลำบาก"),
    "Must list red-flag examples like difficulty breathing/swallowing"
  );
});

// Test 9: Medical Rights selector contains all 5 standard options
runTest("Medical Rights selector contains 5 standard options", () => {
  const expectedRights = ["บัตรทอง", "ประกันสังคม", "ข้าราชการ", "ชำระเอง", "ไม่แน่ใจ"];
  for (const r of expectedRights) {
    assert.ok(
      pageContent.includes(`"${r}"`),
      `Medical rights options must include ${r}`
    );
  }
  assert.ok(
    pageContent.includes("selectedMedicalRights"),
    "Must manage selectedMedicalRights state"
  );
});

// Test 10: Phone number is Optional
runTest("Phone number is optional in UI and payload", () => {
  assert.ok(
    pageContent.includes("Optional") || pageContent.includes("ไม่บังคับ"),
    "Phone number must be clearly labeled as Optional"
  );
  assert.ok(
    pageContent.includes("cleanPhone || \"\""),
    "Payload must send empty string if phone is not provided"
  );
});

// Test 11: Digital Ticket displays Queue Number / ID and status PENDING
runTest("Digital Ticket displays Queue Number and status PENDING", () => {
  assert.ok(
    pageContent.includes("Q-DENTIST DIGITAL TICKET"),
    "Digital ticket header must be present"
  );
  assert.ok(
    pageContent.includes("รอเจ้าหน้าที่ตรวจสอบ (PENDING)"),
    "Status badge must say รอเจ้าหน้าที่ตรวจสอบ (PENDING)"
  );
  assert.ok(
    pageContent.includes("createdBooking.queueNumber || createdBooking.id"),
    "Must display queueNumber or ID"
  );
  assert.ok(
    pageContent.includes("createdBooking.medicalRights"),
    "Must display medical rights on digital ticket"
  );
});

// Test 12: Error handling displays friendly message and does NOT show ticket
runTest("Error handling displays friendly message without showing ticket", () => {
  assert.ok(
    pageContent.includes("if (!res.ok || !data.success)"),
    "Must check response ok and success"
  );
  assert.ok(
    pageContent.includes("setBookingError(err.message"),
    "Must set bookingError on failure"
  );
  assert.ok(
    pageContent.includes("{bookingError && ("),
    "Must display bookingError banner in UI"
  );
  assert.ok(
    pageContent.includes("step === 4 && createdBooking"),
    "Ticket step 4 must only render when createdBooking is truthy"
  );
});

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log("=================================================");

if (passedTests === totalTests) {
  console.log("✅ ALL STEP 2.4 TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("❌ SOME TESTS FAILED!");
  process.exit(1);
}
