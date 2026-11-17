import cron from "node-cron";
import { prisma } from "./prisma";
import { buildAdvanceReminderFlexMessage, sendLineFlexNotification } from "./line";
import {
  getAllBookingsFromSheet,
  updateBookingReminderStatusInSheet,
} from "./google-sheets";
import { isDemoMode } from "./demo-data";

let isCronInitialized = false;

/**
 * Core business logic: Process advance reminders for appointments 1-2 days ahead
 */
export async function processAdvanceReminders(daysAhead = 2) {
  if (isDemoMode()) {
    console.log("[Demo Mode] processAdvanceReminders skipped (Air-gapped)");
    return { processed: 0, sent: 0, skipped: 0, errors: [] };
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dd = String(targetDate.getDate()).padStart(2, "0");
  const targetDateStr = `${yyyy}-${mm}-${dd}`;

  console.log(`[Cron] Scanning for confirmed appointments on ${targetDateStr} (${daysAhead} days ahead)...`);

  const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

  // ==========================================
  // Mode 1: Google Sheets Mode
  // ==========================================
  if (bookingStorage === "sheets") {
    const allBookings = await getAllBookingsFromSheet();

    // กรองคิวที่เข้าเกณฑ์แจ้งเตือนล่วงหน้า:
    // 1. วันที่ตรงกับ targetDateStr
    // 2. สถานะต้องเป็น CONFIRMED (ไม่เป็น CANCELLED, REJECTED หรือสถานะอื่น)
    // 3. ไม่ใช่คิวทดสอบ (ไม่ขึ้นต้นด้วย TEST หรือ DQ-TEST)
    // 4. ต้องมี line_user_id
    // 5. reminder_status ต้องยังไม่เคยส่ง (เป็น NOT_SENT, PENDING หรือ ค่าว่าง) และไม่ใช่ SENT, ATTENDANCE_CONFIRMED, RESCHEDULE_REQUESTED
    const eligibleBookings = allBookings.filter((booking) => {
      // ตรวจสอบวันที่
      if (booking.bookingDate !== targetDateStr) return false;

      // ตรวจสอบสถานะการจอง: ต้องเป็น CONFIRMED เท่านั้น
      if (booking.status !== "CONFIRMED") return false;

      // กฎข้อ 4: ไม่แจ้งเตือนคิว TEST
      const cleanId = (booking.bookingId || "").toUpperCase();
      if (
        cleanId.startsWith("TEST-") ||
        cleanId.startsWith("TEST") ||
        cleanId.startsWith("DQ-TEST")
      ) {
        return false;
      }

      // กฎข้อ 4: ต้องมี line_user_id
      const lineUserId = (booking.lineUserId || "").trim();
      if (!lineUserId) return false;

      // กฎข้อ 5: ตรวจ reminder_status เพื่อป้องกันการส่งซ้ำ
      const reminderStatus = (booking.reminderStatus || "").toUpperCase();
      if (
        reminderStatus === "SENT" ||
        reminderStatus === "ATTENDANCE_CONFIRMED" ||
        reminderStatus === "RESCHEDULE_REQUESTED"
      ) {
        return false;
      }

      return true;
    });

    console.log(
      `[Cron Sheets] Found ${eligibleBookings.length} bookings needing advance reminder.`
    );

    const results = [];

    for (const booking of eligibleBookings) {
      const flexMessage = buildAdvanceReminderFlexMessage({
        queueNumber: booking.bookingId,
        patientName: booking.patientName,
        serviceNameTh: booking.service,
        date: booking.bookingDate,
        time: booking.bookingTime,
      });

      const recipient = (booking.lineUserId || "").trim();

      // กฎข้อ 7: ใช้ฟังก์ชันส่ง LINE ที่ข้าม Prisma NotificationLog ในโหมด sheets
      const dispatchResult = await sendLineFlexNotification({
        bookingId: booking.bookingId,
        type: "ADVANCE_REMINDER",
        recipient,
        flexMessage,
        skipDbLog: true,
      });

      // กฎข้อ 6: เตรียมอัปเดต reminder_status เป็น SENT เมื่อ LINE ส่งสำเร็จจริงเท่านั้น
      let statusUpdated = false;
      if (dispatchResult.status === "SUCCESS") {
        const updateRes = await updateBookingReminderStatusInSheet(
          booking.bookingId,
          "SENT"
        );
        statusUpdated = updateRes.success;
      }

      results.push({
        bookingId: booking.bookingId,
        queueNumber: booking.bookingId,
        patientName: booking.patientName,
        targetDate: booking.bookingDate,
        recipient,
        status: dispatchResult.status,
        reminderStatusUpdated: statusUpdated,
      });
    }

    return {
      targetDate: targetDateStr,
      count: eligibleBookings.length,
      processed: results,
      storage: "sheets",
    };
  }

  // ==========================================
  // Mode 2: SQLite Mode (Default)
  // ==========================================
  // Find all CONFIRMED appointments on this date that haven't had reminders sent yet
  const eligibleBookings = await prisma.booking.findMany({
    where: {
      date: targetDateStr,
      status: "CONFIRMED",
      OR: [
        { reminderStatus: "NOT_SENT" },
        { reminderStatus: null },
      ],
    },
    include: {
      service: true,
    },
  });

  console.log(`[Cron SQLite] Found ${eligibleBookings.length} bookings needing advance reminder.`);

  const results = [];

  for (const booking of eligibleBookings) {
    const flexMessage = buildAdvanceReminderFlexMessage({
      queueNumber: booking.queueNumber,
      patientName: booking.patientName,
      serviceNameTh: booking.service.nameTh,
      date: booking.date,
      time: booking.time,
    });

    const recipient = booking.lineUserId || booking.phoneNumber;

    const dispatchResult = await sendLineFlexNotification({
      bookingId: booking.id,
      type: "ADVANCE_REMINDER",
      recipient,
      flexMessage,
    });

    // Update booking reminder status
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        reminderSentAt: new Date(),
        reminderStatus: "SENT",
      },
    });

    results.push({
      bookingId: booking.id,
      queueNumber: booking.queueNumber,
      patientName: booking.patientName,
      targetDate: booking.date,
      recipient,
      status: dispatchResult.status,
    });
  }

  return {
    targetDate: targetDateStr,
    count: eligibleBookings.length,
    processed: results,
    storage: "sqlite",
  };
}

/**
 * Initializes the automated node-cron schedule: runs every day at 08:00 AM (0 8 * * *)
 */
export function initScheduledJobs() {
  if (isCronInitialized) {
    return;
  }

  // Daily at 08:00 AM Bangkok Time
  cron.schedule("0 8 * * *", async () => {
    console.log("[node-cron] Running daily 08:00 AM Advance Reminder job...");
    try {
      const res = await processAdvanceReminders(2);
      console.log(`[node-cron] Finished sending reminders: ${res.count} items processed.`);
    } catch (err) {
      console.error("[node-cron] Error executing daily reminder job:", err);
    }
  });

  isCronInitialized = true;
  console.log("[node-cron] Dental Clinic reminder cron job scheduled (0 8 * * * daily).");
}
