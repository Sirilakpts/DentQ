/**
 * src/lib/auth.ts
 * DentQ Server-side Admin Authentication Module
 *
 * Provides cryptographic session token generation and verification for Admin APIs
 * Ensures demo_token is strictly rejected when accessing live or UAT Google Sheets data
 */

import crypto from "crypto";

const DEFAULT_ADMIN_EMAIL = "admin@dentq.com";
const DEFAULT_DEV_PASSWORD = "dentqadmin2026!";

/**
 * Get secret key for signing admin session tokens
 */
function getAuthSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.LINE_CHANNEL_SECRET ||
    "dentq-production-admin-auth-secret-key-2026"
  );
}

/**
 * Create a signed admin session token: "admin:<email>:<timestamp>:<hmac>"
 */
export function createAdminSessionToken(email: string): string {
  const secret = getAuthSecret();
  const timestamp = Date.now();
  const cleanEmail = email.trim().toLowerCase();
  const payload = `admin:${cleanEmail}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${hmac}`;
}

/**
 * Verify admin credentials against environment variables
 */
export function verifyAdminCredentials(
  email?: string | null,
  password?: string | null
): boolean {
  if (!email || !password) return false;

  const expectedEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_DEV_PASSWORD;

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Constant-time comparison to prevent timing attacks
  const emailMatch = crypto.timingSafeEqual(
    Buffer.from(cleanEmail.padEnd(64)),
    Buffer.from(expectedEmail.padEnd(64))
  );

  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(cleanPassword.padEnd(64)),
    Buffer.from(expectedPassword.padEnd(64))
  );

  return emailMatch && passwordMatch;
}

/**
 * Verify admin session token
 * If isSheetsMode is true, demo_token or demo_admin_token is strictly rejected!
 */
export function verifyAdminSessionToken(
  token: string | undefined | null,
  isSheetsMode: boolean = false
): { valid: boolean; error?: string; email?: string } {
  if (!token || !token.trim()) {
    return { valid: false, error: "Missing admin session cookie" };
  }

  const cleanToken = token.trim();

  // ในโหมด Google Sheets (UAT/Production): ห้ามใช้ demo_token หรือ demo_admin_token เด็ดขาด
  if (isSheetsMode) {
    if (cleanToken === "demo_token" || cleanToken === "demo_admin_token") {
      return {
        valid: false,
        error: "Forbidden: demo_token cannot access live or UAT Google Sheets data. Please log in with admin credentials.",
      };
    }
  } else {
    // ในโหมด Demo ปกติ อนุญาต demo_token / demo_admin_token ได้
    if (cleanToken === "demo_token" || cleanToken === "demo_admin_token") {
      return { valid: true, email: "demo-admin@dentq.com" };
    }
  }

  // Parse signed token: "admin:<email>:<timestamp>:<hmac>"
  const parts = cleanToken.split(":");
  if (parts.length !== 4 || parts[0] !== "admin") {
    return { valid: false, error: "Invalid admin session token format" };
  }

  const [_, email, timestampStr, hmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false, error: "Invalid session timestamp" };
  }

  // Token expires after 24 hours
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > MAX_AGE_MS) {
    return { valid: false, error: "Admin session expired. Please log in again." };
  }

  // Verify HMAC signature
  const secret = getAuthSecret();
  const payload = `admin:${email}:${timestampStr}`;
  const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
    return { valid: false, error: "Invalid session signature" };
  }

  return { valid: true, email };
}

/**
 * ตรวจสอบเงื่อนไขความปลอดภัยว่าระบบได้รับอนุญาตให้เปิดรับการจองแบบสาธารณะในโหมด UAT หรือไม่
 * ต้องผ่านเงื่อนไขครบทั้ง 6 ข้ออย่างเคร่งครัด:
 * 1. UAT_OPEN_BOOKING === "true"
 * 2. VERCEL_ENV === "preview" (ห้ามเปิดใน production เด็ดขาด)
 * 3. VERCEL_GIT_COMMIT_REF === "uat" (ต้องเป็น Branch uat ที่ยืนยันได้)
 * 4. DEMO_MODE === "false"
 * 5. BOOKING_STORAGE === "sheets"
 * 6. มี GOOGLE_SHEETS_UAT_SPREADSHEET_ID (ชี้ไปยัง Google Sheets สำหรับ UAT โดยเฉพาะ)
 */
export function isUatOpenBookingEnabled(): boolean {
  // 1. UAT_OPEN_BOOKING ต้องเป็น true
  const isOpen = (process.env.UAT_OPEN_BOOKING || "").trim().toLowerCase() === "true";
  if (!isOpen) return false;

  // 2. VERCEL_ENV ต้องเป็น preview เท่านั้น (ห้ามเปิดใน production เด็ดขาด)
  const vercelEnv = (process.env.VERCEL_ENV || "").trim().toLowerCase();
  if (vercelEnv !== "preview") return false;

  // 3. อยู่ใน Branch uat ที่ยืนยันได้
  const gitBranch = (process.env.VERCEL_GIT_COMMIT_REF || "").trim().toLowerCase();
  if (gitBranch !== "uat") return false;

  // 4. DEMO_MODE ต้องเป็น false
  const demoMode = (process.env.DEMO_MODE || "").trim().toLowerCase();
  if (demoMode !== "false") return false;

  // 5. BOOKING_STORAGE ต้องเป็น sheets
  const bookingStorage = (process.env.BOOKING_STORAGE || "").trim().toLowerCase();
  if (bookingStorage !== "sheets") return false;

  // 6. มี GOOGLE_SHEETS_UAT_SPREADSHEET_ID ชี้ไปยังชีต UAT
  const uatSheetId = (process.env.GOOGLE_SHEETS_UAT_SPREADSHEET_ID || "").trim();
  if (!uatSheetId) return false;

  return true;
}

/**
 * ตรวจสอบว่าบัญชี LINE User ID ได้รับอนุญาตให้เข้าถึงระบบ UAT หรือไม่
 * ในโหมด UAT (เมื่อเชื่อมต่อ Google Sheets และไม่ใช่ Demo Mode):
 * บังคับให้เฉพาะ LINE User ID ที่ระบุใน UAT_LINE_ALLOWLIST เท่านั้น
 * ที่สามารถสร้างการจองคิว ดูข้อมูล หรือจัดการคิวได้
 * เพื่อป้องกันบุคคลภายนอกสร้างการจองหรือเข้าถึงข้อมูล UAT
 *
 * ข้อยกเว้นความปลอดภัย (UAT Open Booking Mode):
 * หากผ่านเงื่อนไข Server-side isUatOpenBookingEnabled() ครบทั้ง 6 ข้อ
 * จะอนุญาตให้ทุกบัญชี LINE ที่ยืนยันตัวตนสำเร็จทดสอบจองคิวได้ โดยไม่ต้องใส่ User ID ใน Allowlist ทีละคน
 *
 * ข้อกำหนดความปลอดภัย:
 * - LINE_NOTIF_ALLOWLIST ใช้ควบคุมผู้รับการแจ้งเตือนเท่านั้น ห้ามใช้แทนสิทธิ์จองคิว
 * - หากเงื่อนไข UAT Open Booking ไม่ครบ ให้กลับไปใช้ UAT_LINE_ALLOWLIST เดิมทันที (Fail-Safe)
 * - รองรับหลายบัญชี คั่นด้วย comma ตัดช่องว่าง และกรองค่าที่ไม่ถูกต้องออก
 * - ห้าม Hardcode บัญชีผู้ใช้ในโค้ด
 */
export function isUatUserAllowlisted(lineUserId?: string | null): boolean {
  if (!lineUserId || !lineUserId.trim()) return false;

  const cleanUserId = lineUserId.trim();

  // 1. หากผ่านเงื่อนไข Server-side UAT Open Booking ครบถ้วน อนุญาตให้ทุกบัญชี LINE ที่ผ่านการยืนยันตัวตน
  if (isUatOpenBookingEnabled()) {
    return true;
  }

  // 2. หากเงื่อนไขไม่ครบ: ใช้ UAT_LINE_ALLOWLIST เดิมตามปกติ ห้ามข้ามการตรวจสิทธิ์อัตโนมัติ
  // อ่านเฉพาะ UAT_LINE_ALLOWLIST เท่านั้น (ห้ามใช้ LINE_NOTIF_ALLOWLIST แทนสิทธิ์จองคิว)
  const rawEnv = (process.env.UAT_LINE_ALLOWLIST || "")
    .replace(/^["']|["']$/g, "")
    .trim();

  // หากไม่มีการกำหนด Allowlist: ปลอดภัยไว้ก่อนโดยปฏิเสธการเข้าถึง UAT ทั้งหมด (Fail-Safe)
  if (!rawEnv) {
    return false;
  }

  // หากระบุเป็น "*" จึงจะอนุญาตทุกบัญชี
  if (rawEnv === "*") {
    return true;
  }

  // แยกด้วย comma, ตัดช่องว่าง, ตัดเครื่องหมายคำพูด, ปฏิเสธค่าที่ไม่ถูกต้อง
  const allowedList = rawEnv
    .split(",")
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .filter((s) => s.length > 0 && !/\s/.test(s))
    .map((s) => s.toLowerCase());

  return allowedList.includes(cleanUserId.toLowerCase());
}
