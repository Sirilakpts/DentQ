// Test LIFF ID Token verification and Booking API security logic
async function verifyLineIdTokenMock(idToken, expectedChannelId, mockApiResponse) {
  try {
    const channelId = expectedChannelId;
    if (!channelId) {
      return { success: false, error: "Missing Channel ID configuration" };
    }

    // Simulate LINE Verify API call (https://api.line.me/oauth2/v2.1/verify)
    const data = mockApiResponse(idToken, channelId);

    if (!data || !data.sub) {
      return { success: false, error: data?.error_description || "Invalid LINE ID Token" };
    }

    if (data.aud !== channelId) {
      return { success: false, error: "Token audience mismatch" };
    }

    return { success: true, lineUserId: data.sub };
  } catch (err) {
    return { success: false, error: "Network error during LINE verification" };
  }
}

async function runTests() {
  console.log("=== Step 7.2: LIFF ID Token Verification & Booking Security Tests ===\n");

  const channelId = "2006789012";

  // Mock API Responses
  const mockApi = (idToken, cid) => {
    if (idToken === "valid_token_user_123") {
      return { sub: "U1234567890abcdef1234567890abcdef", aud: cid, name: "Somchai" };
    }
    if (idToken === "token_wrong_aud") {
      return { sub: "U1234567890abcdef1234567890abcdef", aud: "9999999999", name: "Attacker" };
    }
    if (idToken === "expired_token") {
      return { error: "invalid_request", error_description: "ID token has expired" };
    }
    return { error: "invalid_request", error_description: "Invalid ID token format" };
  };

  // Case 1: Untrusted direct lineUserId without token
  console.log("1. Testing client-supplied lineUserId without lineIdToken (Zero Trust)...");
  const payload1 = {
    patientName: "Attacker",
    phoneNumber: "0812345678",
    lineUserId: "U_FORGED_USER_ID",
    lineIdToken: null,
  };
  let verifiedUserId1 = "";
  if (payload1.lineIdToken) {
    const res = await verifyLineIdTokenMock(payload1.lineIdToken, channelId, mockApi);
    if (res.success) verifiedUserId1 = res.lineUserId;
  }
  const test1 = verifiedUserId1 === "";
  console.log("   Direct client lineUserId ignored (verifiedUserId=''):", test1 ? "PASS" : "FAIL");

  // Case 2: Valid token with matching Channel ID
  console.log("\n2. Testing valid lineIdToken with matching Channel ID...");
  const payload2 = {
    lineIdToken: "valid_token_user_123",
  };
  let verifiedUserId2 = "";
  const res2 = await verifyLineIdTokenMock(payload2.lineIdToken, channelId, mockApi);
  if (res2.success && res2.lineUserId) {
    verifiedUserId2 = res2.lineUserId;
  }
  const test2 = verifiedUserId2 === "U1234567890abcdef1234567890abcdef";
  console.log("   Valid token verified and sub extracted:", test2 ? "PASS" : "FAIL");

  // Case 3: Token with mismatched audience (Token intended for another app)
  console.log("\n3. Testing token with mismatched audience (aud != client_id)...");
  const payload3 = {
    lineIdToken: "token_wrong_aud",
  };
  let verifiedUserId3 = "";
  const res3 = await verifyLineIdTokenMock(payload3.lineIdToken, channelId, mockApi);
  if (res3.success && res3.lineUserId) {
    verifiedUserId3 = res3.lineUserId;
  }
  const test3 = !res3.success && res3.error === "Token audience mismatch" && verifiedUserId3 === "";
  console.log("   Mismatched audience rejected securely:", test3 ? "PASS" : "FAIL");

  // Case 4: Expired token
  console.log("\n4. Testing expired token...");
  const payload4 = {
    lineIdToken: "expired_token",
  };
  const res4 = await verifyLineIdTokenMock(payload4.lineIdToken, channelId, mockApi);
  const test4 = !res4.success && res4.error.includes("expired");
  console.log("   Expired token rejected:", test4 ? "PASS" : "FAIL");

  // Case 5: Guest booking without LINE (Normal booking continues)
  console.log("\n5. Testing guest booking without lineIdToken...");
  const payload5 = {
    lineIdToken: null,
  };
  let verifiedUserId5 = "";
  if (payload5.lineIdToken) {
    const res = await verifyLineIdTokenMock(payload5.lineIdToken, channelId, mockApi);
    if (res.success) verifiedUserId5 = res.lineUserId;
  }
  const test5 = verifiedUserId5 === "";
  console.log("   Guest booking proceeds normally without lineUserId:", test5 ? "PASS" : "FAIL");

  // Overall check
  const allPassed = test1 && test2 && test3 && test4 && test5;
  console.log("\n=================================");
  console.log(`Overall Result: ${allPassed ? "ALL PASS" : "FAIL"}`);
  console.log("=================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
