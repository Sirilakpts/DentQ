"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { getLiffId } from "@/lib/liff";

/**
 * LiffRedirect Component
 * ตรวจจับและประมวลผล parameter liff.state จาก LINE OA Rich Menu
 * ต้องรอให้ liff.init() ทำงานเสร็จสมบูรณ์ก่อนเปลี่ยนเส้นทาง
 * เพื่อป้องกันการสูญหายของ OAuth Code/State ซึ่งจะทำให้เกิด Error 400 Bad Request
 */
export default function LiffRedirect() {
  const [sdkReady, setSdkReady] = useState(false);

  const handleRedirect = async () => {
    if (typeof window === "undefined") return;

    try {
      const search = window.location.search;
      if (!search) return;

      const params = new URLSearchParams(search);
      const rawState =
        params.get("liff.state") || params.get("liffState") || params.get("path");
      if (!rawState) return;

      const liffId = getLiffId();
      const liff = (window as any).liff;

      // หากมี SDK และ LIFF ID ให้รอ liff.init() ทำงานเสร็จก่อน redirect
      if (liff && liffId) {
        try {
          await Promise.race([
            liff.init({ liffId }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("LIFF init timeout")), 4000)
            ),
          ]);
        } catch (initErr) {
          console.warn("[LiffRedirect] Init warning before redirect:", initErr);
        }
      }

      let target = decodeURIComponent(rawState).trim();
      if (target.startsWith("?path=")) target = target.replace("?path=", "");
      if (target.startsWith("path=")) target = target.replace("path=", "");
      if (target.startsWith("?redirect=")) target = target.replace("?redirect=", "");
      if (target.startsWith("redirect=")) target = target.replace("redirect=", "");

      if (target.startsWith("/book") || target === "book") {
        window.location.replace("/book");
      } else if (
        target.startsWith("/tracking") ||
        target === "tracking" ||
        target.includes("tracking")
      ) {
        const dest = target.startsWith("/") ? target : `/${target}`;
        window.location.replace(dest);
      }
    } catch (err) {
      console.warn("[LIFF Redirect] Error parsing liff.state:", err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).liff) {
      handleRedirect();
    }
  }, [sdkReady]);

  return (
    <Script
      src="https://static.line-scdn.net/liff/edge/2/sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        setSdkReady(true);
        handleRedirect();
      }}
    />
  );
}
