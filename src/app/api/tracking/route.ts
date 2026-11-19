import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findBookingsByLineUserIdFromSheet } from "@/lib/google-sheets";
import { verifyLineIdToken } from "@/lib/lineApi";
import { isDemoMode, getDemoBookings } from "@/lib/demo-data";
import { isUatUserAllowlisted } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/tracking
 * LINE-First Queue Tracking Endpoint
 * ตรวจสอบความถูกต้องของ LINE ID Token ฝั่ง Server ก่อนดึงรายการจอง
 * แสดงเฉพาะคิวของบัญชี LINE ที่ยืนยันตัวตนแล้ว (Zero-Trust Privacy)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queueNumberParam = searchParams.get("queueNumber");
    const qParam = searchParams.get("q");

    let targetQueueNumber = queueNumberParam?.trim() || "";
    if (qParam && !targetQueueNumber) {
      const qTrimmed = qParam.trim();
      const upperQ = qTrimmed.toUpperCase();
      if (upperQ.startsWith("DEN-") || upperQ.startsWith("EMG-")) {
        targetQueueNumber = qTrimmed;
      }
    }

    // 1. ดึง LINE ID Token จาก Authorization Header เท่านั้น (ยกเลิกการรับผ่าน Query Parameter เพื่อความปลอดภัย)
    const authHeader = req.headers.get("authorization");
    const xLineToken = req.headers.get("x-line-id-token");

    let idToken = "";
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      idToken = authHeader.slice(7).trim();
    } else if (xLineToken) {
      idToken = xLineToken.trim();
    }

    // กฎความปลอดภัย: บังคับตรวจ LINE ID Token ผ่าน Header ก่อนอนุญาตเข้าถึงข้อมูลคิว (Token ใน URL ไม่ยอมรับ)
    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาเข้าสู่ระบบ LINE เพื่อตรวจสอบรายการจองของคุณ",
          bookings: [],
        },
        { status: 401 }
      );
    }

    // 2. ตรวจสอบ Token กับ LINE Verify API (OAuth 2.0 / OpenID Connect)
    const verifyRes = await verifyLineIdToken(idToken);
    if (!verifyRes.success || !verifyRes.lineUserId) {
      return NextResponse.json(
        {
          success: false,
          error: verifyRes.error || "การยืนยันตัวตน LINE ไม่ถูกต้องหรือหมดอายุ",
          bookings: [],
        },
        { status: 401 }
      );
    }

    const verifiedLineUserId = verifyRes.lineUserId;

    // ในโหมดสาธิต (Demo Mode): ดึงข้อมูลจำลองที่ผูกกับบัญชี Demo เท่านั้น
    if (isDemoMode()) {
      const allDemo = getDemoBookings();
      let userBookings = allDemo.filter((b) => b.lineUserId === verifiedLineUserId);

      if (targetQueueNumber) {
        userBookings = userBookings.filter(
          (b) => b.queueNumber.toUpperCase() === targetQueueNumber.toUpperCase()
        );
      }

      const formatted = userBookings.map((b) => ({
        id: b.id,
        bookingId: b.queueNumber,
        queueNumber: b.queueNumber,
        service: b.service?.nameTh || "ทันตกรรมทั่วไป",
        bookingDate: b.date,
        bookingTime: b.time,
        date: b.date,
        time: b.time,
        period: b.period,
        status: b.status,
        reminderStatus: b.reminderStatus,
        medicalRights: b.medicalRights,
        rejectReason: b.status === "REJECTED" ? b.rejectReason : null,
        isEmergency: b.isEmergency,
        patientName: b.patientName,
        phoneNumber: b.phoneNumber,
      }));

      return NextResponse.json({ success: true, bookings: formatted, isDemo: true });
    }

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    // ==========================================
    // Mode 1: Google Sheets Mode
    // ==========================================
    if (bookingStorage === "sheets") {
      // ตรวจสอบ UAT Allowlist ฝั่ง Server: ป้องกันบุคคลภายนอกเข้าถึงข้อมูลคิวในโหมด UAT Google Sheets
      if (!isUatUserAllowlisted(verifiedLineUserId)) {
        return NextResponse.json(
          {
            success: false,
            error: "บัญชี LINE นี้ยังไม่ได้รับสิทธิ์ทดสอบการจองคิว",
            bookings: [],
          },
          { status: 403 }
        );
      }

      try {
        // ค้นหาเฉพาะรายการที่ line_user_id ตรงกับ verified LINE User ID
        const userBookings = await findBookingsByLineUserIdFromSheet(
          verifiedLineUserId
        );

        // กรองข้อมูลทดสอบ
        const validRecords = userBookings.filter((r) => {
          const upperId = r.bookingId.toUpperCase();
          return (
            !upperId.startsWith("TEST-") &&
            !upperId.startsWith("DQ-TEST-") &&
            !upperId.includes("TEST")
          );
        });

        // หากมีการระบุรหัสคิวเฉพาะ ให้กรองภายในคิวของตนเองเท่านั้น (ป้องกัน ID Leak ข้ามผู้ใช้)
        let matchedRecords = validRecords;
        if (targetQueueNumber) {
          matchedRecords = validRecords.filter(
            (r) => r.bookingId.toUpperCase() === targetQueueNumber.toUpperCase()
          );
        }

        // เรียงลำดับ: คิวฉุกเฉินก่อน, วันที่ล่าสุดก่อน, และเวลา
        matchedRecords.sort((a, b) => {
          if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
          if (a.bookingDate !== b.bookingDate)
            return b.bookingDate.localeCompare(a.bookingDate);
          return a.bookingTime.localeCompare(b.bookingTime);
        });

        const bookings = matchedRecords.map((r) => {
          const hour = parseInt(r.bookingTime.split(":")[0], 10);
          const period = !isNaN(hour) && hour < 12 ? "MORNING" : "AFTERNOON";
          return {
            id: r.bookingId,
            queueNumber: r.bookingId,
            date: r.bookingDate,
            time: r.bookingTime,
            period,
            serviceId: "",
            patientName: r.patientName,
            phoneNumber: r.phoneNumber,
            nationalIdOrHn: "", // ปกปิดข้อมูลบัตรประชาชนตาม PDPA
            medicalRights: r.medicalRights || "",
            symptoms: null,
            pdpaAccepted: true,
            status: r.status,
            reminderStatus: r.reminderStatus || "PENDING",
            rejectReason:
              r.status === "REJECTED"
                ? (r.rejectionReason || null)
                : null,
            isEmergency: r.isEmergency,
            lineUserId: r.lineUserId,
            service: {
              id: "",
              nameTh: r.service,
              nameEn: "",
              durationMinutes: 30,
              priceMin: 0,
              priceMax: 0,
              priceDisplay: "",
              description: "",
              icon: "Tooth",
              isActive: true,
            },
          };
        });

        return NextResponse.json({
          success: true,
          bookings,
        });
      } catch (err: unknown) {
        console.error("Error querying tracking in Google Sheets:", err);
        const rawMessage =
          err instanceof Error
            ? err.message
            : "Failed to query bookings from Google Sheets";
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
    // Mode 2: SQLite Mode (Prisma)
    // ==========================================
    const where: Record<string, unknown> = {
      lineUserId: verifiedLineUserId,
    };

    if (targetQueueNumber) {
      where.queueNumber = targetQueueNumber.toUpperCase();
    }

    const rawBookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
      },
      orderBy: [
        { isEmergency: "desc" },
        { date: "desc" },
        { time: "asc" },
      ],
    });

    const sanitizedBookings = rawBookings.map((b) => ({
      id: b.id,
      queueNumber: b.queueNumber,
      date: b.date,
      time: b.time,
      period: b.period,
      serviceId: b.serviceId,
      patientName: b.patientName,
      phoneNumber: b.phoneNumber,
      nationalIdOrHn: "", // ปกปิดข้อมูลบัตรประชาชน/HN ตาม PDPA
      medicalRights: (b as any).medicalRights || "",
      symptoms: b.symptoms,
      pdpaAccepted: b.pdpaAccepted,
      status: b.status,
      reminderStatus: b.reminderStatus,
      rejectReason: b.status === "REJECTED" ? (b.rejectReason || null) : null,
      isEmergency: b.isEmergency,
      lineUserId: b.lineUserId,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      service: b.service,
    }));

    return NextResponse.json({ success: true, bookings: sanitizedBookings });
  } catch (err) {
    console.error("Error querying tracking bookings:", err);
    return NextResponse.json(
      { success: false, error: "Failed to query tracking bookings" },
      { status: 500 }
    );
  }
}
