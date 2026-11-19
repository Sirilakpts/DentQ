import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBookingByIdFromSheet,
  updateBookingStatusInSheet,
  updateBookingReminderStatusInSheet,
} from "@/lib/google-sheets";
import { verifyLineIdToken } from "@/lib/lineApi";
import { isDemoMode, getDemoBookings } from "@/lib/demo-data";
import { isUatUserAllowlisted } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/tracking/action
 * จัดการ Action การตอบรับนัดหมายจากหน้า Tracking หรือ LINE
 * (confirm-attendance: ยืนยันการมา, reschedule: ขอเลื่อนนัด)
 *
 * กฎความปลอดภัย Step 2.5.1:
 * - ทุก Action ต้องยืนยันตัวตนด้วย LINE ID Token (Authorization Header หรือ Request Body)
 * - ห้ามรับ Token ผ่าน Query Parameter
 * - ตรวจสอบความเป็นเจ้าของคิว (Zero-Trust): Booking ต้องเป็นของผู้ใช้จริง (lineUserId ตรงกัน)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { queueNumber, action, lineIdToken } = body;

    const cleanQueueNumber = String(queueNumber || "").trim().toUpperCase();

    // 1. ตรวจสอบข้อมูลจำเป็น
    if (!cleanQueueNumber || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุรหัสคิว และการดำเนินการ",
        },
        { status: 400 }
      );
    }

    // 2. ดึง LINE ID Token จาก Header หรือ Request Body เท่านั้น (ห้ามรับผ่าน Query Parameter)
    const authHeader = req.headers.get("authorization");
    const xLineToken = req.headers.get("x-line-id-token");

    let idToken = "";
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      idToken = authHeader.slice(7).trim();
    } else if (xLineToken) {
      idToken = xLineToken.trim();
    } else if (lineIdToken) {
      idToken = String(lineIdToken).trim();
    }

    // บังคับ Token: ทุก Action ต้องผ่านการยืนยันตัวตนด้วย LINE
    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาเข้าสู่ระบบ LINE เพื่อดำเนินการจัดการคิวนัดหมาย",
        },
        { status: 401 }
      );
    }

    // 3. ตรวจสอบ Token กับ LINE Verify API (OAuth 2.0 / OpenID Connect)
    const verifyRes = await verifyLineIdToken(idToken);
    if (!verifyRes.success || !verifyRes.lineUserId) {
      return NextResponse.json(
        {
          success: false,
          error: verifyRes.error || "การยืนยันตัวตน LINE ไม่ถูกต้องหรือหมดอายุ",
        },
        { status: 401 }
      );
    }

    const verifiedLineUserId = verifyRes.lineUserId;

    // ในโหมดสาธิต (Demo Mode): จัดการ Action กับข้อมูลจำลองโดยไม่แตะระบบจริง
    if (isDemoMode()) {
      const demoBookings = getDemoBookings();
      const booking = demoBookings.find(
        (b) => b.queueNumber.toUpperCase() === cleanQueueNumber
      );

      if (!booking) {
        return NextResponse.json(
          { success: false, error: "ไม่พบคิวการนัดหมายนี้" },
          { status: 404 }
        );
      }

      if (booking.lineUserId !== verifiedLineUserId) {
        return NextResponse.json(
          { success: false, error: "ท่านไม่มีสิทธิ์จัดการคิวนัดหมายของผู้อื่น" },
          { status: 403 }
        );
      }

      const msg =
        action === "confirm-attendance"
          ? "ยืนยันการมาตามนัดหมายเรียบร้อยแล้ว (โหมดสาธิต)"
          : action === "reschedule"
          ? "ส่งคำขอเลื่อนนัดหมายเรียบร้อยแล้ว เจ้าหน้าที่จะติดต่อกลับ (โหมดสาธิต)"
          : "ดำเนินการสำเร็จ (โหมดสาธิต)";

      return NextResponse.json({
        success: true,
        message: msg,
        queueNumber: cleanQueueNumber,
        action,
        isDemo: true,
      });
    }

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    // ==========================================
    // Mode 1: Google Sheets Mode
    // ==========================================
    if (bookingStorage === "sheets") {
      // ตรวจสอบ UAT Allowlist ฝั่ง Server: ป้องกันบุคคลภายนอกจัดการข้อมูลคิวในโหมด UAT Google Sheets
      if (!isUatUserAllowlisted(verifiedLineUserId)) {
        return NextResponse.json(
          {
            success: false,
            error: "บัญชี LINE นี้ยังไม่ได้รับสิทธิ์ทดสอบการจองคิว",
          },
          { status: 403 }
        );
      }

      try {
        const booking = await getBookingByIdFromSheet(cleanQueueNumber);

        if (!booking) {
          return NextResponse.json(
            { success: false, error: "ไม่พบคิวการนัดหมายนี้" },
            { status: 404 }
          );
        }

        // ตรวจสอบความเป็นเจ้าของคิวอย่างเข้มงวด: LINE User ID ต้องตรงกัน
        const bookingLineUserId = (booking.lineUserId || "").trim();
        if (bookingLineUserId !== verifiedLineUserId) {
          return NextResponse.json(
            { success: false, error: "ท่านไม่มีสิทธิ์จัดการคิวนัดหมายของผู้อื่น" },
            { status: 403 }
          );
        }

        let newStatus = booking.status;
        let reminderStatus = "PENDING";
        let message = "";

        if (action === "confirm-attendance") {
          newStatus = "CONFIRMED";
          reminderStatus = "ATTENDANCE_CONFIRMED";
          message = "ยืนยันการเข้ารับบริการเรียบร้อยแล้ว ทางคลินิกรอพบคุณตามวันเวลานัดหมาย";
          await updateBookingStatusInSheet(booking.bookingId, "CONFIRMED");
          await updateBookingReminderStatusInSheet(booking.bookingId, "ATTENDANCE_CONFIRMED");
        } else if (action === "reschedule") {
          reminderStatus = "RESCHEDULE_REQUESTED";
          message = "บันทึกคำขอเลื่อนนัดหมายแล้ว เจ้าหน้าที่จะติดต่อกลับเพื่อประสานงานหาคิวใหม่";
          await updateBookingReminderStatusInSheet(booking.bookingId, "RESCHEDULE_REQUESTED");
        } else {
          return NextResponse.json(
            { success: false, error: "Action ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message,
          booking: {
            id: booking.bookingId,
            queueNumber: booking.bookingId,
            date: booking.bookingDate,
            time: booking.bookingTime,
            status: newStatus,
            reminderStatus,
            patientName: booking.patientName,
            phoneNumber: booking.phoneNumber,
            service: {
              nameTh: booking.service,
            },
          },
        });
      } catch (err: unknown) {
        console.error("Error updating tracking action in Google Sheets:", err);
        const rawMessage =
          err instanceof Error
            ? err.message
            : "Failed to update reminder response in Google Sheets";
        const safeMessage = rawMessage.replace(
          /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
          "[REDACTED]"
        );
        return NextResponse.json(
          { success: false, error: safeMessage },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // Mode 2: SQLite Mode (Default)
    // ==========================================
    const booking = await prisma.booking.findUnique({
      where: { queueNumber: cleanQueueNumber },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "ไม่พบคิวการนัดหมายนี้" },
        { status: 404 }
      );
    }

    // ตรวจสอบความเป็นเจ้าของคิวอย่างเข้มงวด: LINE User ID ต้องตรงกัน
    const bookingLineUserId = (booking.lineUserId || "").trim();
    if (bookingLineUserId !== verifiedLineUserId) {
      return NextResponse.json(
        { success: false, error: "ท่านไม่มีสิทธิ์จัดการคิวนัดหมายของผู้อื่น" },
        { status: 403 }
      );
    }

    let newStatus = booking.status;
    let reminderStatus = "PENDING";
    let message = "";

    if (action === "confirm-attendance") {
      newStatus = "CONFIRMED";
      reminderStatus = "ATTENDANCE_CONFIRMED";
      message = "ยืนยันการเข้ารับบริการเรียบร้อยแล้ว ทางคลินิกรอพบคุณตามวันเวลานัดหมาย";
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          reminderStatus: "ATTENDANCE_CONFIRMED",
        },
      });
    } else if (action === "reschedule") {
      reminderStatus = "RESCHEDULE_REQUESTED";
      message = "บันทึกคำขอเลื่อนนัดหมายแล้ว เจ้าหน้าที่จะติดต่อกลับเพื่อประสานงานหาคิวใหม่";
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          reminderStatus: "RESCHEDULE_REQUESTED",
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Action ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      booking: {
        id: booking.id,
        queueNumber: booking.queueNumber,
        date: booking.date,
        time: booking.time,
        status: newStatus,
        reminderStatus,
      },
    });
  } catch (err) {
    console.error("Error updating tracking action:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update tracking action" },
      { status: 500 }
    );
  }
}
