import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Thai Month Names
export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

export const THAI_DAYS = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"
];

// Format date to Thai Buddhist Era (พ.ศ.)
export function formatThaiDate(dateStr: string, options: { short?: boolean; includeDay?: boolean } = {}): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const d = new Date(year, month, day);
    const buddhistYear = year + 543;
    const monthName = options.short ? THAI_MONTHS_SHORT[month] : THAI_MONTHS[month];
    
    if (options.includeDay) {
      const dayName = THAI_DAYS[d.getDay()];
      return `วัน${dayName}ที่ ${day} ${monthName} ${buddhistYear}`;
    }
    
    return `${day} ${monthName} ${buddhistYear}`;
  } catch {
    return dateStr;
  }
}

// Mask Phone Number for PDPA (081-xxx-1234)
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-xxx-${cleaned.slice(7)}`;
  }
  return phone;
}

// Format Phone Number (081-234-5678)
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Mask National ID / HN for PDPA (e.g. 1-1234-xxxxx-90-1 or HN-***567)
export function maskNationalIdOrHn(val: string): string {
  if (!val) return "";
  const cleaned = val.trim();
  if (cleaned.toUpperCase().startsWith("HN")) {
    if (cleaned.length > 5) {
      return `HN-***${cleaned.slice(-3)}`;
    }
    return `HN-***`;
  }
  
  // National ID 13 digits
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 13) {
    return `${digits[0]}-${digits.slice(1, 5)}-xxxxx-${digits.slice(10, 12)}-${digits[12]}`;
  }
  
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
  }
  return "***";
}

// Standard Available Dental Slots (Morning 09:00 - 12:00, Afternoon 13:00 - 16:00)
export const STANDARD_SLOTS = [
  // Morning
  { time: "09:00", period: "MORNING" as const },
  { time: "09:30", period: "MORNING" as const },
  { time: "10:00", period: "MORNING" as const },
  { time: "10:30", period: "MORNING" as const },
  { time: "11:00", period: "MORNING" as const },
  { time: "11:30", period: "MORNING" as const },
  // Afternoon
  { time: "13:00", period: "AFTERNOON" as const },
  { time: "13:30", period: "AFTERNOON" as const },
  { time: "14:00", period: "AFTERNOON" as const },
  { time: "14:30", period: "AFTERNOON" as const },
  { time: "15:00", period: "AFTERNOON" as const },
  { time: "15:30", period: "AFTERNOON" as const },
];

/**
 * ตรวจสอบว่าช่วงเวลาเป็นช่วงเช้าหรือไม่ (ก่อน 12:00 น.)
 */
export function isMorningTime(timeStr: string): boolean {
  if (!timeStr) return false;
  const parts = timeStr.trim().split(":");
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return false;
  return hour < 12;
}

/**
 * สถานะการจองที่ถือว่าเป็น Active Booking สำหรับการนับโควตา
 */
export const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
] as const;

/**
 * ค่าโควตาสูงสุดของรอบเช้า (รวมทุกบริการ)
 */
export const MORNING_MAX_CAPACITY = 6;

/**
 * นับจำนวนคิวรอบเช้าที่ Active รวมทุกบริการ (ไม่รวม CANCELLED, REJECTED, หรือ คิวฉุกเฉิน)
 * ออกแบบเพื่อใช้ร่วมกันทั้ง Slots API และ Booking API (Step 2.3)
 */
export function countActiveMorningBookings(
  bookings: Array<{
    time?: string;
    bookingTime?: string;
    status: string;
    isEmergency?: boolean;
    bookingId?: string;
    id?: string;
  }>
): number {
  const activeStatuses: string[] = [...ACTIVE_BOOKING_STATUSES];
  return bookings.filter((b) => {
    // กรองข้อมูลทดสอบ
    const id = (b.bookingId || b.id || "").toUpperCase();
    if (id.startsWith("TEST-") || id.startsWith("DQ-TEST-") || id.includes("TEST")) {
      return false;
    }
    // ไม่นับเคสฉุกเฉินในโควตาสล็อตปกติ
    if (b.isEmergency) return false;
    // สถานะต้อง active
    if (!activeStatuses.includes((b.status || "").toUpperCase())) return false;
    // เวลาต้องเป็นช่วงเช้า (< 12:00 น.)
    const time = b.bookingTime || b.time || "";
    return isMorningTime(time);
  }).length;
}

// Helper to get allowed booking dates (min 1 day prior, max 7 days in advance)
export function getBookableDateRange(currentDate = new Date()): { minDate: string; maxDate: string; availableDates: string[] } {
  // Format as YYYY-MM-DD
  const dates: string[] = [];
  
  // start tomorrow (1 day ahead)
  for (let i = 1; i <= 7; i++) {
    const target = new Date(currentDate);
    target.setDate(target.getDate() + i);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  
  return {
    minDate: dates[0],
    maxDate: dates[dates.length - 1],
    availableDates: dates,
  };
}
