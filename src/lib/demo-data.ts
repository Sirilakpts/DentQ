/**
 * src/lib/demo-data.ts
 * DentQ Synthetic Demo Data Module
 *
 * โมดูลข้อมูลจำลองสำหรับ Vercel Demo และสภาพแวดล้อมทดสอบ (Air-Gapped Synthetic Mode)
 * ข้อมูลทั้งหมดเป็นข้อมูลสมมุติ 100% ไม่เชื่อมโยงหรือคัดลอกจากฐานข้อมูลหรือ Google Sheets จริง
 */

import {
  BookingRecord,
  BookingStatus,
  ClinicKPIs,
  DentalService,
  SlotAvailability,
} from "./types";
import { STANDARD_SLOTS } from "./utils";

/**
 * ตรวจสอบว่าระบบกำลังทำงานในโหมดสาธิต (Air-Gapped Synthetic Demo Mode) หรือไม่
 * ควบคุมผ่าน Server-side Feature Flag: DEMO_MODE=true
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * ฟังก์ชันช่วยแปลงวันที่สัมพันธ์กับปัจจุบัน (YYYY-MM-DD)
 * ช่วยให้ข้อมูลจำลองเป็นวันที่ปัจจุบันและวันถัดไปเสมอเมื่อเปิดดูบน Vercel Demo
 */
export function getRelativeDemoDate(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * โปรไฟล์ LINE จำลองสำหรับการทดสอบ UI ฝั่งคนไข้ (Tracking & Booking)
 */
export const DEMO_MOCK_USER = {
  userId: "U_demo_user_001",
  displayName: "สมชาย มั่นคง (LINE Demo)",
  pictureUrl:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
  idToken: "mock_demo_line_id_token",
} as const;

/**
 * รายการบริการทันตกรรมจำลอง 5 บริการมาตรฐาน
 */
export const DEMO_SERVICES: DentalService[] = [
  {
    id: "srv-scaling-filling",
    nameTh: "ขูดหินปูน / อุดฟัน",
    nameEn: "Dental Scaling & Filling",
    durationMinutes: 30,
    priceMin: 800,
    priceMax: 1500,
    priceDisplay: "800 - 1,500 บาท",
    description: "ทำความสะอาดคราบหินปูน ขจัดคราบพลัค อุดฟันด้วยวัสดุเรซินสีเหมือนฟันแท้",
    icon: "Sparkles",
    isActive: true,
  },
  {
    id: "srv-extraction-wisdom",
    nameTh: "ถอนฟัน / ผ่าฟันคุด",
    nameEn: "Extraction & Wisdom Tooth Surgery",
    durationMinutes: 45,
    priceMin: 1200,
    priceMax: 4500,
    priceDisplay: "1,200 - 4,500 บาท",
    description: "ผ่าตัดฟันคุด ถอนฟันแท้หรือฟันน้ำนม ด้วยยาชาเฉพาะจุด ปลอดภัย ไร้กังวล",
    icon: "Tooth",
    isActive: true,
  },
  {
    id: "srv-checkup-consult",
    nameTh: "ตรวจสุขภาพช่องปากและฟัน",
    nameEn: "Dental Checkup & Consultation",
    durationMinutes: 30,
    priceMin: 300,
    priceMax: 500,
    priceDisplay: "300 - 500 บาท",
    description: "ตรวจเช็กสภาพฟัน เหงือก และช่องปากเบื้องต้น พร้อมให้คำปรึกษาการวางแผนการรักษา",
    icon: "ShieldCheck",
    isActive: true,
  },
  {
    id: "srv-braces-adjustment",
    nameTh: "ปรับเครื่องมือจัดฟัน",
    nameEn: "Braces Adjustment & Wire Change",
    durationMinutes: 30,
    priceMin: 1000,
    priceMax: 1500,
    priceDisplay: "1,000 - 1,500 บาท",
    description: "เปลี่ยนยาง เปลี่ยนลวดจัดฟัน ตรวจเช็คความเคลื่อนตัวของฟันประจำเดือน",
    icon: "Smile",
    isActive: true,
  },
  {
    id: "srv-root-canal",
    nameTh: "รักษารากฟัน",
    nameEn: "Root Canal Therapy (Endodontics)",
    durationMinutes: 60,
    priceMin: 3500,
    priceMax: 8000,
    priceDisplay: "3,500 - 8,000 บาท",
    description: "รักษาโพรงประสาทฟันติดเชื้อ ป้องกันการสูญเสียฟันแท้ โดยทันตแพทย์เฉพาะทาง",
    icon: "Activity",
    isActive: true,
  },
];

/**
 * สร้างรายการคิวจองจำลอง (Synthetic Booking Records)
 * ครอบคลุมสถานะ PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, REJECTED
 * ครอบคลุมสิทธิการรักษาทั้ง 5 ประเภท
 * ยึดกฎคิวรอบเช้าไม่เกิน 6 คิว
 */
export function getDemoBookings(targetDate?: string): BookingRecord[] {
  const dateToday = targetDate || getRelativeDemoDate(0);
  const now = new Date();

  return [
    // 1. PENDING - รอบเช้า (09:00) | สิทธิบัตรทอง | บัญชีผู้ทดสอบ (U_demo_user_001)
    {
      id: "demo-booking-001",
      queueNumber: "DEN-001",
      date: dateToday,
      time: "09:00",
      period: "MORNING",
      serviceId: "srv-checkup-consult",
      service: DEMO_SERVICES[2],
      patientName: "สมชาย มั่นคง (LINE Demo)",
      phoneNumber: "081-111-2222",
      nationalIdOrHn: "",
      symptoms: "ต้องการตรวจสุขภาพฟันประจำปี",
      isEmergency: false,
      status: "PENDING" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_001",
      lineNotificationSent: true,
      reminderStatus: "PENDING",
      medicalRights: "บัตรทอง",
      createdAt: now,
      updatedAt: now,
    },

    // 2. CONFIRMED - รอบเช้า (09:30) | สิทธิประกันสังคม | บัญชีผู้ทดสอบ (U_demo_user_001)
    {
      id: "demo-booking-002",
      queueNumber: "DEN-002",
      date: dateToday,
      time: "09:30",
      period: "MORNING",
      serviceId: "srv-scaling-filling",
      service: DEMO_SERVICES[0],
      patientName: "สมศรี ใจงาม (LINE Demo)",
      phoneNumber: "089-222-3333",
      nationalIdOrHn: "",
      symptoms: "มีคราบหินปูนและเสียวฟันกรามล่าง",
      isEmergency: false,
      status: "CONFIRMED" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_001",
      lineNotificationSent: true,
      reminderStatus: "ATTENDANCE_CONFIRMED",
      medicalRights: "ประกันสังคม",
      createdAt: now,
      updatedAt: now,
    },

    // 3. CHECKED_IN - รอบเช้า (10:30) | สิทธิข้าราชการ
    {
      id: "demo-booking-003",
      queueNumber: "DEN-003",
      date: dateToday,
      time: "10:30",
      period: "MORNING",
      serviceId: "srv-extraction-wisdom",
      service: DEMO_SERVICES[1],
      patientName: "วิชัย รักดี (LINE Demo)",
      phoneNumber: "086-333-4444",
      nationalIdOrHn: "",
      symptoms: "ฟันคุดเริ่มมีอาการปวดตึง",
      isEmergency: false,
      status: "CHECKED_IN" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_002",
      lineNotificationSent: true,
      reminderStatus: "ATTENDANCE_CONFIRMED",
      medicalRights: "ข้าราชการ",
      createdAt: now,
      updatedAt: now,
    },

    // 4. IN_PROGRESS - รอบเช้า (11:00) | ชำระเงินเอง
    {
      id: "demo-booking-004",
      queueNumber: "DEN-004",
      date: dateToday,
      time: "11:00",
      period: "MORNING",
      serviceId: "srv-braces-adjustment",
      service: DEMO_SERVICES[3],
      patientName: "กานดา สดใส (LINE Demo)",
      phoneNumber: "082-444-5555",
      nationalIdOrHn: "",
      symptoms: "เปลี่ยนยางและลวดจัดฟันประจำเดือน",
      isEmergency: false,
      status: "IN_PROGRESS" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_003",
      lineNotificationSent: true,
      reminderStatus: "ATTENDANCE_CONFIRMED",
      medicalRights: "ชำระเอง",
      createdAt: now,
      updatedAt: now,
    },

    // 5. REJECTED พร้อมเหตุผลจริง - รอบเช้า (10:00) | สิทธิไม่แน่ใจ | บัญชีผู้ทดสอบ (U_demo_user_001)
    {
      id: "demo-booking-005",
      queueNumber: "DEN-005",
      date: dateToday,
      time: "10:00",
      period: "MORNING",
      serviceId: "srv-scaling-filling",
      service: DEMO_SERVICES[0],
      patientName: "อนันต์ เจริญสุข (LINE Demo)",
      phoneNumber: "085-555-6666",
      nationalIdOrHn: "",
      symptoms: null,
      isEmergency: false,
      status: "REJECTED" as BookingStatus,
      rejectReason: "คิวการตรวจเต็มในช่วงเวลาดังกล่าว กรุณาเลือกลงทะเบียนวันถัดไป",
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_001",
      lineNotificationSent: true,
      reminderStatus: "NOT_SENT",
      medicalRights: "ไม่แน่ใจ",
      createdAt: now,
      updatedAt: now,
    },

    // 6. COMPLETED - รอบบ่าย (13:30) | ชำระเงินเอง
    {
      id: "demo-booking-006",
      queueNumber: "DEN-006",
      date: dateToday,
      time: "13:30",
      period: "AFTERNOON",
      serviceId: "srv-root-canal",
      service: DEMO_SERVICES[4],
      patientName: "นภา เพ็ญพักตร์ (LINE Demo)",
      phoneNumber: "088-666-7777",
      nationalIdOrHn: "",
      symptoms: "รักษารากฟันครั้งที่ 2",
      isEmergency: false,
      status: "COMPLETED" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_004",
      lineNotificationSent: true,
      reminderStatus: "ATTENDANCE_CONFIRMED",
      medicalRights: "ชำระเอง",
      createdAt: now,
      updatedAt: now,
    },

    // 7. CONFIRMED - รอบบ่าย (14:00) | สิทธิประกันสังคม
    {
      id: "demo-booking-007",
      queueNumber: "DEN-007",
      date: dateToday,
      time: "14:00",
      period: "AFTERNOON",
      serviceId: "srv-scaling-filling",
      service: DEMO_SERVICES[0],
      patientName: "ธนกร ยิ่งยง (LINE Demo)",
      phoneNumber: "084-777-8888",
      nationalIdOrHn: "",
      symptoms: "ขูดหินปูนใช้สิทธิประกันสังคม 900 บาท",
      isEmergency: false,
      status: "CONFIRMED" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_005",
      lineNotificationSent: true,
      reminderStatus: "RESCHEDULE_REQUESTED",
      medicalRights: "ประกันสังคม",
      createdAt: now,
      updatedAt: now,
    },

    // 8. PENDING - รอบบ่าย (15:00) | สิทธิบัตรทอง
    {
      id: "demo-booking-008",
      queueNumber: "DEN-008",
      date: dateToday,
      time: "15:00",
      period: "AFTERNOON",
      serviceId: "srv-checkup-consult",
      service: DEMO_SERVICES[2],
      patientName: "พิมพา มณีโชติ (LINE Demo)",
      phoneNumber: "080-888-9999",
      nationalIdOrHn: "",
      symptoms: "ปรึกษาเรื่องการจัดฟันใส",
      isEmergency: false,
      status: "PENDING" as BookingStatus,
      rejectReason: null,
      pdpaAccepted: true,
      pdpaAcceptedAt: now,
      lineUserId: "U_demo_user_006",
      lineNotificationSent: false,
      reminderStatus: "NOT_SENT",
      medicalRights: "บัตรทอง",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * คำนวณความพร้อมของสล็อตเวลาจำลอง (Slot Availability)
 * ตรวจสอบความจุและสถานะ AVAILABLE / FULL ตามกฎโควตารอบเช้าและจำกัดต่อสล็อต
 */
export function getDemoSlots(targetDate?: string): SlotAvailability[] {
  const bookings = getDemoBookings(targetDate);
  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

  // นับจำนวนคิว Active รอบเช้า (เวลา < 12:00)
  const activeMorningCount = bookings.filter((b) => {
    const hour = parseInt(b.time.split(":")[0], 10);
    return hour < 12 && activeStatuses.includes(b.status) && !b.isEmergency;
  }).length;

  const isMorningFull = activeMorningCount >= 6;

  return STANDARD_SLOTS.map((slot) => {
    const slotBookings = bookings.filter(
      (b) =>
        b.time === slot.time &&
        activeStatuses.includes(b.status) &&
        !b.isEmergency
    );

    const isSlotCapacityFull = slotBookings.length >= 2;
    const isSlotFull =
      isSlotCapacityFull || (slot.period === "MORNING" && isMorningFull);

    return {
      time: slot.time,
      period: slot.period,
      status: isSlotFull ? ("FULL" as const) : ("AVAILABLE" as const),
      currentBookings: slotBookings.length,
      maxCapacity: 2,
      blockedReason: isSlotFull
        ? slot.period === "MORNING" && isMorningFull
          ? "โควตารอบเช้าเต็มแล้ว (จำกัด 6 คิว)"
          : "สล็อตเวลาเต็มแล้ว"
        : null,
    };
  });
}

/**
 * คำนวณตัวชี้วัด KPIs จำลองสำหรับหน้า Admin Dashboard
 */
export function getDemoKPIs(targetDate?: string): ClinicKPIs {
  const bookings = getDemoBookings(targetDate);

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedTodayCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const inProgressCount = bookings.filter((b) => b.status === "IN_PROGRESS").length;
  const completedTodayCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const emergencyCount = bookings.filter((b) => b.isEmergency).length;

  // คิวหัตถการ (ขูด/อุด/ถอน) ที่ active หรือ completed
  const procedureCount = bookings.filter((b) => {
    if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
    const name = b.service?.nameTh || "";
    return name.includes("ขูด") || name.includes("อุด") || name.includes("ถอน");
  }).length;

  return {
    pendingCount,
    confirmedTodayCount,
    inProgressCount,
    completedTodayCount,
    emergencyCount,
    totalToday: bookings.length,
    procedureCount,
  };
}
