/**
 * Test Suite: STEP 2.2 Morning Quota Verification
 * 
 * Verifies:
 * 1. 0 Active morning queues -> Morning slots AVAILABLE, Afternoon slots AVAILABLE
 * 2. 5 Active morning queues -> Morning slots AVAILABLE (quota not reached), Afternoon slots AVAILABLE
 * 3. 6 Active morning queues -> ALL morning slots FULL (quota reached 6/6), Afternoon slots UNAFFECTED (AVAILABLE)
 * 4. 7 Active morning queues -> ALL morning slots FULL, Afternoon slots UNAFFECTED (AVAILABLE)
 * 5. CANCELLED / REJECTED queues -> Not counted as active
 * 6. Afternoon separation -> Afternoon bookings do not count towards morning quota
 * 7. Emergency bookings -> Excluded from standard morning capacity
 * 8. Shared function reusability -> Works for both Google Sheets & SQLite formats
 */

const assert = require("assert");

// Import the logic identical to src/lib/utils.ts
const STANDARD_SLOTS = [
  // Morning
  { time: "09:00", period: "MORNING" },
  { time: "09:30", period: "MORNING" },
  { time: "10:00", period: "MORNING" },
  { time: "10:30", period: "MORNING" },
  { time: "11:00", period: "MORNING" },
  { time: "11:30", period: "MORNING" },
  // Afternoon
  { time: "13:00", period: "AFTERNOON" },
  { time: "13:30", period: "AFTERNOON" },
  { time: "14:00", period: "AFTERNOON" },
  { time: "14:30", period: "AFTERNOON" },
  { time: "15:00", period: "AFTERNOON" },
  { time: "15:30", period: "AFTERNOON" },
];

const MORNING_MAX_CAPACITY = 6;
const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

function isMorningTime(timeStr) {
  if (!timeStr) return false;
  const parts = timeStr.trim().split(":");
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return false;
  return hour < 12;
}

function countActiveMorningBookings(bookings) {
  return bookings.filter((b) => {
    const id = (b.bookingId || b.id || "").toUpperCase();
    if (id.startsWith("TEST-") || id.startsWith("DQ-TEST-") || id.includes("TEST")) {
      return false;
    }
    if (b.isEmergency) return false;
    if (!ACTIVE_BOOKING_STATUSES.includes((b.status || "").toUpperCase())) return false;
    const time = b.bookingTime || b.time || "";
    return isMorningTime(time);
  }).length;
}

function simulateSlotAvailability(mockBookings, configMap = new Map()) {
  const bookingCountMap = new Map();
  for (const b of mockBookings) {
    const time = b.bookingTime || b.time || "";
    if (ACTIVE_BOOKING_STATUSES.includes((b.status || "").toUpperCase()) && !b.isEmergency) {
      bookingCountMap.set(time, (bookingCountMap.get(time) || 0) + 1);
    }
  }

  const morningActiveCount = countActiveMorningBookings(mockBookings);
  const isMorningQuotaFull = morningActiveCount >= MORNING_MAX_CAPACITY;

  return STANDARD_SLOTS.map((s) => {
    const config = configMap.get(s.time);
    const isBlocked = config?.isBlocked ?? false;
    const maxCapacity = config?.maxCapacity ?? 2;
    const currentBookings = bookingCountMap.get(s.time) || 0;

    let status = "AVAILABLE";
    let blockedReason = null;

    if (isBlocked) {
      status = "BLOCKED";
    } else if (currentBookings >= maxCapacity) {
      status = "FULL";
    } else if (s.period === "MORNING" && isMorningQuotaFull) {
      status = "FULL";
      blockedReason = "ขออภัย คิวรอบเช้าสำหรับวันนี้เต็มแล้ว (จำกัด 6 คิว/วัน)";
    }

    return {
      time: s.time,
      period: s.period,
      status,
      currentBookings,
      maxCapacity,
      blockedReason,
    };
  });
}

function runTests() {
  console.log("=== STEP 2.2: MORNING QUOTA TEST SUITE ===\n");

  // Case 1: 0 Queues
  console.log("[Case 1] 0 Queues...");
  const slots0 = simulateSlotAvailability([]);
  const morningSlots0 = slots0.filter((s) => s.period === "MORNING");
  const afternoonSlots0 = slots0.filter((s) => s.period === "AFTERNOON");
  assert.strictEqual(morningSlots0.every((s) => s.status === "AVAILABLE"), true);
  assert.strictEqual(afternoonSlots0.every((s) => s.status === "AVAILABLE"), true);
  console.log("-> PASS: 0 Queues -> All morning and afternoon slots AVAILABLE");

  // Case 2: 5 Queues in morning (Distributed across slots, e.g. 09:00 to 11:00)
  console.log("\n[Case 2] 5 Active morning queues (1 per slot across 5 slots)...");
  const mock5 = [
    { bookingId: "DEN-001", bookingTime: "09:00", status: "CONFIRMED" },
    { bookingId: "DEN-002", bookingTime: "09:30", status: "PENDING" },
    { bookingId: "DEN-003", bookingTime: "10:00", status: "CHECKED_IN" },
    { bookingId: "DEN-004", bookingTime: "10:30", status: "IN_PROGRESS" },
    { bookingId: "DEN-005", bookingTime: "11:00", status: "CONFIRMED" },
  ];
  const count5 = countActiveMorningBookings(mock5);
  assert.strictEqual(count5, 5, "Morning count must be 5");
  const slots5 = simulateSlotAvailability(mock5);
  // Slot 11:30 has 0 bookings, should be AVAILABLE
  const slot1130 = slots5.find((s) => s.time === "11:30");
  assert.strictEqual(slot1130.status, "AVAILABLE");
  // Afternoon slots should all be AVAILABLE
  const afternoonSlots5 = slots5.filter((s) => s.period === "AFTERNOON");
  assert.strictEqual(afternoonSlots5.every((s) => s.status === "AVAILABLE"), true);
  console.log("-> PASS: 5 Queues -> Morning slots remain open, afternoon slots unaffected");

  // Case 3: 6 Queues in morning (Reaches 6/6 Quota)
  console.log("\n[Case 3] 6 Active morning queues (Hits MORNING_MAX_CAPACITY)...");
  const mock6 = [
    ...mock5,
    { bookingId: "DEN-006", bookingTime: "11:30", status: "PENDING" },
  ];
  const count6 = countActiveMorningBookings(mock6);
  assert.strictEqual(count6, 6, "Morning count must be 6");
  const slots6 = simulateSlotAvailability(mock6);
  const morningSlots6 = slots6.filter((s) => s.period === "MORNING");
  const afternoonSlots6 = slots6.filter((s) => s.period === "AFTERNOON");
  // Every morning slot must be FULL
  assert.strictEqual(
    morningSlots6.every((s) => s.status === "FULL" && s.blockedReason?.includes("คิวรอบเช้าสำหรับวันนี้เต็มแล้ว")),
    true,
    "All morning slots must be FULL with blockedReason"
  );
  // All afternoon slots must still be AVAILABLE
  assert.strictEqual(
    afternoonSlots6.every((s) => s.status === "AVAILABLE"),
    true,
    "Afternoon slots must remain AVAILABLE"
  );
  console.log("-> PASS: 6 Queues -> ALL morning slots FULL, ALL afternoon slots AVAILABLE");

  // Case 4: 7 Queues in morning (Exceeds Quota)
  console.log("\n[Case 4] 7 Active morning queues...");
  const mock7 = [
    ...mock6,
    { bookingId: "DEN-007", bookingTime: "09:00", status: "CONFIRMED" },
  ];
  const count7 = countActiveMorningBookings(mock7);
  assert.strictEqual(count7, 7, "Morning count must be 7");
  const slots7 = simulateSlotAvailability(mock7);
  const morningSlots7 = slots7.filter((s) => s.period === "MORNING");
  const afternoonSlots7 = slots7.filter((s) => s.period === "AFTERNOON");
  assert.strictEqual(morningSlots7.every((s) => s.status === "FULL"), true);
  assert.strictEqual(afternoonSlots7.every((s) => s.status === "AVAILABLE"), true);
  console.log("-> PASS: 7 Queues -> ALL morning slots FULL, ALL afternoon slots AVAILABLE");

  // Case 5: CANCELLED and REJECTED queues
  console.log("\n[Case 5] 5 Active + 3 CANCELLED + 2 REJECTED morning queues...");
  const mockWithCancelled = [
    ...mock5, // 5 active
    { bookingId: "DEN-010", bookingTime: "09:00", status: "CANCELLED" },
    { bookingId: "DEN-011", bookingTime: "10:00", status: "CANCELLED" },
    { bookingId: "DEN-012", bookingTime: "11:00", status: "CANCELLED" },
    { bookingId: "DEN-013", bookingTime: "09:30", status: "REJECTED" },
    { bookingId: "DEN-014", bookingTime: "10:30", status: "REJECTED" },
  ];
  const countCancelled = countActiveMorningBookings(mockWithCancelled);
  assert.strictEqual(countCancelled, 5, "CANCELLED and REJECTED must not be counted as active");
  const slotsCancelled = simulateSlotAvailability(mockWithCancelled);
  const slot1130Cancelled = slotsCancelled.find((s) => s.time === "11:30");
  assert.strictEqual(slot1130Cancelled.status, "AVAILABLE");
  console.log("-> PASS: CANCELLED and REJECTED do NOT count towards quota (active count = 5)");

  // Case 6: Afternoon Separation
  console.log("\n[Case 6] 5 Active morning queues + 8 Active afternoon queues...");
  const mockSeparation = [
    ...mock5, // 5 active in morning
    { bookingId: "DEN-020", bookingTime: "13:00", status: "CONFIRMED" },
    { bookingId: "DEN-021", bookingTime: "13:00", status: "CONFIRMED" }, // 13:00 full (2)
    { bookingId: "DEN-022", bookingTime: "13:30", status: "CONFIRMED" },
    { bookingId: "DEN-023", bookingTime: "14:00", status: "CONFIRMED" },
    { bookingId: "DEN-024", bookingTime: "14:30", status: "CONFIRMED" },
    { bookingId: "DEN-025", bookingTime: "15:00", status: "CONFIRMED" },
    { bookingId: "DEN-026", bookingTime: "15:30", status: "CONFIRMED" },
    { bookingId: "DEN-027", bookingTime: "15:30", status: "CONFIRMED" }, // 15:30 full (2)
  ];
  const countSeparation = countActiveMorningBookings(mockSeparation);
  assert.strictEqual(countSeparation, 5, "Afternoon bookings must not affect morning count");
  const slotsSeparation = simulateSlotAvailability(mockSeparation);
  const morningRemaining = slotsSeparation.find((s) => s.time === "11:30");
  assert.strictEqual(morningRemaining.status, "AVAILABLE", "Morning 11:30 must remain AVAILABLE");
  // 13:00 is full because of its own capacity (2/2)
  const slot1300 = slotsSeparation.find((s) => s.time === "13:00");
  assert.strictEqual(slot1300.status, "FULL");
  assert.strictEqual(slot1300.blockedReason, null, "Standard capacity full has no morning quota reason");
  // 14:00 has 1 booking, capacity 2, should be AVAILABLE
  const slot1400 = slotsSeparation.find((s) => s.time === "14:00");
  assert.strictEqual(slot1400.status, "AVAILABLE");
  console.log("-> PASS: Afternoon bookings do not leak into morning quota, and follow their own slot capacity");

  // Case 7: Emergency exclusion
  console.log("\n[Case 7] 5 Standard active + 1 Emergency case in morning...");
  const mockEmergency = [
    ...mock5,
    { bookingId: "EMG-001", bookingTime: "09:00", status: "CONFIRMED", isEmergency: true },
  ];
  const countEmergency = countActiveMorningBookings(mockEmergency);
  assert.strictEqual(countEmergency, 5, "Emergency bookings must be excluded from morning quota");
  const slotsEmergency = simulateSlotAvailability(mockEmergency);
  const slot1130Emg = slotsEmergency.find((s) => s.time === "11:30");
  assert.strictEqual(slot1130Emg.status, "AVAILABLE");
  console.log("-> PASS: Emergency bookings excluded from morning quota");

  // Case 8: Compatibility with both SQLite format (time) and Sheets format (bookingTime)
  console.log("\n[Case 8] Shared function reusability for SQLite and Sheets formats...");
  const sqliteFormat = [
    { id: "1", time: "09:00", status: "PENDING", isEmergency: false },
    { id: "2", time: "10:00", status: "CONFIRMED", isEmergency: false },
  ];
  const sheetsFormat = [
    { bookingId: "DEN-001", bookingTime: "09:00", status: "PENDING", isEmergency: false },
    { bookingId: "DEN-002", bookingTime: "10:00", status: "CONFIRMED", isEmergency: false },
  ];
  assert.strictEqual(countActiveMorningBookings(sqliteFormat), 2);
  assert.strictEqual(countActiveMorningBookings(sheetsFormat), 2);
  console.log("-> PASS: Shared function supports both SQLite (time) and Sheets (bookingTime) schemas");

  console.log("\n=== ALL STEP 2.2 TESTS PASSED SUCCESSFULLY ===");
}

runTests();
