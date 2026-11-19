/**
 * src/lib/liff.ts
 * Centralized LINE LIFF configuration & endpoint resolution for DentQ
 */

export const UAT_PREVIEW_CANONICAL_ORIGIN = "https://dent-q-git-uat-sirilakpts.vercel.app";
export const PRODUCTION_CANONICAL_ORIGIN = "https://dent-q-pi.vercel.app";

/**
 * ดึงค่า LIFF ID ที่ถูกต้องตาม Environment และ Hostname
 *
 * ลำดับการตรวจสอบสำหรับ UAT / Preview / Non-Production:
 * 1. NEXT_PUBLIC_LIFF_ID_UAT
 * 2. NEXT_PUBLIC_LIFF_ID_PREVIEW
 * 3. NEXT_PUBLIC_LIFF_ID (หากผู้ใช้ตั้ง Scope Preview บน Vercel)
 */
export function getLiffId(): string | undefined {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const isProduction = host === "dent-q-pi.vercel.app";

    // หากอยู่บน UAT / Preview / Staging
    if (!isProduction) {
      const uatId =
        process.env.NEXT_PUBLIC_LIFF_ID_UAT ||
        process.env.NEXT_PUBLIC_LIFF_ID_PREVIEW;
      if (uatId && uatId.trim()) {
        return uatId.trim();
      }
    }
  }

  // Production หรือ Fallback จาก NEXT_PUBLIC_LIFF_ID
  return (
    process.env.NEXT_PUBLIC_LIFF_ID_UAT ||
    process.env.NEXT_PUBLIC_LIFF_ID_PREVIEW ||
    process.env.NEXT_PUBLIC_LIFF_ID
  )?.trim();
}

/**
 * สร้าง redirectUri ที่ปลอดภัยและตรงกับ Endpoint URL ที่ลงทะเบียนไว้ใน LINE Developers Console เสมอ
 * ป้องกันปัญหา LINE OAuth 400 Bad Request: Invalid redirect_uri
 */
export function getLiffRedirectUri(subPath: string = "/book"): string {
  if (typeof window === "undefined") return subPath;

  const host = window.location.hostname.toLowerCase();
  const cleanPath = subPath.startsWith("/") ? subPath : `/${subPath}`;

  // หากอยู่บน Production Domain
  if (host === "dent-q-pi.vercel.app") {
    return `${PRODUCTION_CANONICAL_ORIGIN}${cleanPath}`;
  }

  // หากอยู่บน Vercel (ทั้ง branch alias dent-q-git-uat และ deployment URL *.vercel.app)
  if (host.includes("vercel.app") || host.includes("uat")) {
    return `${UAT_PREVIEW_CANONICAL_ORIGIN}${cleanPath}`;
  }

  // Local development fallback
  return `${window.location.origin}${cleanPath}`;
}

/**
 * ดึงข้อมูลโปรไฟล์ LINE อย่างปลอดภัย (Safe Profile Resolution)
 * 1. พยายามเรียก liff.getProfile() เพื่อดึงโปรไฟล์จาก LINE SDK
 * 2. หากเกิด Error (เช่น "The permission is not in LIFF app scope.")
 *    จะ Fallback ไปถอดรหัสจาก ID Token (liff.getDecodedIDToken()) ซึ่งต้องการเพียงสิทธิ์ openid
 * 3. ไม่เปิดเผย Token หรือข้อมูลลับลง Log (Zero-Leakage)
 */
export async function getSafeLiffProfile(liff: any): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
} | null> {
  if (!liff) return null;

  try {
    const profile = await liff.getProfile();
    if (profile && (profile.userId || profile.displayName)) {
      return {
        userId: profile.userId,
        displayName: profile.displayName || "ผู้ใช้ LINE",
        pictureUrl: profile.pictureUrl || undefined,
      };
    }
  } catch (err: any) {
    const errMsg = (err?.message || "").toLowerCase();
    const isPermissionError =
      errMsg.includes("permission") ||
      errMsg.includes("scope") ||
      errMsg.includes("not in liff app scope");

    // Fallback เฉพาะกรณีเกิด Permission / Scope Error เท่านั้น และไม่กลบข้อผิดพลาดประเภทอื่น
    if (isPermissionError) {
      console.warn(
        "[LIFF SafeProfile] Permission error in liff.getProfile(), falling back to ID token claims:",
        err?.message || "Scope restriction"
      );
    } else {
      // ข้อผิดพลาดอื่น (เช่น Network Error หรือ Fatal SDK Error) จะไม่ถูกกลบ และโยนต่อให้ caller จัดการตามปกติ
      console.error("[LIFF SafeProfile] Non-permission error in liff.getProfile():", err?.message || err);
      throw err;
    }
  }

  try {
    if (typeof liff.getDecodedIDToken === "function") {
      const decoded = liff.getDecodedIDToken();
      if (decoded && (decoded.sub || decoded.userId)) {
        return {
          userId: decoded.sub || decoded.userId,
          displayName: decoded.name || "ผู้ใช้ LINE",
          pictureUrl: decoded.picture || undefined,
        };
      }
    }
  } catch (decodeErr: any) {
    console.warn(
      "[LIFF SafeProfile] Failed to decode ID token claims:",
      decodeErr?.message || "Decode error"
    );
  }

  return null;
}

