import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllBookingsFromSheet } from "@/lib/google-sheets";
import { isDemoMode, getDemoKPIs } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    // 1. ตรวจสอบสิทธิ์ Admin (Admin Authorization Check)
    const adminSession = req.cookies.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบ" },
        { status: 401 }
      );
    }

    const now = new Date();
    const todayStr =
      dateParam ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

    // ในโหมดสาธิต (Demo Mode): คำนวณ KPIs จาก Synthetic Seed Data โดยไม่แตะข้อมูลจริง
    if (isDemoMode()) {
      const kpis = getDemoKPIs(todayStr);
      return NextResponse.json({ success: true, kpis, isDemo: true });
    }

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    // ==========================================
    // Mode 1: Google Sheets Mode
    // ==========================================
    if (bookingStorage === "sheets") {
      try {
        const allBookings = await getAllBookingsFromSheet();

        // กรองไม่นับข้อมูลทดสอบ
        const validBookings = allBookings.filter((b) => {
          const upperId = b.bookingId.toUpperCase();
          return (
            !upperId.startsWith("TEST-") &&
            !upperId.startsWith("DQ-TEST-") &&
            !upperId.includes("TEST")
          );
        });

        const pendingCount = validBookings.filter(
          (b) => b.status === "PENDING"
        ).length;

        const dateBookings = validBookings.filter(
          (b) => b.bookingDate === todayStr
        );

        const confirmedTodayCount = dateBookings.filter(
          (b) => b.status === "CONFIRMED"
        ).length;

        const inProgressCount = dateBookings.filter(
          (b) => b.status === "IN_PROGRESS"
        ).length;

        const completedTodayCount = dateBookings.filter(
          (b) => b.status === "COMPLETED"
        ).length;

        const emergencyCount = dateBookings.filter(
          (b) => b.isEmergency === true
        ).length;

        const totalToday = dateBookings.length;

        const quotaStatuses = [
          "PENDING",
          "CONFIRMED",
          "CHECKED_IN",
          "IN_PROGRESS",
          "COMPLETED",
        ];

        const procedureCount = dateBookings.filter((b) => {
          if (!quotaStatuses.includes(b.status)) return false;
          const s = b.service.toLowerCase();
          const isProc =
            s.includes("ขูด") ||
            s.includes("อุด") ||
            s.includes("ถอน") ||
            s.includes("scaling") ||
            s.includes("filling") ||
            s.includes("extraction");
          const isConsult =
            s.includes("ตรวจ") ||
            s.includes("ปรึกษา") ||
            s.includes("consult") ||
            s.includes("check") ||
            s.includes("exam");
          return isProc && !isConsult;
        }).length;

        return NextResponse.json({
          success: true,
          date: todayStr,
          kpis: {
            pendingCount,
            confirmedTodayCount,
            inProgressCount,
            completedTodayCount,
            emergencyCount,
            totalToday,
          },
          procedureCount,
        });
      } catch (err: unknown) {
        console.error("Error calculating KPIs from Google Sheets:", err);
        const rawMessage =
          err instanceof Error
            ? err.message
            : "Failed to query KPIs from Google Sheets";
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
    const [
      pendingCount,
      confirmedTodayCount,
      inProgressCount,
      completedTodayCount,
      emergencyCount,
      totalToday,
      procedureCount,
    ] = await Promise.all([
      // Pending approvals across system (all upcoming dates)
      prisma.booking.count({
        where: { status: "PENDING" },
      }),
      // Confirmed for selected date
      prisma.booking.count({
        where: {
          date: todayStr,
          status: "CONFIRMED",
        },
      }),
      // Currently In-Progress
      prisma.booking.count({
        where: {
          date: todayStr,
          status: "IN_PROGRESS",
        },
      }),
      // Completed today
      prisma.booking.count({
        where: {
          date: todayStr,
          status: "COMPLETED",
        },
      }),
      // Emergency cases today
      prisma.booking.count({
        where: {
          date: todayStr,
          isEmergency: true,
        },
      }),
      // Total bookings for selected date
      prisma.booking.count({
        where: {
          date: todayStr,
        },
      }),
      // Quota count for procedures (ขูดหินปูน / อุดฟัน / ถอนฟัน) on selected date
      prisma.booking.count({
        where: {
          date: todayStr,
          status: {
            in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"],
          },
          service: {
            OR: [
              { nameTh: { contains: "ขูด" } },
              { nameTh: { contains: "อุด" } },
              { nameTh: { contains: "ถอน" } },
              { nameEn: { contains: "Scaling" } },
              { nameEn: { contains: "Filling" } },
              { nameEn: { contains: "Extraction" } },
              { id: { contains: "scaling" } },
              { id: { contains: "filling" } },
              { id: { contains: "extraction" } },
            ],
            NOT: [
              { nameTh: { contains: "ตรวจ" } },
              { nameTh: { contains: "ปรึกษา" } },
            ],
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      date: todayStr,
      kpis: {
        pendingCount,
        confirmedTodayCount,
        inProgressCount,
        completedTodayCount,
        emergencyCount,
        totalToday,
      },
      procedureCount,
    });
  } catch (err) {
    console.error("Error fetching clinic KPIs:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch clinic KPIs" },
      { status: 500 }
    );
  }
}
