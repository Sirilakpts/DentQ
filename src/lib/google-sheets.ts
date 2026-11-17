import { google } from "googleapis";
import { countActiveMorningBookings } from "./utils";
import { isDemoMode } from "./demo-data";

export interface SheetBookingData {
  bookingId?: string;
  booking_id?: string;
  patientName?: string;
  patient_name?: string;
  service?: string;
  bookingDate?: string;
  booking_date?: string;
  bookingTime?: string;
  booking_time?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  phoneNumber?: string;
  phone_number?: string;
  lineUserId?: string | null;
  line_user_id?: string | null;
  isEmergency?: boolean | string;
  is_emergency?: boolean | string;
  reminderStatus?: string;
  reminder_status?: string;
  medicalRights?: string | null;
  medical_rights?: string | null;
  rejectionReason?: string | null;
  rejection_reason?: string | null;
}

export interface AppendBookingResult {
  success: boolean;
  updatedRange?: string | null;
  updatedRows?: number | null;
  error?: string;
}

export interface SheetBookingRecord {
  rowIndex: number; // ตำแหน่งแถว 1-based ใน Google Sheets (เช่น แถว 2, 3)
  bookingId: string; // Col A: booking_id
  patientName: string; // Col B: patient_name
  service: string; // Col C: service
  bookingDate: string; // Col D: booking_date (YYYY-MM-DD)
  bookingTime: string; // Col E: booking_time (HH:mm)
  status: string; // Col F: status (PENDING, CONFIRMED, etc.)
  createdAt: string; // Col G: created_at
  phoneNumber: string; // Col H: phone_number
  lineUserId: string; // Col I: line_user_id
  isEmergency: boolean; // Col J: is_emergency
  reminderStatus: string; // Col K: reminder_status
  medicalRights: string; // Col L: medical_rights
  rejectionReason: string; // Col M: rejection_reason
}

export const ALLOWED_MEDICAL_RIGHTS = [
  "บัตรทอง",
  "ประกันสังคม",
  "ข้าราชการ",
  "ชำระเอง",
  "ไม่แน่ใจ",
] as const;

export type MedicalRights = (typeof ALLOWED_MEDICAL_RIGHTS)[number] | string;

export function normalizeMedicalRights(val?: string | null): string {
  if (!val) return "";
  const trimmed = val.trim();
  const matched = ALLOWED_MEDICAL_RIGHTS.find(
    (item) => item.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || trimmed;
}

export interface SheetQuotaCounts {
  procedureCount: number; // จำนวนคิวหัตถการ ขูด/อุด/ถอน ในวันนั้น
  slotCount: number; // จำนวนคิวในสล็อตเวลา (date + time)
  morningCount: number; // จำนวนคิว Active ช่วงเช้า (< 12:00 น.) รวมทุกบริการ
  totalDateCount: number; // จำนวนคิวทั้งหมดในวันนั้น
}

export interface UpdateStatusResult {
  success: boolean;
  updatedRange?: string | null;
  newStatus?: string;
  error?: string;
}

function getSheetsClient() {
  if (isDemoMode()) {
    throw new Error("Google Sheets access is blocked in Demo Mode");
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID in environment variables");
  }

  if (!keyFile) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS in environment variables");
  }

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  return { sheets, spreadsheetId };
}

export function parseRow(row: any[], rowIndex: number): SheetBookingRecord {
  const colA = String(row[0] ?? "").trim();
  const colB = String(row[1] ?? "").trim();
  const colC = String(row[2] ?? "").trim();
  const colD = String(row[3] ?? "").trim();

  // ปรับรูปแบบเวลาให้เป็น HH:mm เสมอ (เช่น "9:00" -> "09:00")
  let colE = String(row[4] ?? "").trim();
  if (/^\d:\d{2}$/.test(colE)) {
    colE = `0${colE}`;
  }

  const colF = String(row[5] ?? "").trim().toUpperCase();
  const colG = String(row[6] ?? "").trim();

  // ปรับเบอร์โทรศัพท์กรณี Google Sheets ตัด 0 นำหน้าออก
  let colH = String(row[7] ?? "").trim();
  if (colH.length === 9 && !colH.startsWith("0")) {
    colH = `0${colH}`;
  }

  const colI = String(row[8] ?? "").trim();
  const colJRaw = String(row[9] ?? "").trim().toUpperCase();
  const colJ = colJRaw === "TRUE" || colJRaw === "1";
  const colK = String(row[10] ?? "").trim().toUpperCase();
  const colL = normalizeMedicalRights(String(row[11] ?? ""));
  const colM = String(row[12] ?? "").trim();

  return {
    rowIndex,
    bookingId: colA,
    patientName: colB,
    service: colC,
    bookingDate: colD,
    bookingTime: colE,
    status: colF || "PENDING",
    createdAt: colG,
    phoneNumber: colH,
    lineUserId: colI,
    isEmergency: colJ,
    reminderStatus: colK || "PENDING",
    medicalRights: colL,
    rejectionReason: colM,
  };
}

/**
 * เพิ่มรายการจองคิวลงในแท็บ Bookings ของ Google Sheets (คอลัมน์ A–M)
 */
export async function appendBookingToSheet(
  data: SheetBookingData
): Promise<AppendBookingResult> {
  if (isDemoMode()) {
    console.log("[Demo Mode] appendBookingToSheet blocked (Air-gapped)");
    return {
      success: false,
      error: "Google Sheets write is blocked in Demo Mode",
    };
  }

  const bookingId = (data.bookingId || data.booking_id || "").trim();
  const patientName = (data.patientName || data.patient_name || "").trim();
  const service = (data.service || "").trim();
  const bookingDate = (data.bookingDate || data.booking_date || "").trim();
  const bookingTime = (data.bookingTime || data.booking_time || "").trim();
  const status = (data.status || "PENDING").trim();
  const createdAt = (data.createdAt || data.created_at || new Date().toISOString()).trim();
  const phoneNumber = (data.phoneNumber || data.phone_number || "").trim();
  const lineUserId = (data.lineUserId || data.line_user_id || "").trim();

  const isEmergencyRaw = data.isEmergency !== undefined ? data.isEmergency : data.is_emergency;
  const isEmergency =
    typeof isEmergencyRaw === "boolean"
      ? isEmergencyRaw
      : Boolean(isEmergencyRaw && isEmergencyRaw !== "false");
  const reminderStatus = (data.reminderStatus || data.reminder_status || "PENDING").trim();
  const medicalRights = normalizeMedicalRights(
    data.medicalRights || data.medical_rights || ""
  );
  const rejectionReason = (
    data.rejectionReason ||
    data.rejection_reason ||
    ""
  ).trim().slice(0, 500);

  // ตรวจสอบข้อมูลที่จำเป็นก่อนบันทึก
  if (!bookingId) {
    return {
      success: false,
      error: "Validation Error: booking_id is required",
    };
  }
  if (!patientName) {
    return {
      success: false,
      error: "Validation Error: patient_name is required",
    };
  }
  if (!service) {
    return {
      success: false,
      error: "Validation Error: service is required",
    };
  }
  if (!bookingDate) {
    return {
      success: false,
      error: "Validation Error: booking_date is required",
    };
  }
  if (!bookingTime) {
    return {
      success: false,
      error: "Validation Error: booking_time is required",
    };
  }

  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    const rowValues = [
      bookingId,
      patientName,
      service,
      bookingDate,
      bookingTime,
      status,
      createdAt,
      phoneNumber,
      lineUserId,
      isEmergency,
      reminderStatus,
      medicalRights,
      rejectionReason,
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Bookings!A:M",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValues],
      },
    });

    return {
      success: true,
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
    };
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to append booking to Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );

    return {
      success: false,
      error: safeMessage,
    };
  }
}

/**
 * อ่านรายการจองทั้งหมดจาก Google Sheets (แท็บ Bookings แถว 2 เป็นต้นไป ครอบคลุมคอลัมน์ A–M)
 */
export async function getAllBookingsFromSheet(): Promise<SheetBookingRecord[]> {
  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Bookings!A2:M",
    });

    const rows = response.data.values || [];
    return rows
      .map((row, index) => parseRow(row, index + 2))
      .filter((b) => Boolean(b.bookingId));
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to read bookings from Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );
    throw new Error(safeMessage);
  }
}

/**
 * ค้นหาข้อมูลการจองด้วย booking_id (หรือ queueNumber)
 * หากพบแถวซ้ำ จะเลือกแถวล่าสุด (แถวล่างสุด)
 */
export async function getBookingByIdFromSheet(
  bookingId: string
): Promise<SheetBookingRecord | null> {
  const targetId = bookingId.trim().toUpperCase();
  if (!targetId) return null;

  const allBookings = await getAllBookingsFromSheet();
  const matches = allBookings.filter(
    (b) => b.bookingId.toUpperCase() === targetId
  );

  if (matches.length === 0) {
    return null;
  }

  // จัดการกรณีแถวซ้ำ: คืนค่ารายการล่าสุด
  return matches[matches.length - 1];
}

/**
 * ค้นหารายการจองด้วยเบอร์โทรศัพท์ (สำหรับหน้า Tracking)
 */
export async function findBookingsByPhoneFromSheet(
  phone: string
): Promise<SheetBookingRecord[]> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];

  const allBookings = await getAllBookingsFromSheet();
  return allBookings.filter((b) => {
    const bDigits = b.phoneNumber.replace(/\D/g, "");
    return bDigits.includes(digits) || digits.includes(bDigits);
  });
}

/**
 * ค้นหารายการจองด้วย LINE User ID (สำหรับระบบ LINE-First Tracking)
 * ป้องกันการเปิดเผยข้อมูลข้ามบัญชี และคืนค่ารายการล่าสุดของแต่ละ bookingId
 */
export async function findBookingsByLineUserIdFromSheet(
  lineUserId: string
): Promise<SheetBookingRecord[]> {
  const targetId = (lineUserId || "").trim();
  if (!targetId) return [];

  const allBookings = await getAllBookingsFromSheet();
  const map = new Map<string, SheetBookingRecord>();

  for (const b of allBookings) {
    if ((b.lineUserId || "").trim() === targetId) {
      map.set(b.bookingId.toUpperCase(), b);
    }
  }

  return Array.from(map.values());
}

/**
 * นับจำนวนคิวรายวันและสล็อตเวลาเพื่อเช็กโควตา
 *
 * กฎการนับโควตา:
 * 1. ไม่นับ Booking ID ที่ขึ้นต้นด้วย 'TEST-' (ข้อมูลทดสอบ)
 * 2. ไม่นับสถานะ CANCELLED และ REJECTED
 * 3. สถานะนับสล็อตเวลา (2 คิว/สล็อต): PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS (และ isEmergency = false)
 * 4. สถานะนับโควตาหัตถการ (6 คิว/วัน): PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED (ขูด/อุด/ถอน ไม่นับตรวจฟัน)
 */
export async function countBookingsFromSheet(params: {
  date: string;
  time?: string;
  serviceName?: string;
}): Promise<SheetQuotaCounts> {
  const allBookings = await getAllBookingsFromSheet();

  // กรองเฉพาะวันที่ต้องการ และไม่นับ Booking ID ข้อมูลทดสอบ (ขึ้นต้นด้วย 'TEST-' หรือ 'DQ-TEST-')
  const dateBookings = allBookings.filter((b) => {
    if (b.bookingDate !== params.date) return false;
    const upperId = b.bookingId.toUpperCase();
    if (upperId.startsWith("TEST-") || upperId.startsWith("DQ-TEST-") || upperId.includes("TEST")) {
      return false;
    }
    return true;
  });

  // สถานะที่นับในสล็อตเวลา (ไม่นับ CANCELLED, REJECTED, COMPLETED)
  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

  // สถานะที่นับในโควตาหัตถการ 6 คิว/วัน (ไม่นับ CANCELLED, REJECTED)
  const quotaStatuses = [
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  // นับคิวในสล็อตเวลาเฉพาะรายการ active ที่ไม่ใช่คิวฉุกเฉิน
  let slotCount = 0;
  if (params.time) {
    slotCount = dateBookings.filter(
      (b) =>
        b.bookingTime === params.time &&
        activeStatuses.includes(b.status) &&
        !b.isEmergency
    ).length;
  }

  // นับโควตาหัตถการ (ขูดหินปูน / อุดฟัน / ถอนฟัน) สูงสุด 6 คิว/วัน
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

  // กรอง totalDateCount ให้ไม่รวมรายการที่ยกเลิกหรือปฏิเสธ
  const validDateBookings = dateBookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "REJECTED"
  );

  // นับคิวรอบเช้า Active รวมทุกบริการ (< 12:00 น.)
  const morningCount = countActiveMorningBookings(dateBookings);

  return {
    procedureCount,
    slotCount,
    morningCount,
    totalDateCount: validDateBookings.length,
  };
}

/**
 * อัปเดตสถานะคิวใน Google Sheets เฉพาะคอลัมน์ F (status)
 * และหากระบุ rejectReason จะอัปเดตคอลัมน์ M (rejection_reason) ด้วย
 */
export async function updateBookingStatusInSheet(
  bookingId: string,
  newStatus: string,
  rejectReason?: string | null
): Promise<UpdateStatusResult> {
  if (isDemoMode()) {
    console.log("[Demo Mode] updateBookingStatusInSheet blocked (Air-gapped)");
    return {
      success: false,
      error: "Google Sheets update is blocked in Demo Mode",
    };
  }

  const booking = await getBookingByIdFromSheet(bookingId);
  if (!booking) {
    return {
      success: false,
      error: `Booking ID '${bookingId}' not found in Google Sheets`,
    };
  }

  const normalizedStatus = newStatus.trim().toUpperCase();

  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    // หากมีการระบุ rejectReason (เช่น สถานะ REJECTED) ให้บันทึกพร้อมกันทั้ง Col F (status) และ Col M (rejection_reason) ด้วย batchUpdate
    if (rejectReason !== undefined && rejectReason !== null) {
      const cleanReason = String(rejectReason).trim().slice(0, 500);
      const response = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: `Bookings!F${booking.rowIndex}`,
              values: [[normalizedStatus]],
            },
            {
              range: `Bookings!M${booking.rowIndex}`,
              values: [[cleanReason]],
            },
          ],
        },
      });

      return {
        success: true,
        updatedRange: `Bookings!F${booking.rowIndex},M${booking.rowIndex}`,
        newStatus: normalizedStatus,
      };
    }

    // อัปเดตเฉพาะคอลัมน์ F ของแถวที่พบ
    const cellRange = `Bookings!F${booking.rowIndex}`;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cellRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[normalizedStatus]],
      },
    });

    return {
      success: true,
      updatedRange: response.data.updatedRange,
      newStatus: normalizedStatus,
    };
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to update booking status in Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );

    return {
      success: false,
      error: safeMessage,
    };
  }
}

/**
 * อัปเดตเหตุผลการไม่อนุมัติ (rejection_reason) ใน Google Sheets เฉพาะคอลัมน์ M
 */
export async function updateBookingRejectionReasonInSheet(
  bookingId: string,
  rejectReason: string
): Promise<UpdateStatusResult> {
  if (isDemoMode()) {
    return {
      success: false,
      error: "Google Sheets update is blocked in Demo Mode",
    };
  }

  const booking = await getBookingByIdFromSheet(bookingId);
  if (!booking) {
    return {
      success: false,
      error: `Booking ID '${bookingId}' not found in Google Sheets`,
    };
  }

  const cleanReason = String(rejectReason || "").trim().slice(0, 500);

  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    // อัปเดตเฉพาะคอลัมน์ M ของแถวที่พบ
    const cellRange = `Bookings!M${booking.rowIndex}`;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cellRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[cleanReason]],
      },
    });

    return {
      success: true,
      updatedRange: response.data.updatedRange,
      newStatus: cleanReason,
    };
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to update rejection reason in Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );

    return {
      success: false,
      error: safeMessage,
    };
  }
}

/**
 * อัปเดต reminder_status ใน Google Sheets เฉพาะคอลัมน์ K (reminder_status)
 * สำหรับบันทึก ATTENDANCE_CONFIRMED หรือ RESCHEDULE_REQUESTED โดยไม่กระทบคอลัมน์หลัก F
 */
export async function updateBookingReminderStatusInSheet(
  bookingId: string,
  reminderStatus: string
): Promise<UpdateStatusResult> {
  if (isDemoMode()) {
    return {
      success: false,
      error: "Google Sheets update is blocked in Demo Mode",
    };
  }

  const booking = await getBookingByIdFromSheet(bookingId);
  if (!booking) {
    return {
      success: false,
      error: `Booking ID '${bookingId}' not found in Google Sheets`,
    };
  }

  const normalizedStatus = reminderStatus.trim().toUpperCase();

  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    // อัปเดตเฉพาะคอลัมน์ K ของแถวที่พบ
    const cellRange = `Bookings!K${booking.rowIndex}`;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cellRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[normalizedStatus]],
      },
    });

    return {
      success: true,
      updatedRange: response.data.updatedRange,
      newStatus: normalizedStatus,
    };
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to update reminder status in Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );

    return {
      success: false,
      error: safeMessage,
    };
  }
}

/**
 * อัปเดตยืนยันการเข้ารับบริการ (status = CONFIRMED, reminder_status = ATTENDANCE_CONFIRMED)
 * ใน Google Sheets สำหรับ Col F และ Col K พร้อมกันด้วย batchUpdate
 */
export async function confirmBookingAttendanceInSheet(
  bookingId: string
): Promise<UpdateStatusResult> {
  const booking = await getBookingByIdFromSheet(bookingId);
  if (!booking) {
    return {
      success: false,
      error: `Booking ID '${bookingId}' not found in Google Sheets`,
    };
  }

  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: `Bookings!F${booking.rowIndex}`,
            values: [["CONFIRMED"]],
          },
          {
            range: `Bookings!K${booking.rowIndex}`,
            values: [["ATTENDANCE_CONFIRMED"]],
          },
        ],
      },
    });

    return {
      success: true,
      updatedRange: `Bookings!F${booking.rowIndex},K${booking.rowIndex}`,
      newStatus: "CONFIRMED",
    };
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to confirm booking attendance in Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );

    return {
      success: false,
      error: safeMessage,
    };
  }
}

/**
 * อัปเดตสิทธิการรักษา (medical_rights) ใน Google Sheets เฉพาะคอลัมน์ L
 */
export async function updateBookingMedicalRightsInSheet(
  bookingId: string,
  medicalRights: string
): Promise<UpdateStatusResult> {
  const booking = await getBookingByIdFromSheet(bookingId);
  if (!booking) {
    return {
      success: false,
      error: `Booking ID '${bookingId}' not found in Google Sheets`,
    };
  }

  const normalized = normalizeMedicalRights(medicalRights);

  try {
    const { sheets, spreadsheetId } = getSheetsClient();

    // อัปเดตเฉพาะคอลัมน์ L ของแถวที่พบ
    const cellRange = `Bookings!L${booking.rowIndex}`;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cellRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[normalized]],
      },
    });

    return {
      success: true,
      updatedRange: response.data.updatedRange,
      newStatus: normalized,
    };
  } catch (err: unknown) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Failed to update medical rights in Google Sheets";
    const safeMessage = rawMessage.replace(
      /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
      "[REDACTED]"
    );

    return {
      success: false,
      error: safeMessage,
    };
  }
}

/**
 * คำนวณรหัสคิว Monotonic ถัดไปสำหรับ Google Sheets (เช่น DEN-001, DEN-002, ...)
 * โดยอ่านรหัสทั้งหมดจากแท็บ Bookings แล้วหาค่าตัวเลขสูงสุดของ DEN-xxx
 */
export async function getNextBookingIdFromSheet(
  prefix = "DEN",
  existingBookings?: SheetBookingRecord[]
): Promise<string> {
  const bookings = existingBookings ?? (await getAllBookingsFromSheet());
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let maxNum = 0;
  for (const b of bookings) {
    const match = b.bookingId.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
}
