import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  appendBookingToSheet,
  countBookingsFromSheet,
  getAllBookingsFromSheet,
  getNextBookingIdFromSheet,
  normalizeMedicalRights,
  SheetBookingRecord,
} from "@/lib/google-sheets";
import {
  isMorningTime,
  countActiveMorningBookings,
  MORNING_MAX_CAPACITY,
} from "@/lib/utils";
import { buildPendingFlexMessage, sendLineFlexNotification } from "@/lib/line";
import {
  isDemoMode,
  getDemoBookings,
  DEMO_SERVICES,
  DEMO_MOCK_USER,
} from "@/lib/demo-data";

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

export const dynamic = "force-dynamic";

/**
 * ตรวจสอบความถูกต้องของ LINE ID Token กับ LINE Verify API (OAuth 2.0 / OpenID Connect)
 * ตรวจสอบ audience (aud) โดยตรงกับ LINE_LOGIN_CHANNEL_ID จริง (ห้ามอนุมานจาก LIFF ID)
 * เพื่อป้องกันการปลอมแปลง User ID (Zero-Trust)
 */
async function verifyLineIdToken(
  idToken: string
): Promise<{ success: boolean; lineUserId?: string; error?: string }> {
  // ในโหมดสาธิต (DEMO_MODE=true) อนุญาตเฉพาะ Mock Token ที่กำหนดไว้ล่วงหน้า
  // เมื่อไม่ใช่ Demo Mode (DEMO_MODE=false) Mock Token จะไม่ผ่านการตรวจสอบเด็ดขาด
  if (isDemoMode()) {
    if (idToken === DEMO_MOCK_USER.idToken) {
      return { success: true, lineUserId: DEMO_MOCK_USER.userId };
    }
  }

  try {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();

    if (!channelId) {
      console.warn(
        "[LINE Auth] Missing LINE_LOGIN_CHANNEL_ID in environment variables."
      );
      return { success: false, error: "Missing LINE_LOGIN_CHANNEL_ID configuration" };
    }

    const params = new URLSearchParams();
    params.append("id_token", idToken);
    params.append("client_id", channelId);

    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.sub) {
      console.warn(
        "[LINE Auth] ID Token verification failed:",
        data.error_description || data.error
      );
      return {
        success: false,
        error: data.error_description || data.error || "Invalid LINE ID Token",
      };
    }

    // ตรวจสอบ audience (aud) ว่าตรงกับ Channel ID ที่กำหนดอย่างเข้มงวด
    if (data.aud !== channelId) {
      console.warn(
        `[LINE Auth] Token audience mismatch: expected ${channelId}, got ${data.aud}`
      );
      return { success: false, error: "Token audience mismatch" };
    }

    return { success: true, lineUserId: data.sub };
  } catch (err: any) {
    console.error("[LINE Auth] Error verifying ID token:", err.message || err);
    return { success: false, error: "Network error during LINE verification" };
  }
}

/**
 * ข้อความปฏิเสธเมื่อโควตาหัตถการเต็ม 6 คิว/วัน
 */
const PROCEDURE_QUOTA_EXCEEDED_MESSAGE =
  "ขออภัย คิวสำหรับทำหัตถการในวันที่ท่านเลือกเต็มแล้ว กรุณาเลือกวันอื่น หรือจองคิวตรวจฟันเบื้องต้น";

/**
 * In-Process Async Mutex สำหรับจัดการการเข้าถึงแบบ Exclusive เพื่อป้องกัน Race Condition
 * ในการจองคิวพร้อมกัน (Concurrent Booking) ภายใน Single Node.js Process สำหรับ Demo
 *
 * หมายเหตุข้อจำกัด (Limitations for Multi-Process / Multi-Instance Environments):
 * Mutex นี้ทำงานระดับ Memory ภายใน Node.js Process เดียวเท่านั้น
 * หากนำไปรันในสภาพแวดล้อม Production ที่มี:
 * - Multi-process (เช่น PM2 cluster mode)
 * - Multi-instance / Serverless Containers (เช่น Vercel Serverless / AWS Lambda หลาย Container)
 * - Multi-pod (Kubernetes)
 * ตัวแปร Memory Lock นี้จะไม่สามารถแชร์ข้าม Processes หรือ Instances ได้
 * ซึ่งอาจเกิด Race Condition ในระดับ Google Sheets ได้
 * แนวทางแก้ไขสำหรับ Production ระดับ Multi-Instance:
 * 1. ใช้ Distributed Lock เช่น Redis (Redlock)
 * 2. ใช้ Database Transaction Lock (Row/Table Level) ก่อนบันทึกลง Sheets
 * 3. ใช้ Google Apps Script API พร้อม LockService เพื่อทำ Transactional Append
 */
class AsyncMutex {
  private current: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void = () => {};
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previous = this.current;
    this.current = next;

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

const bookingSheetsMutex = new AsyncMutex();

/**
 * ข้อมูลบริการทันตกรรมสำรอง กรณีไม่ได้เชื่อมต่อฐานข้อมูล Prisma ในโหมด Demo
 */
const FALLBACK_SERVICES: Record<
  string,
  {
    id: string;
    nameTh: string;
    nameEn: string;
    durationMinutes: number;
    priceMin: number;
    priceMax: number;
    priceDisplay: string;
    description: string;
    icon: string;
    isActive: boolean;
  }
> = {
  "srv-scaling-filling": {
    id: "srv-scaling-filling",
    nameTh: "ขูดหินปูน / อุดฟัน",
    nameEn: "Scaling / Filling",
    durationMinutes: 30,
    priceMin: 800,
    priceMax: 1500,
    priceDisplay: "800 - 1,500 บาท",
    description: "บริการขูดหินปูนและอุดฟัน",
    icon: "Sparkles",
    isActive: true,
  },
  "srv-extraction-wisdom": {
    id: "srv-extraction-wisdom",
    nameTh: "ถอนฟัน / ผ่าฟันคุด",
    nameEn: "Extraction / Wisdom Tooth",
    durationMinutes: 45,
    priceMin: 1000,
    priceMax: 3500,
    priceDisplay: "1,000 - 3,500 บาท",
    description: "บริการถอนฟันและผ่าฟันคุด",
    icon: "Activity",
    isActive: true,
  },
  "srv-braces-adjustment": {
    id: "srv-braces-adjustment",
    nameTh: "ปรับเครื่องมือจัดฟัน",
    nameEn: "Braces Adjustment",
    durationMinutes: 30,
    priceMin: 500,
    priceMax: 1000,
    priceDisplay: "500 - 1,000 บาท",
    description: "ตรวจและปรับเครื่องมือจัดฟัน",
    icon: "Smile",
    isActive: true,
  },
  "srv-root-canal": {
    id: "srv-root-canal",
    nameTh: "รักษารากฟัน",
    nameEn: "Root Canal Treatment",
    durationMinutes: 60,
    priceMin: 3000,
    priceMax: 7000,
    priceDisplay: "3,000 - 7,000 บาท",
    description: "บริการรักษารากฟัน",
    icon: "HeartPulse",
    isActive: true,
  },
};

/**
 * ค้นหาข้อมูลบริการทันตกรรมจาก Prisma หรือ Fallback
 */
async function resolveService(serviceId: string) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (service) return service;
  } catch (err) {
    console.warn("Could not query prisma.service, falling back to static config:", err);
  }
  return FALLBACK_SERVICES[serviceId] || null;
}

/**
 * ฟังก์ชันตรวจสอบว่าบริการทันตกรรมจัดเป็นหัตถการ (ขูดหินปูน, อุดฟัน, ถอนฟัน) ที่ต้องจำกัดโควตาหรือไม่
 * - นับรวม: "ขูดหินปูน", "อุดฟัน", "ถอนฟัน"
 * - ไม่นับรวม: "ตรวจฟัน/ปรึกษา" (จองได้ตลอด)
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

  // ตรวจสอบว่าตรงกับบริการหัตถการ ขูดหินปูน / อุดฟัน / ถอนฟัน หรือไม่
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

  // ข้อยกเว้น: บริการ "ตรวจฟัน" หรือ "ปรึกษา" จองได้ตลอด ไม่นับรวมในโควตานี้
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
    const phone = searchParams.get("phone");
    const queueNumber = searchParams.get("queueNumber");
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const isEmergency = searchParams.get("isEmergency");

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    // กฎความปลอดภัยข้อ 2: ห้ามเปิดเผยรายการทั้งหมดเมื่อไม่มีเงื่อนไขค้นหา
    if (!queueNumber && !phone && !date) {
      return NextResponse.json({ success: true, bookings: [] });
    }

    // ตรวจสอบสิทธิ์ผู้ดูแลระบบเมื่อเรียกดูรายการตามวันที่ (Admin Query)
    if (date && !queueNumber && !phone) {
      const adminSession = req.cookies.get("admin_session")?.value;
      if (!adminSession) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized: กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบเพื่อดูข้อมูลตามวันที่",
          },
          { status: 401 }
        );
      }
    }

    // ตรวจสอบรูปแบบเบอร์โทร: ไม่อนุญาตค้นหาด้วยเบอร์บางส่วน (ต้องเป็นเบอร์มือถือ 10 หลัก)
    let cleanPhoneDigits = "";
    if (phone) {
      cleanPhoneDigits = phone.replace(/\D/g, "");
      if (!/^0[689]\d{8}$/.test(cleanPhoneDigits)) {
        return NextResponse.json({ success: true, bookings: [] });
      }
    }

    // ในโหมดสาธิต (Demo Mode): ดึงข้อมูลจาก synthetic demo data เท่านั้น
    if (isDemoMode()) {
      let demoList = getDemoBookings(date && date !== "ALL" ? date : undefined);

      if (queueNumber) {
        const qUpper = queueNumber.trim().toUpperCase();
        demoList = demoList.filter(
          (b) =>
            b.queueNumber.toUpperCase() === qUpper ||
            b.id.toUpperCase() === qUpper
        );
      }
      if (cleanPhoneDigits) {
        demoList = demoList.filter((b) => {
          const bDigits = b.phoneNumber.replace(/\D/g, "");
          return bDigits === cleanPhoneDigits;
        });
      }
      if (date && date !== "ALL") {
        demoList = demoList.filter((b) => b.date === date);
      }
      if (status && status !== "ALL") {
        demoList = demoList.filter((b) => b.status === status.toUpperCase());
      }
      if (isEmergency === "true") {
        demoList = demoList.filter((b) => b.isEmergency === true);
      }

      const sanitizedDemo = demoList.map((b) => ({
        id: b.id,
        queueNumber: b.queueNumber,
        date: b.date,
        time: b.time,
        period: b.period,
        serviceId: b.serviceId,
        patientName: b.patientName,
        phoneNumber: b.phoneNumber,
        nationalIdOrHn: "",
        symptoms: b.symptoms,
        pdpaAccepted: b.pdpaAccepted,
        status: b.status,
        reminderStatus: b.reminderStatus,
        medicalRights: b.medicalRights,
        rejectReason: b.status === "REJECTED" ? (b.rejectReason || null) : null,
        lineNotificationSent: b.lineNotificationSent,
        isEmergency: b.isEmergency,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        service: b.service,
      }));

      return NextResponse.json({ success: true, bookings: sanitizedDemo, isDemo: true });
    }

    if (bookingStorage === "sheets") {
      let sheetBookings: SheetBookingRecord[] = [];
      try {
        sheetBookings = await getAllBookingsFromSheet();
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

      // ไม่นับข้อมูลทดสอบเป็นคิวจริง (ขึ้นต้นด้วย TEST- หรือ DQ-TEST-)
      sheetBookings = sheetBookings.filter((b) => {
        const upperId = b.bookingId.toUpperCase();
        return (
          !upperId.startsWith("TEST-") &&
          !upperId.startsWith("DQ-TEST-") &&
          !upperId.includes("TEST")
        );
      });

      if (queueNumber) {
        const qUpper = queueNumber.trim().toUpperCase();
        const matches = sheetBookings.filter(
          (b) => b.bookingId.toUpperCase() === qUpper
        );
        // หากพบแถวซ้ำใน Google Sheets ให้เลือกแถวล่าสุด (แถวล่างสุด)
        sheetBookings = matches.length > 0 ? [matches[matches.length - 1]] : [];
      }
      if (cleanPhoneDigits) {
        // ค้นหาด้วยเบอร์เต็ม 10 หลักเท่านั้น ไม่อนุญาตเบอร์บางส่วน
        sheetBookings = sheetBookings.filter((b) => {
          const bDigits = b.phoneNumber.replace(/\D/g, "");
          return bDigits === cleanPhoneDigits;
        });
      }
      if (date && date !== "ALL") {
        sheetBookings = sheetBookings.filter((b) => b.bookingDate === date);
      }
      if (status && status !== "ALL") {
        sheetBookings = sheetBookings.filter(
          (b) => b.status === status.toUpperCase()
        );
      }
      if (isEmergency === "true") {
        sheetBookings = sheetBookings.filter((b) => b.isEmergency === true);
      }

      // เรียงลำดับคิว: ฉุกเฉินก่อน, วันที่, เวลา
      sheetBookings.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) {
          return a.isEmergency ? -1 : 1;
        }
        if (a.bookingDate !== b.bookingDate) {
          return a.bookingDate.localeCompare(b.bookingDate);
        }
        return a.bookingTime.localeCompare(b.bookingTime);
      });

      // คืนเฉพาะข้อมูลที่จำเป็นสำหรับหน้า Tracking โดยไม่ส่ง nationalIdOrHn หรือ lineUserId
      const bookings = sheetBookings.map((b) => {
        const hour = parseInt(b.bookingTime.split(":")[0], 10);
        const period = !isNaN(hour) && hour < 12 ? "MORNING" : "AFTERNOON";
        return {
          id: b.bookingId,
          queueNumber: b.bookingId,
          date: b.bookingDate,
          time: b.bookingTime,
          period,
          serviceId: "",
          patientName: b.patientName,
          phoneNumber: b.phoneNumber,
          nationalIdOrHn: "", // ป้องกันข้อมูลส่วนบุคคล: ไม่ส่งเลขบัตรประชาชน
          symptoms: null,
          pdpaAccepted: true,
          status: b.status,
          reminderStatus: b.reminderStatus || "PENDING",
          medicalRights: b.medicalRights || "",
          rejectReason: b.status === "REJECTED" ? (b.rejectionReason || null) : null,
          isEmergency: b.isEmergency,
          service: {
            id: "",
            nameTh: b.service,
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

      return NextResponse.json({ success: true, bookings });
    }

    // Default sqlite behavior:
    const where: Record<string, unknown> = {};

    if (queueNumber) {
      where.queueNumber = queueNumber.trim().toUpperCase();
    }
    if (cleanPhoneDigits) {
      // ค้นหาด้วยเบอร์เต็ม 10 หลัก ไม่อนุญาตค้นหาด้วยเบอร์บางส่วน
      where.phoneNumber = cleanPhoneDigits;
    }
    if (date && date !== "ALL") {
      where.date = date;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (isEmergency === "true") {
      where.isEmergency = true;
    }

    const rawBookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
      },
      orderBy: [
        { isEmergency: "desc" },
        { date: "asc" },
        { time: "asc" },
      ],
    });

    // ป้องกันข้อมูลส่วนบุคคล: ตัด nationalIdOrHn และ lineUserId ออกก่อนส่งกลับ
    const sanitizedBookings = rawBookings.map((b) => ({
      id: b.id,
      queueNumber: b.queueNumber,
      date: b.date,
      time: b.time,
      period: b.period,
      serviceId: b.serviceId,
      patientName: b.patientName,
      phoneNumber: b.phoneNumber,
      nationalIdOrHn: "", // ป้องกันข้อมูลส่วนบุคคล: ไม่ส่งเลขบัตรประชาชน/HN
      symptoms: b.symptoms,
      pdpaAccepted: b.pdpaAccepted,
      status: b.status,
      reminderStatus: b.reminderStatus,
      medicalRights: (b as any).medicalRights || "",
      rejectReason: b.status === "REJECTED" ? (b.rejectReason || null) : null,
      lineNotificationSent: b.lineNotificationSent,
      isEmergency: b.isEmergency,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      service: b.service,
    }));

    return NextResponse.json({ success: true, bookings: sanitizedBookings });
  } catch (err) {
    console.error("Error querying bookings:", err);
    return NextResponse.json(
      { success: false, error: "Failed to query bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = bookingSchema.parse(body);

    // 1. ตรวจสอบว่าไม่เป็นการจองคิวฉุกเฉินผ่านระบบออนไลน์ (Emergency Booking Rejection)
    if (validated.isEmergency) {
      return NextResponse.json(
        {
          success: false,
          error: "คลินิกไม่เปิดรับการจองคิวฉุกเฉินผ่านระบบออนไลน์ กรุณาติดต่อสายด่วนคลินิก หรือติดต่อที่เคาน์เตอร์ฉุกเฉินโดยตรง",
        },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบความถูกต้องของ lineIdToken ด้วย LINE Verify API (OAuth 2.0 / OpenID Connect)
    // บังคับ LINE Authentication ทุกครั้ง ปฏิเสธคำขอหากไม่มีหรือ Token ไม่ถูกต้อง (Zero-Trust)
    const verifyRes = await verifyLineIdToken(validated.lineIdToken.trim());
    if (!verifyRes.success || !verifyRes.lineUserId) {
      return NextResponse.json(
        {
          success: false,
          error: `การยืนยันตัวตน LINE ล้มเหลว (${verifyRes.error || "Invalid Token"}) กรุณาเข้าสู่ระบบ LINE ใหม่อีกครั้ง`,
        },
        { status: 401 }
      );
    }
    const verifiedLineUserId = verifyRes.lineUserId;
    console.log(
      `[Booking API] LINE ID Token verified successfully for user: ${verifiedLineUserId}`
    );

    const slotId = `${validated.date}_${validated.time}`;

    // ในโหมดสาธิต (Demo Mode): ตอบกลับ Digital Ticket จำลองสถานะ PENDING โดยไม่บันทึกลงฐานข้อมูลจริง
    if (isDemoMode()) {
      const selectedService =
        DEMO_SERVICES.find((s) => s.id === validated.serviceId) || DEMO_SERVICES[0];

      // ตรวจสอบโควตารอบเช้าในระบบสาธิต (จำกัดไม่เกิน 6 ท่าน)
      if (isMorningTime(validated.time)) {
        const demoBookings = getDemoBookings(validated.date);
        const morningActiveCount = countActiveMorningBookings(
          demoBookings.map((b) => ({
            ...b,
            bookingDate: b.date,
            bookingTime: b.time,
            isEmergency: b.isEmergency,
          }))
        );
        if (morningActiveCount >= MORNING_MAX_CAPACITY) {
          return NextResponse.json(
            {
              success: false,
              error: "ขออภัย คิวรอบเช้าสำหรับวันนี้เต็มแล้ว (จำกัดสูงสุด 6 ท่าน)",
            },
            { status: 409 }
          );
        }
      }

      const hour = parseInt(validated.time.split(":")[0], 10);
      const period = validated.period || (hour < 12 ? "MORNING" : "AFTERNOON");
      const now = new Date();
      const queueNumber = "DEN-009";

      const demoBooking = {
        id: "demo-booking-new",
        queueNumber,
        date: validated.date,
        time: validated.time,
        period,
        serviceId: selectedService.id,
        patientName: validated.patientName,
        phoneNumber: validated.phoneNumber || "",
        nationalIdOrHn: "",
        symptoms: validated.symptoms || null,
        status: "PENDING",
        medicalRights: validated.medicalRights || "บัตรทอง",
        rejectReason: null,
        isEmergency: false,
        lineNotificationSent: true,
        reminderStatus: "PENDING",
        pdpaAccepted: true,
        createdAt: now,
        updatedAt: now,
        service: selectedService,
      };

      console.log(
        `[Demo Mode] Simulated booking created: ${queueNumber} for ${validated.patientName}`
      );

      return NextResponse.json({
        success: true,
        message: "ส่งคำขอจองคิวสำเร็จ (โหมดสาธิต - ข้อมูลไม่ถูกบันทึกถาวร)",
        booking: demoBooking,
        isDemo: true,
      });
    }

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    // ==========================================
    // Mode 1: Google Sheets Mode (Demo Storage)
    // ==========================================
    if (bookingStorage === "sheets") {
      // ป้องกัน Race Condition ในการจองคิวพร้อมกันภายใน Node.js Process ด้วย In-Process Mutex
      const sheetBookingResult = await bookingSheetsMutex.runExclusive(async () => {
        // 1. ตรวจสอบบริการทันตกรรมที่เลือก
        const selectedService = await resolveService(validated.serviceId);
        if (!selectedService) {
          throw new Error("ไม่พบบริการทันตกรรมที่เลือก กรุณาลองใหม่อีกครั้ง");
        }

        // 2. ตรวจสอบว่าช่วงเวลา (Slot) ถูกปิดรับนัดหมายหรือไม่
        const slotConfig = await prisma.slotConfig
          .findUnique({
            where: { id: slotId },
          })
          .catch(() => null);

        if (slotConfig?.isBlocked) {
          throw new Error(
            slotConfig.blockedReason || "ขออภัย ช่วงเวลานี้คลินิกปิดรับการนัดหมายชั่วคราว"
          );
        }

        const maxCapacity = slotConfig?.maxCapacity ?? 2;

        // 3. อ่านรายการจองจาก Google Sheets ทั้งหมดเพื่อตรวจสอบโควตาและออกรหัสคิว
        const allSheetBookings = await getAllBookingsFromSheet();

        // กรองเฉพาะวันที่ระบุ
        const dateBookings = allSheetBookings.filter((b) => b.bookingDate === validated.date);

        // 4. ตรวจสอบโควตารอบเช้า (สูงสุด 6 คน รวมทุกบริการ ก่อน 12:00 น.)
        if (isMorningTime(validated.time)) {
          const morningActiveCount = countActiveMorningBookings(dateBookings);
          if (morningActiveCount >= MORNING_MAX_CAPACITY) {
            throw new Error("ขออภัย คิวรอบเช้าสำหรับวันนี้เต็มแล้ว (จำกัดสูงสุด 6 ท่าน)");
          }
        }

        // 5. ตรวจสอบโควตาหัตถการเดิม 6 คิว/วัน (ถ้ามีการระบุหัตถการ)
        if (isProcedureQuotaService(selectedService)) {
          const counts = await countBookingsFromSheet({
            date: validated.date,
            time: validated.time,
          });
          if (counts.procedureCount >= 6) {
            throw new Error(PROCEDURE_QUOTA_EXCEEDED_MESSAGE);
          }
        }

        // 6. นับจำนวนคิวใน Slot เวลาเดียวกัน (ค่าเริ่มต้น 2 คิว/สล็อต)
        const slotBookingsCount = dateBookings.filter(
          (b) =>
            b.bookingTime === validated.time &&
            ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status) &&
            !b.isEmergency
        ).length;

        if (slotBookingsCount >= maxCapacity) {
          throw new Error("ขออภัย คิวในช่วงเวลาดังกล่าวเต็มแล้ว กรุณาเลือกช่วงเวลาอื่น");
        }

        // 7. ออกรหัสคิว Monotonic และตรวจรหัสซ้ำ
        const queueNumber = await getNextBookingIdFromSheet("DEN", allSheetBookings);
        const isDuplicate = allSheetBookings.some(
          (b) => b.bookingId.trim().toUpperCase() === queueNumber.toUpperCase()
        );
        if (isDuplicate) {
          throw new Error("พบรหัสการจองซ้ำใน Google Sheets กรุณาลองใหม่อีกครั้ง");
        }

        const now = new Date();
        const period = isMorningTime(validated.time) ? "MORNING" : "AFTERNOON";

        // 8. บันทึกข้อมูลลง Google Sheets (Col A-L ครบถ้วน)
        const appendRes = await appendBookingToSheet({
          bookingId: queueNumber,
          patientName: validated.patientName.trim(),
          service: selectedService.nameTh,
          bookingDate: validated.date,
          bookingTime: validated.time,
          status: "PENDING",
          createdAt: now.toISOString(),
          phoneNumber: validated.phoneNumber || "",
          lineUserId: verifiedLineUserId,
          isEmergency: false,
          medicalRights: validated.medicalRights || "",
        });

        if (!appendRes.success) {
          throw new Error(
            appendRes.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูลการจองลง Google Sheets"
          );
        }

        // คืนค่ารูปแบบ Response เดิมที่หน้าเว็บใช้งาน
        return {
          id: queueNumber,
          queueNumber,
          date: validated.date,
          time: validated.time,
          period,
          serviceId: validated.serviceId,
          patientName: validated.patientName.trim(),
          phoneNumber: validated.phoneNumber || "",
          nationalIdOrHn: validated.nationalIdOrHn || "",
          medicalRights: validated.medicalRights || "",
          symptoms: validated.symptoms || null,
          pdpaAccepted: true,
          pdpaAcceptedAt: now,
          status: "PENDING",
          lineUserId: verifiedLineUserId,
          isEmergency: false,
          createdAt: now,
          updatedAt: now,
          service: selectedService,
        };
      });

      // 3. Automated LINE Notification: แจ้งเตือนเมื่อสร้างคำขอสำเร็จ (PENDING)
      if (verifiedLineUserId && process.env.NODE_ENV !== "test") {
        try {
          const pendingFlex = buildPendingFlexMessage({
            queueNumber: sheetBookingResult.queueNumber,
            patientName: sheetBookingResult.patientName,
            phoneNumber: sheetBookingResult.phoneNumber,
            date: sheetBookingResult.date,
            time: sheetBookingResult.time,
            serviceNameTh: sheetBookingResult.service?.nameTh || "บริการทันตกรรม",
          });

          await sendLineFlexNotification({
            bookingId: sheetBookingResult.queueNumber,
            type: "PENDING",
            recipient: verifiedLineUserId,
            flexMessage: pendingFlex,
            skipDbLog: true,
          });
        } catch (notifErr) {
          console.warn("[Booking API] Failed to send LINE pending notification (non-fatal):", notifErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "สร้างการจองคิวสำเร็จ กรุณารอเจ้าหน้าที่ตรวจสอบและยืนยัน",
        booking: sheetBookingResult,
      });
    }

    // ==========================================
    // Mode 2: SQLite Mode (Default)
    // Concurrency Protection with Prisma Transaction
    // ห้าม Dual-Write ไปยัง Google Sheets
    // ==========================================
    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบบริการทันตกรรมที่คนไข้เลือก
      const selectedService = await tx.service.findUnique({
        where: { id: validated.serviceId },
      });

      if (!selectedService) {
        throw new Error("ไม่พบบริการทันตกรรมที่เลือก กรุณาลองใหม่อีกครั้ง");
      }

      // 2. ตรวจสอบโควตารอบเช้า (สูงสุด 6 คน รวมทุกบริการ ก่อน 12:00 น.)
      if (isMorningTime(validated.time)) {
        const morningActiveCount = await tx.booking.count({
          where: {
            date: validated.date,
            status: {
              in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
            },
            time: {
              lt: "12:00",
            },
            isEmergency: false,
          },
        });

        if (morningActiveCount >= MORNING_MAX_CAPACITY) {
          throw new Error("ขออภัย คิวรอบเช้าสำหรับวันนี้เต็มแล้ว (จำกัดสูงสุด 6 ท่าน)");
        }
      }

      // 3. Logic จำกัดโควตาสูงสุด 6 คิว/วัน (นับเฉพาะ ขูดหินปูน / อุดฟัน / ถอนฟัน)
      if (isProcedureQuotaService(selectedService)) {
        const procedureCount = await tx.booking.count({
          where: {
            date: validated.date,
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
        });

        if (procedureCount >= 6) {
          throw new Error(PROCEDURE_QUOTA_EXCEEDED_MESSAGE);
        }
      }

      // 4. ตรวจสอบว่าช่วงเวลา (Slot) ถูกปิดรับนัดหมายหรือไม่
      const slotConfig = await tx.slotConfig.findUnique({
        where: { id: slotId },
      });

      if (slotConfig?.isBlocked) {
        throw new Error(
          slotConfig.blockedReason || "ขออภัย ช่วงเวลานี้คลินิกปิดรับการนัดหมายชั่วคราว"
        );
      }

      const maxCapacity = slotConfig?.maxCapacity ?? 2;

      // 5. นับจำนวนคิวใน Slot เวลาเดียวกัน (ป้องกัน Concurrency ใน Slot ย่อย)
      const existingCount = await tx.booking.count({
        where: {
          date: validated.date,
          time: validated.time,
          status: {
            in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
          },
          isEmergency: false,
        },
      });

      if (existingCount >= maxCapacity) {
        throw new Error("ขออภัย คิวในช่วงเวลาดังกล่าวเต็มแล้ว กรุณาเลือกช่วงเวลาอื่น");
      }

      // 6. ออกรหัสคิวแบบเรียงลำดับ Monotonic (เช่น DEN-001, DEN-002)
      const latest = await tx.booking.findFirst({
        where: { queueNumber: { startsWith: "DEN-" } },
        orderBy: { createdAt: "desc" },
      });
      let nextNum = 1;
      if (latest) {
        const match = latest.queueNumber.match(/DEN-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      const queueNumber = `DEN-${String(nextNum).padStart(3, "0")}`;

      // กำหนดช่วงเวลาเช้า/บ่าย (Period)
      const period = isMorningTime(validated.time) ? "MORNING" : "AFTERNOON";

      // 7. บันทึกข้อมูลการจองลงฐานข้อมูล
      const newBooking = await tx.booking.create({
        data: {
          queueNumber,
          date: validated.date,
          time: validated.time,
          period,
          serviceId: validated.serviceId,
          patientName: validated.patientName.trim(),
          phoneNumber: validated.phoneNumber || "",
          nationalIdOrHn: validated.nationalIdOrHn || "",
          symptoms: validated.symptoms || null,
          pdpaAccepted: true,
          pdpaAcceptedAt: new Date(),
          status: "PENDING",
          lineUserId: verifiedLineUserId,
          isEmergency: false,
        },
        include: {
          service: true,
        },
      });

      return newBooking;
    });

    // 3. Automated LINE Notification: แจ้งเตือนเมื่อสร้างคำขอสำเร็จ (PENDING)
    if (verifiedLineUserId && process.env.NODE_ENV !== "test") {
      try {
        const pendingFlex = buildPendingFlexMessage({
          queueNumber: result.queueNumber,
          patientName: result.patientName,
          phoneNumber: result.phoneNumber,
          date: result.date,
          time: result.time,
          serviceNameTh: (result as any).service?.nameTh || "บริการทันตกรรม",
        });

        await sendLineFlexNotification({
          bookingId: result.id,
          type: "PENDING",
          recipient: verifiedLineUserId,
          flexMessage: pendingFlex,
        });
      } catch (notifErr) {
        console.warn("[Booking API] Failed to send LINE pending notification (non-fatal):", notifErr);
      }
    }

    // ใน sqlite mode: ไม่ทำ Dual-Write ไปยัง Google Sheets
    return NextResponse.json({
      success: true,
      message: "สร้างการจองคิวสำเร็จ กรุณารอเจ้าหน้าที่ตรวจสอบและยืนยัน",
      booking: result,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการจองคิว";

    // กรณีโควตาหัตถการเต็ม 6 คิว/วัน ให้ Return 400 Bad Request ตามเงื่อนไข
    if (message === PROCEDURE_QUOTA_EXCEEDED_MESSAGE) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    const status = message.includes("เต็มแล้ว") || message.includes("ปิดรับ") ? 409 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
