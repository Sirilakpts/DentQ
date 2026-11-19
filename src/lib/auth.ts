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
 * ตรวจสอบว่าบัญชี LINE User ID ได้รับอนุญาตให้เข้าถึงระบบ UAT หรือไม่
 * ในโหมด UAT (เมื่อเชื่อมต่อ Google Sheets และไม่ใช่ Demo Mode):
 * บังคับให้เฉพาะ LINE User ID ที่ระบุใน UAT_LINE_ALLOWLIST เท่านั้น
 * ที่สามารถสร้างการจองคิว ดูข้อมูล หรือจัดการคิวได้
 * เพื่อป้องกันบุคคลภายนอกสร้างการจองหรือเข้าถึงข้อมูล UAT
 *
 * ข้อกำหนดความปลอดภัย:
 * - LINE_NOTIF_ALLOWLIST ใช้ควบคุมผู้รับการแจ้งเตือนเท่านั้น ห้ามใช้แทนสิทธิ์จองคิว
 * - รองรับหลายบัญชี คั่นด้วย comma ตัดช่องว่าง และกรองค่าที่ไม่ถูกต้องออก
 * - ห้าม Hardcode บัญชีผู้ใช้ในโค้ด
 */
export function isUatUserAllowlisted(lineUserId?: string | null): boolean {
  if (!lineUserId || !lineUserId.trim()) return false;

  const cleanUserId = lineUserId.trim();

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
