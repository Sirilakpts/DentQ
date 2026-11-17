/**
 * Test Suite: STEP 2.3 BOOKING API (LINE-FIRST)
 * 
 * Tests with MOCK only (NO real Google Sheets modifications, NO real LINE messages):
 * 1. LINE Authentication: Missing or invalid token -> 401 Rejected
 * 2. Strict Channel ID: Rejects when LINE_LOGIN_CHANNEL_ID does not match audience (No LIFF inference)
 * 3. Zero-Trust: Uses verified sub from token, ignores client-provided lineUserId
 * 4. Optional Phone Number: Empty phone string "" -> Accepted
 * 5. Medical Rights: Supports all 5 values ("บัตรทอง", "ประกันสังคม", "ข้าราชการ", "ชำระเอง", "ไม่แน่ใจ")
 * 6. Emergency Booking Rejection: isEmergency=true -> 400 Rejected
 * 7. Morning Quota: 5 queues -> Accepted
 * 8. Morning Quota: 6 queues -> 409 Rejected ("คิวรอบเช้าสำหรับวันนี้เต็มแล้ว...")
 * 9. Concurrency / Mutex: Concurrent bookings within Mutex guard -> Never exceeds 6 morning queues
 * 10. Afternoon Booking: Can book afternoon (e.g. 13:00) even when morning quota is full (6/6)
 * 11. Response shape: Returns Booking ID and status PENDING (not approved)
 */

const assert = require("assert");

// Simulating the Zod schema and logic from src/app/api/bookings/route.ts
const { z } = require("zod");

const ALLOWED_MEDICAL_RIGHTS = [
  "บัตรทอง",
  "ประกันสังคม",
  "ข้าราชการ",
  "ชำระเอง",
  "ไม่แน่ใจ",
];

function normalizeMedicalRights(val) {
  if (!val) return "";
  const trimmed = String(val).trim();
  const matched = ALLOWED_MEDICAL_RIGHTS.find(
    (item) => item.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || trimmed;
}

const bookingSchema = z.object({
  serviceId: z.string().min(1, "กรุณาเลือกบริการทันตกรรม"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "รูปแบบเวลาไม่ถูกต้อง (HH:mm)"),
  period: z.enum(["MORNING", "AFTERNOON"]).optional(),
  patientName: z.string().min(1, "กรุณากรอกชื่อผู้จอง"),
  phoneNumber: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : ""))
    .refine(
      (val) => val === "" || /^0[689]\d{8}$/.test(val),
      "กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก (เช่น 0812345678) หรือเว้นว่างไว้"
    ),
  nationalIdOrHn: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : "")),
  medicalRights: z
    .string()
    .optional()
    .nullable()
    .transform((val) => normalizeMedicalRights(val)),
  symptoms: z.string().optional().nullable(),
  pdpaAccepted: z.literal(true, {
    errorMap: () => ({ message: "ท่านต้องยินยอมเงื่อนไข PDPA ก่อนดำเนินการจองคิว" }),
  }),
  lineIdToken: z.string().min(1, "กรุณาเข้าสู่ระบบ LINE ก่อนดำเนินการจองคิว"),
  lineUserId: z.string().optional().nullable(),
  isEmergency: z.boolean().optional().default(false),
});

function isMorningTime(timeStr) {
  if (!timeStr) return false;
  const parts = timeStr.trim().split(":");
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return false;
  return hour < 12;
}

function countActiveMorningBookings(bookings) {
  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];
  return bookings.filter((b) => {
    const id = (b.bookingId || b.id || "").toUpperCase();
    if (id.startsWith("TEST-") || id.startsWith("DQ-TEST-") || id.includes("TEST")) return false;
    if (b.isEmergency) return false;
    if (!activeStatuses.includes((b.status || "").toUpperCase())) return false;
    const time = b.bookingTime || b.time || "";
    return isMorningTime(time);
  }).length;
}

async function verifyLineIdTokenMock(idToken, mockVerifyApi) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  if (!channelId) {
    return { success: false, error: "Missing LINE_LOGIN_CHANNEL_ID configuration" };
  }
  return mockVerifyApi(idToken, channelId);
}

// In-Process Mutex simulation
class AsyncMutex {
  constructor() {
    this._queue = Promise.resolve();
  }
  runExclusive(callback) {
    const next = this._queue.then(() => callback());
    this._queue = next.catch(() => {});
    return next;
  }
}

async function simulateBookingPost(body, state, mockVerifyApi) {
  // 1. Schema parse
  const validated = bookingSchema.parse(body);

  // 2. Reject Emergency
  if (validated.isEmergency) {
    return {
      status: 400,
      body: {
        success: false,
        error: "คลินิกไม่เปิดรับการจองคิวฉุกเฉินผ่านระบบออนไลน์ กรุณาติดต่อสายด่วนคลินิก หรือติดต่อที่เคาน์เตอร์ฉุกเฉินโดยตรง",
      },
    };
  }

  // 3. LINE Auth
  const verifyRes = await verifyLineIdTokenMock(validated.lineIdToken.trim(), mockVerifyApi);
  if (!verifyRes.success || !verifyRes.lineUserId) {
    return {
      status: 401,
      body: {
        success: false,
        error: `การยืนยันตัวตน LINE ล้มเหลว (${verifyRes.error || "Invalid Token"}) กรุณาเข้าสู่ระบบ LINE ใหม่อีกครั้ง`,
      },
    };
  }
  const verifiedLineUserId = verifyRes.lineUserId;

  // 4. Mutex-protected execution
  try {
    const result = await state.mutex.runExclusive(async () => {
      const dateBookings = state.sheetBookings.filter((b) => b.bookingDate === validated.date);

      // Morning Quota check
      if (isMorningTime(validated.time)) {
        const morningCount = countActiveMorningBookings(dateBookings);
        if (morningCount >= 6) {
          throw new Error("ขออภัย คิวรอบเช้าสำหรับวันนี้เต็มแล้ว (จำกัดสูงสุด 6 ท่าน)");
        }
      }

      // Slot capacity check (max 2 per slot)
      const slotCount = dateBookings.filter(
        (b) => b.bookingTime === validated.time && !b.isEmergency
      ).length;
      if (slotCount >= 2) {
        throw new Error("ขออภัย คิวในช่วงเวลาดังกล่าวเต็มแล้ว กรุณาเลือกช่วงเวลาอื่น");
      }

      // Append mock booking
      const newId = `DEN-${String(state.sheetBookings.length + 1).padStart(3, "0")}`;
      const newBooking = {
        bookingId: newId,
        patientName: validated.patientName,
        service: "ตรวจทันตกรรม",
        bookingDate: validated.date,
        bookingTime: validated.time,
        status: "PENDING",
        phoneNumber: validated.phoneNumber || "",
        lineUserId: verifiedLineUserId, // Must be verified ID
        isEmergency: false,
        medicalRights: validated.medicalRights || "",
      };
      state.sheetBookings.push(newBooking);

      return {
        id: newId,
        queueNumber: newId,
        status: "PENDING",
        date: validated.date,
        time: validated.time,
        patientName: validated.patientName,
        phoneNumber: validated.phoneNumber || "",
        medicalRights: validated.medicalRights || "",
        lineUserId: verifiedLineUserId,
        isEmergency: false,
      };
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "สร้างการจองคิวสำเร็จ กรุณารอเจ้าหน้าที่ตรวจสอบและยืนยัน",
        booking: result,
      },
    };
  } catch (err) {
    const status = err.message.includes("เต็มแล้ว") ? 409 : 500;
    return {
      status,
      body: { success: false, error: err.message },
    };
  }
}

async function runTests() {
  console.log("=== STEP 2.3: BOOKING API (LINE-FIRST) TEST SUITE ===\n");

  const validChannelId = "2006764516";
  process.env.LINE_LOGIN_CHANNEL_ID = validChannelId;

  const standardVerifyApi = (token, expectedChannel) => {
    if (token === "valid-token-alice") {
      return { success: true, lineUserId: "Ualice123" };
    }
    if (token === "valid-token-bob") {
      return { success: true, lineUserId: "Ubob456" };
    }
    if (token === "mismatched-aud-token") {
      return { success: false, error: "Token audience mismatch" };
    }
    return { success: false, error: "Invalid LINE ID Token" };
  };

  // Test 1: Missing lineIdToken
  console.log("[Test 1] Missing lineIdToken rejection...");
  assert.throws(() => {
    bookingSchema.parse({
      serviceId: "srv-checkup",
      date: "2026-11-20",
      time: "09:00",
      patientName: "Alice",
      pdpaAccepted: true,
      lineIdToken: "", // empty
    });
  }, /กรุณาเข้าสู่ระบบ LINE/);
  console.log("-> PASS: Missing or empty lineIdToken fails schema validation");

  // Test 2: Invalid or expired token -> 401
  console.log("\n[Test 2] Invalid ID Token verification -> 401 Unauthorized...");
  const state1 = { mutex: new AsyncMutex(), sheetBookings: [] };
  const resInvalidToken = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-20",
      time: "09:00",
      patientName: "Hacker",
      pdpaAccepted: true,
      lineIdToken: "fake-expired-token",
    },
    state1,
    standardVerifyApi
  );
  assert.strictEqual(resInvalidToken.status, 401);
  assert.strictEqual(resInvalidToken.body.success, false);
  console.log("-> PASS: Invalid ID Token rejected with 401 Unauthorized");

  // Test 3: Audience mismatch (strict channel ID verification) -> 401
  console.log("\n[Test 3] Audience mismatch -> 401 Unauthorized...");
  const resAudMismatch = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-20",
      time: "09:00",
      patientName: "Alice",
      pdpaAccepted: true,
      lineIdToken: "mismatched-aud-token",
    },
    state1,
    standardVerifyApi
  );
  assert.strictEqual(resAudMismatch.status, 401);
  console.log("-> PASS: Audience mismatch strictly rejected with 401");

  // Test 4: Zero-Trust lineUserId (ignores client-supplied user ID)
  console.log("\n[Test 4] Zero-Trust lineUserId test...");
  const resZeroTrust = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-20",
      time: "09:00",
      patientName: "Alice",
      pdpaAccepted: true,
      lineIdToken: "valid-token-alice",
      lineUserId: "Uhacker_spoofed_id", // Client tries to spoof
    },
    state1,
    standardVerifyApi
  );
  assert.strictEqual(resZeroTrust.status, 200);
  assert.strictEqual(resZeroTrust.body.booking.lineUserId, "Ualice123", "Must use verified sub, not spoofed ID");
  console.log("-> PASS: Server strictly used verified token sub (Ualice123), client spoofed ID ignored");

  // Test 5: Optional Phone Number (empty string stored as "")
  console.log("\n[Test 5] Optional Phone Number test...");
  const resEmptyPhone = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-20",
      time: "09:30",
      patientName: "Alice",
      pdpaAccepted: true,
      lineIdToken: "valid-token-alice",
      phoneNumber: "", // Empty phone
    },
    state1,
    standardVerifyApi
  );
  assert.strictEqual(resEmptyPhone.status, 200);
  assert.strictEqual(resEmptyPhone.body.booking.phoneNumber, "");
  console.log("-> PASS: Booking without phone number succeeded with phoneNumber=\"\"");

  // Test 6: Medical Rights - all 5 supported values
  console.log("\n[Test 6] Testing all 5 Medical Rights values...");
  const slotTimes = ["09:00", "09:30", "10:00", "10:30", "11:00"];
  let rightIdx = 0;
  for (const right of ALLOWED_MEDICAL_RIGHTS) {
    const resRight = await simulateBookingPost(
      {
        serviceId: "srv-checkup",
        date: "2026-11-21",
        time: slotTimes[rightIdx++],
        patientName: "Tester",
        pdpaAccepted: true,
        lineIdToken: "valid-token-alice",
        medicalRights: right,
      },
      state1,
      standardVerifyApi
    );
    assert.strictEqual(resRight.status, 200);
    assert.strictEqual(resRight.body.booking.medicalRights, right);
  }
  console.log("-> PASS: All 5 medical rights values validated and saved successfully");

  // Test 7: Emergency booking online rejection -> 400
  console.log("\n[Test 7] Emergency booking online rejection...");
  const resEmergency = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-20",
      time: "10:00",
      patientName: "Alice",
      pdpaAccepted: true,
      lineIdToken: "valid-token-alice",
      isEmergency: true,
    },
    state1,
    standardVerifyApi
  );
  assert.strictEqual(resEmergency.status, 400);
  assert.strictEqual(resEmergency.body.error.includes("ไม่เปิดรับการจองคิวฉุกเฉินผ่านระบบออนไลน์"), true);
  console.log("-> PASS: isEmergency=true rejected with clear 400 error message");

  // Test 8: Morning Quota 5 bookings -> Allowed; 6 bookings -> 409 Rejected
  console.log("\n[Test 8] Morning Quota 5 allowed, 6th rejection...");
  const stateQuota = { mutex: new AsyncMutex(), sheetBookings: [] };
  // Preload 5 morning bookings on 2026-11-25
  for (let i = 1; i <= 5; i++) {
    stateQuota.sheetBookings.push({
      bookingId: `DEN-00${i}`,
      bookingDate: "2026-11-25",
      bookingTime: `09:${(i - 1) * 30}`.padStart(5, "0"),
      status: "CONFIRMED",
      isEmergency: false,
    });
  }
  // Try 6th booking at 11:30 (slot is empty, morning total will reach 6)
  const res6th = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-25",
      time: "11:30",
      patientName: "User 6",
      pdpaAccepted: true,
      lineIdToken: "valid-token-alice",
    },
    stateQuota,
    standardVerifyApi
  );
  assert.strictEqual(res6th.status, 200, "6th morning booking should succeed");

  // Try 7th morning booking (morning total is already 6)
  const res7th = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-25",
      time: "11:00",
      patientName: "User 7",
      pdpaAccepted: true,
      lineIdToken: "valid-token-alice",
    },
    stateQuota,
    standardVerifyApi
  );
  assert.strictEqual(res7th.status, 409, "7th morning booking must be rejected with 409");
  assert.strictEqual(res7th.body.error.includes("คิวรอบเช้าสำหรับวันนี้เต็มแล้ว"), true);
  console.log("-> PASS: 6th booking allowed, 7th rejected with 409 Quota Exceeded");

  // Test 9: Concurrency Guard with Mutex
  console.log("\n[Test 9] Concurrency / Race Condition test with Mutex...");
  const stateConcurrent = { mutex: new AsyncMutex(), sheetBookings: [] };
  // Preload 5 morning bookings
  for (let i = 1; i <= 5; i++) {
    stateConcurrent.sheetBookings.push({
      bookingId: `DEN-10${i}`,
      bookingDate: "2026-11-26",
      bookingTime: `09:00`,
      status: "CONFIRMED",
      isEmergency: false,
    });
  }
  // Fire 5 concurrent booking requests for remaining 1 morning slot
  const concurrentPromises = [1, 2, 3, 4, 5].map((idx) =>
    simulateBookingPost(
      {
        serviceId: "srv-checkup",
        date: "2026-11-26",
        time: "11:30",
        patientName: `Concurrent User ${idx}`,
        pdpaAccepted: true,
        lineIdToken: "valid-token-bob",
      },
      stateConcurrent,
      standardVerifyApi
    )
  );
  const concurrentResults = await Promise.all(concurrentPromises);
  const successCount = concurrentResults.filter((r) => r.status === 200).length;
  const rejectedCount = concurrentResults.filter((r) => r.status === 409).length;
  assert.strictEqual(successCount, 1, "Exactly 1 concurrent request must succeed");
  assert.strictEqual(rejectedCount, 4, "Remaining 4 concurrent requests must be rejected");
  const finalMorningBookings = stateConcurrent.sheetBookings.filter(
    (b) => b.bookingDate === "2026-11-26" && isMorningTime(b.bookingTime)
  );
  assert.strictEqual(finalMorningBookings.length, 6, "Morning total must strictly equal 6");
  console.log("-> PASS: Out of 5 concurrent requests, exactly 1 succeeded, 4 rejected. Total = 6/6 strictly preserved");

  // Test 10: Afternoon Booking unaffected when morning is full
  console.log("\n[Test 10] Afternoon booking allowed when morning is full...");
  const resAfternoon = await simulateBookingPost(
    {
      serviceId: "srv-checkup",
      date: "2026-11-25", // Morning is already full on this date (6/6)
      time: "13:30",
      patientName: "Afternoon Patient",
      pdpaAccepted: true,
      lineIdToken: "valid-token-alice",
    },
    stateQuota,
    standardVerifyApi
  );
  assert.strictEqual(resAfternoon.status, 200, "Afternoon booking must succeed even when morning is full");
  console.log("-> PASS: Afternoon booking succeeded while morning quota is full");

  // Test 11: Response Status Truthfulness
  console.log("\n[Test 11] API Response status truthfulness...");
  assert.strictEqual(resAfternoon.body.booking.status, "PENDING");
  assert.strictEqual(resAfternoon.body.booking.isEmergency, false);
  console.log("-> PASS: Booking status is truthfully PENDING and isEmergency=false");

  console.log("\n=== ALL STEP 2.3 TESTS PASSED (11/11) ===");
}

runTests();
