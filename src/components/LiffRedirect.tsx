"use client";

import { useEffect } from "react";

/**
 * LiffRedirect Component
 * ตรวจจับและประมวลผล parameter liff.state จาก LINE OA Rich Menu
 * เมื่อผู้ใช้กดเมนูใน LINE OA (เช่น จองคิว หรือ ตรวจสอบคิว)
 * LINE จะส่งค่า liff.state มายัง Endpoint URL (หน้า Home /)
 * Component นี้จะทำการนำทางไปยังหน้าที่ถูกต้องโดยอัตโนมัติ
 */
export default function LiffRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const search = window.location.search;
      if (!search) return;

      const params = new URLSearchParams(search);
      const rawState = params.get("liff.state") || params.get("liffState") || params.get("path");
      if (!rawState) return;

      let target = decodeURIComponent(rawState).trim();
      if (target.startsWith("?path=")) target = target.replace("?path=", "");
      if (target.startsWith("path=")) target = target.replace("path=", "");
      if (target.startsWith("?redirect=")) target = target.replace("?redirect=", "");
      if (target.startsWith("redirect=")) target = target.replace("redirect=", "");

      if (target.startsWith("/book") || target === "book") {
        window.location.replace("/book");
      } else if (target.startsWith("/tracking") || target === "tracking" || target.includes("tracking")) {
        const dest = target.startsWith("/") ? target : `/${target}`;
        window.location.replace(dest);
      }
    } catch (err) {
      console.warn("[LIFF Redirect] Error parsing liff.state:", err);
    }
  }, []);

  return null;
}
