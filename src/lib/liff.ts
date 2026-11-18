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
