import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  STANDARD_SLOTS,
  countActiveMorningBookings,
  MORNING_MAX_CAPACITY,
} from "@/lib/utils";
import { SlotAvailability } from "@/lib/types";
import { getAllBookingsFromSheet } from "@/lib/google-sheets";
import { isDemoMode, getDemoSlots } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/**
 * ฟังก์ชันตรวจสอบว่าบริการทันตกรรมจัดเป็นหัตถการ (ขูดหินปูน, อุดฟัน, ถอนฟัน) ที่ต้องจำกัดโควตาหรือไม่
 */
function isProcedureQuotaService(service: {
  id?: string;
  nameTh?: string;
  nameEn?: string;
} | null): boolean {
  if (!service) return false;
  const nameTh = service.nameTh || "";
  const nameEn = (service.nameEn || "").toLowerCase();
  const id = (service.id || "").toLowerCase();

  const matchesProcedure =
    nameTh.includes("ขูด") ||
    nameTh.includes("อุด") ||
    nameTh.includes("ถอน") ||
    nameEn.includes("scaling") ||
    nameEn.includes("filling") ||
    nameEn.includes("extraction") ||
    id.includes("scaling") ||
    id.includes("filling") ||
    id.includes("extraction");

  const isConsultation =
    nameTh.includes("ตรวจ") ||
    nameTh.includes("ปรึกษา") ||
    nameEn.includes("consult") ||
    nameEn.includes("check") ||
    nameEn.includes("exam");

  return matchesProcedure && !isConsultation;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date parameter is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // ในโหมดสาธิต (Demo Mode): คำนวณความพร้อมของสล็อตจาก Synthetic Seed Data เท่านั้น
    if (isDemoMode()) {
      const slots = getDemoSlots(date);
      return NextResponse.json({ success: true, slots, isDemo: true });
    }

    // 1. Fetch any explicit slot configs from Prisma (Dependency: SlotConfig ที่ไม่ใช่ Booking)
    const slotConfigs = await prisma.slotConfig
      .findMany({
        where: { date },
      })
      .catch(() => []);
    const configMap = new Map(slotConfigs.map((c) => [c.time, c]));

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    const bookingCountMap = new Map<string, number>();
    let isProcedureQuotaFull = false;
    let isMorningQuotaFull = false;
    let morningActiveCount = 0;

    // ==========================================
    // Mode 1: Google Sheets Mode
    // ==========================================
    if (bookingStorage === "sheets") {
      try {
        const allBookings = await getAllBookingsFromSheet();

        // กรองเฉพาะวันที่ระบุ และไม่นับข้อมูลทดสอบ (ขึ้นต้นด้วย TEST- หรือ DQ-TEST-)
        const dateBookings = allBookings.filter((b) => {
          if (b.bookingDate !== date) return false;
          const upperId = b.bookingId.toUpperCase();
          if (
            upperId.startsWith("TEST-") ||
            upperId.startsWith("DQ-TEST-") ||
            upperId.includes("TEST")
          ) {
            return false;
          }
          return true;
        });

        // สถานะ active ที่ใช้โควตาสล็อต: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS (ไม่รวม CANCELLED, REJECTED)
        const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

        for (const b of dateBookings) {
          // ไม่นับเคสฉุกเฉินในโควตาสล็อตปกติ
          if (activeStatuses.includes(b.status) && !b.isEmergency) {
            bookingCountMap.set(
              b.bookingTime,
              (bookingCountMap.get(b.bookingTime) || 0) + 1
            );
          }
        }

        // ตรวจสอบโควตารอบเช้า (สูงสุด 6 คน รวมทุกบริการ ก่อน 12:00 น.)
        morningActiveCount = countActiveMorningBookings(dateBookings);
        isMorningQuotaFull = morningActiveCount >= MORNING_MAX_CAPACITY;

        // ตรวจสอบโควตาหัตถการ 6 คิว/วัน (ไม่นับ CANCELLED, REJECTED)
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

        isProcedureQuotaFull = procedureCount >= 6;
      } catch (err: unknown) {
        console.error("Error reading bookings from Google Sheets:", err);
        const rawMessage =
          err instanceof Error
            ? err.message
            : "Failed to read bookings from Google Sheets";
        const safeMessage = rawMessage.replace(
          /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
          "[REDACTED]"
        );
        return NextResponse.json(
          { success: false, error: safeMessage },
          { status: 500 }
        );
      }
    } else {
      // ==========================================
      // Mode 2: SQLite Mode (Default)
      // คงพฤติกรรมเดิม 100%
      // ==========================================
      const activeBookings = await prisma.booking.findMany({
        where: {
          date,
          status: {
            in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
          },
        },
        select: {
          id: true,
          time: true,
          status: true,
          isEmergency: true,
        },
      });

      for (const b of activeBookings) {
        if (!b.isEmergency) {
          bookingCountMap.set(b.time, (bookingCountMap.get(b.time) || 0) + 1);
        }
      }

      // ตรวจสอบโควตารอบเช้า (สูงสุด 6 คน รวมทุกบริการ ก่อน 12:00 น.)
      morningActiveCount = countActiveMorningBookings(activeBookings);
      isMorningQuotaFull = morningActiveCount >= MORNING_MAX_CAPACITY;
    }

    // ตรวจสอบว่าบริการที่เลือกเป็นหัตถการหรือไม่ (กรณีส่ง serviceId มาตรวจสอบ)
    let isSelectedServiceProcedure = false;
    if (serviceId) {
      isSelectedServiceProcedure = isProcedureQuotaService({ id: serviceId });
    }

    // 3. Assemble availability for each standard slot
    const slots: SlotAvailability[] = STANDARD_SLOTS.map((s) => {
      const config = configMap.get(s.time);
      const isBlocked = config?.isBlocked ?? false;
      const maxCapacity = config?.maxCapacity ?? 2;
      const currentBookings = bookingCountMap.get(s.time) || 0;

      let status: "AVAILABLE" | "FULL" | "BLOCKED" = "AVAILABLE";
      let blockedReason = config?.blockedReason || null;

      if (isBlocked) {
        status = "BLOCKED";
      } else if (currentBookings >= maxCapacity) {
        status = "FULL";
      } else if (s.period === "MORNING" && isMorningQuotaFull) {
        status = "FULL";
        blockedReason = "ขออภัย คิวรอบเช้าสำหรับวันนี้เต็มแล้ว (จำกัด 6 คิว/วัน)";
      } else if (isSelectedServiceProcedure && isProcedureQuotaFull) {
        status = "FULL";
        blockedReason = "ขออภัย คิวหัตถการสำหรับวันนี้เต็มแล้ว (จำกัด 6 คิว/วัน)";
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

    return NextResponse.json({
      success: true,
      date,
      slots,
    });
  } catch (err) {
    console.error("Error fetching slots:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}
