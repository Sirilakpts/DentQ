"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Copy,
  ChevronRight,
  MapPin,
  RefreshCw,
  Bell,
  LogOut,
  Phone,
  User,
  HeartPulse,
} from "lucide-react";
import { formatThaiDate, maskPhoneNumber } from "@/lib/utils";
import { BookingRecord, BookingStatus } from "@/lib/types";
import { DEMO_MOCK_USER } from "@/lib/demo-data";

function TrackingContent() {
  const searchParams = useSearchParams();
  const queueFilter = searchParams.get("q") || searchParams.get("queueNumber") || "";
  const initialAction = searchParams.get("action");

  // Authentication & Profile States
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [lineProfile, setLineProfile] = useState<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null>(null);
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);
  const [isLoggingInLine, setIsLoggingInLine] = useState(false);
  const [liffAuthError, setLiffAuthError] = useState<string | null>(null);

  // Data & UI States
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to determine the appropriate LIFF ID (supporting preview/staging environments)
  const getLiffId = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.includes("uat") && process.env.NEXT_PUBLIC_LIFF_ID_UAT) {
        return process.env.NEXT_PUBLIC_LIFF_ID_UAT;
      }
      if (host.includes("preview") && process.env.NEXT_PUBLIC_LIFF_ID_PREVIEW) {
        return process.env.NEXT_PUBLIC_LIFF_ID_PREVIEW;
      }
    }
    return process.env.NEXT_PUBLIC_LIFF_ID;
  };

  // 1. Initialize LIFF SDK
  const initLiff = async () => {
    const liffId = getLiffId();
    if (!liffId) {
      console.warn("[LIFF] NEXT_PUBLIC_LIFF_ID not set");
      setLiffAuthError("ยังไม่ได้กำหนดค่า NEXT_PUBLIC_LIFF_ID ในระบบ (ท่านสามารถกดเข้าสู่ระบบด้วยบัญชีจำลอง Demo เพื่อทดสอบได้ทันที)");
      return;
    }
    if (typeof window === "undefined" || !(window as any).liff) {
      return;
    }
    try {
      const liff = (window as any).liff;
      // เพิ่ม Timeout 6 วินาที ป้องกันการค้างกรณีเครือข่ายหรือ Endpoint mismatch
      await Promise.race([
        liff.init({ liffId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("การเชื่อมต่อระบบ LINE หมดเวลา (Timeout)")), 6000)
        ),
      ]);
      setLiffInitialized(true);
      setLiffAuthError(null);

      // ตรวจสอบ liff.state กรณีส่งต่อไปยัง /book
      if (typeof window !== "undefined") {
        const search = window.location.search;
        if (search) {
          const params = new URLSearchParams(search);
          const liffState = params.get("liff.state") || params.get("liffState") || params.get("path");
          if (liffState) {
            const decoded = decodeURIComponent(liffState);
            if (decoded.startsWith("/book") || decoded === "book") {
              window.location.replace("/book");
              return;
            }
          }
        }
      }

      if (liff.isLoggedIn()) {
        const idToken = liff.getIDToken();
        if (idToken) {
          setLineIdToken(idToken);
          const profile = await liff.getProfile();
          setLineProfile(profile);
          setLiffAuthError(null);
        } else {
          // Token หมดอายุหรือไม่ได้รับ idToken
          setLineIdToken(null);
          setLineProfile(null);
          setLiffAuthError("การเข้าสู่ระบบ LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        }
      }
    } catch (err: any) {
      console.warn("[LIFF Init Error]:", err);
      setLiffInitialized(false);
      setLiffAuthError(
        "ไม่สามารถเชื่อมต่อกับระบบ LINE ได้ (LIFF ID ปัจจุบันอาจยังไม่ได้ผูก Endpoint กับโดเมนนี้ใน LINE Developers หรือเครือข่ายขัดข้อง) ท่านสามารถกดลองใหม่ หรือใช้บัญชีจำลองเพื่อทดสอบได้ทันที"
      );
    }
  };

  // Auto-init LIFF if script is already loaded on window or handle liff.state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const liffState = params.get("liff.state") || params.get("liffState") || params.get("path");
        if (liffState) {
          const decoded = decodeURIComponent(liffState);
          if (decoded.startsWith("/book") || decoded === "book") {
            window.location.replace("/book");
            return;
          }
        }
      }

      if ((window as any).liff) {
        initLiff();
      }
    }
  }, []);

  const handleLineLogin = async () => {
    if (typeof window !== "undefined") {
      setIsLoggingInLine(true);
      setLiffAuthError(null);

      // Safety timeout: รีเซ็ตสถานะ loading หากเบราว์เซอร์ไม่ Redirect ภายใน 8 วินาที
      const safetyTimer = setTimeout(() => {
        setIsLoggingInLine(false);
        setLiffAuthError("การเชื่อมต่อ LINE ใช้เวลานานเกินไป กรุณากดลองใหม่อีกครั้ง หรือเข้าสู่ระบบด้วยบัญชีจำลอง");
      }, 8000);

      try {
        const liff = (window as any).liff;
        if (!liff) {
          throw new Error("SDK ระบบ LINE ยังโหลดไม่เสร็จสมบูรณ์ กรุณารอสักครู่แล้วกดลองใหม่อีกครั้ง");
        }

        const liffId = getLiffId();
        if (!liffId) {
          throw new Error("ยังไม่ได้กำหนดค่า NEXT_PUBLIC_LIFF_ID ในระบบ");
        }

        if (!liffInitialized) {
          await Promise.race([
            liff.init({ liffId }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("การเชื่อมต่อระบบ LINE หมดเวลา (Timeout)")), 6000)
            ),
          ]);
          setLiffInitialized(true);
        }

        const redirectUri = window.location.origin + "/tracking" + (queueFilter ? `?q=${encodeURIComponent(queueFilter)}` : "");

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri });
        } else {
          const idToken = liff.getIDToken();
          if (!idToken) {
            liff.logout();
            liff.login({ redirectUri });
          } else {
            setLineIdToken(idToken);
            try {
              const profile = await liff.getProfile();
              setLineProfile(profile);
              clearTimeout(safetyTimer);
              setIsLoggingInLine(false);
            } catch (profErr: any) {
              console.warn("[LIFF Profile Error]:", profErr);
              liff.logout();
              liff.login({ redirectUri });
            }
          }
        }
      } catch (err: any) {
        clearTimeout(safetyTimer);
        console.warn("[LINE Login Error]:", err);
        setIsLoggingInLine(false);
        setLiffAuthError(
          err?.message || "ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง หรือใช้บัญชีจำลองเพื่อทดสอบ"
        );
      }
    }
  };

  const handleLineLogout = () => {
    if (typeof window !== "undefined" && (window as any).liff) {
      const liff = (window as any).liff;
      if (liff.isLoggedIn()) {
        liff.logout();
      }
    }
    setLineProfile(null);
    setLineIdToken(null);
    setLiffAuthError(null);
    setBookings([]);
    setFetchError(null);
  };

  // 2. Fetch User Bookings automatically when lineIdToken is available
  async function fetchBookings(tokenToUse?: string) {
    const token = tokenToUse || lineIdToken;
    if (!token) return;

    setLoading(true);
    setFetchError(null);
    setActionMessage(null);

    try {
      // If ?q= was in URL, pass queueNumber as well
      const url = queueFilter
        ? `/api/tracking?queueNumber=${encodeURIComponent(queueFilter)}`
        : `/api/tracking`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setLineIdToken(null);
          setLineProfile(null);
          setLiffAuthError("การเข้าสู่ระบบ LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
          throw new Error("การเข้าสู่ระบบ LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        }
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลคิวได้");
      }

      setBookings(data.bookings || []);
    } catch (err: any) {
      console.error("Fetch tracking error:", err);
      setFetchError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  // Trigger auto fetch when lineIdToken is obtained
  useEffect(() => {
    if (lineIdToken) {
      fetchBookings(lineIdToken);
    }
  }, [lineIdToken, queueFilter]);

  // Handle immediate action from URL (e.g. action=confirm-attendance)
  useEffect(() => {
    if (initialAction && queueFilter && lineIdToken) {
      handleReminderAction(queueFilter, initialAction);
    }
  }, [initialAction, queueFilter, lineIdToken]);

  // Handle reminder action: [ ยืนยันการมา ] or [ ขอเลื่อนนัด ]
  async function handleReminderAction(queueNumber: string, action: string) {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tracking/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lineIdToken}`,
        },
        body: JSON.stringify({
          queueNumber,
          action,
          lineIdToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        // Refresh bookings
        if (lineIdToken) {
          fetchBookings(lineIdToken);
        }
      } else {
        setActionMessage(data.error || "ไม่สามารถดำเนินการได้");
      }
    } catch (err) {
      console.error("Action error:", err);
      setActionMessage("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setActionLoading(false);
    }
  }

  // Helper for Status Badge (Modern Government Minimal)
  function getStatusBadge(status: BookingStatus) {
    switch (status) {
      case "PENDING":
        return {
          label: "⏳ รอเจ้าหน้าที่ตรวจสอบ (Pending)",
          color: "bg-[#fcf8eb] text-[#b88c1c] border-[#D5A423]/40 font-bold",
        };
      case "CONFIRMED":
        return {
          label: "✅ ได้รับการยืนยันแล้ว (Confirmed)",
          color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        };
      case "CHECKED_IN":
        return {
          label: "🏥 มาถึงคลินิกแล้ว (Checked In)",
          color: "bg-blue-50 text-blue-800 border-blue-300 font-bold",
        };
      case "IN_PROGRESS":
        return {
          label: "🩺 กำลังรับการรักษา (In Progress)",
          color: "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold animate-pulse",
        };
      case "COMPLETED":
        return {
          label: "🎉 รับการรักษาเสร็จสิ้น (Completed)",
          color: "bg-[#eef3f9] text-[#063466] border-[#063466]/20 font-bold",
        };
      case "REJECTED":
        return {
          label: "🚫 ไม่อนุมัติการจอง (Rejected)",
          color: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
        };
      case "CANCELLED":
        return {
          label: "❌ ยกเลิกนัดหมาย (Cancelled)",
          color: "bg-slate-100 text-slate-700 border-slate-300 font-bold",
        };
      default:
        return {
          label: status,
          color: "bg-slate-100 text-slate-800 border-slate-300 font-bold",
        };
    }
  }

  // =========================================================================
  // GATE VIEW: Require LINE Login to Track Queues
  // =========================================================================
  if (!lineProfile || !lineIdToken) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6 text-center">
          {/* Logo / Clinic Identity */}
          <div className="w-14 h-14 rounded-2xl bg-[#063466] text-[#D5A423] flex items-center justify-center mx-auto shadow-sm">
            <span className="text-2xl sm:text-3xl">🦷</span>
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3 py-1 bg-[#eef3f9] text-[#063466] border border-[#063466]/15 rounded-full text-xs font-semibold">
              DentQ — ระบบติดตามคิวทันตกรรม LINE-First
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#063466] tracking-tight">
              เข้าสู่ระบบด้วย LINE เพื่อดูคิวนัดหมาย
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              ระบบจะแสดงรายการนัดหมายทั้งหมดที่เชื่อมโยงกับบัญชี LINE ของท่านโดยอัตโนมัติ โดยไม่ต้องกรอกเบอร์โทรหรือรหัสคิว
            </p>
          </div>

          {/* Benefits Feature List */}
          <div className="bg-[#F5F7FA] rounded-2xl p-4 sm:p-5 border border-slate-200/60 text-left space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#063466] shrink-0 mt-0.5" />
              <span>
                <strong>ดึงคิวตรวจอัตโนมัติ:</strong> ไม่ต้องจำหรือค้นหารหัสคิว ระบบดึงข้อมูลจากบัญชี LINE ของท่านทันที
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#063466] shrink-0 mt-0.5" />
              <span>
                <strong>คุ้มครองความเป็นส่วนตัว 100%:</strong> ผู้ใช้แต่ละคนเห็นเฉพาะคิวของตนเอง ไม่เปิดเผยข้อมูลแก่ผู้อื่น
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#063466] shrink-0 mt-0.5" />
              <span>
                <strong>อัปเดตสถานะแบบ Real-time:</strong> ทราบผลการตรวจสอบและการนัดหมายได้ทันที
              </span>
            </div>
          </div>

          {/* Error Message when LINE Auth fails or token expires */}
          {(liffAuthError || fetchError) && (
            <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-left text-xs text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{liffAuthError || fetchError}</span>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLiffAuthError(null);
                    setFetchError(null);
                    handleLineLogin();
                  }}
                  className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-700 font-semibold text-xs hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          )}

          {/* LINE Login Action Button */}
          <div className="pt-1 space-y-3">
            <button
              type="button"
              disabled={isLoggingInLine}
              onClick={handleLineLogin}
              className="w-full h-12 inline-flex items-center justify-center gap-2.5 px-6 rounded-2xl text-sm font-bold text-white bg-[#06C755] hover:bg-[#05b34c] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoggingInLine ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเชื่อมต่อกับ LINE...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">💬</span>
                  <span>เข้าสู่ระบบด้วย LINE เพื่อดูคิวนัดหมาย</span>
                </>
              )}
            </button>

            {/* Demo Account Button for Browser Reviewers */}
            {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
              process.env.NODE_ENV === "development" ||
              (typeof window !== "undefined" && window.location.hostname.includes("vercel.app"))) && (
              <div className="pt-2 space-y-2">
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-400">
                    หรือสำหรับทดลองใช้งาน
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsLoggingInLine(false);
                    setLiffAuthError(null);
                    setFetchError(null);
                    setLineProfile({
                      userId: DEMO_MOCK_USER.userId,
                      displayName: DEMO_MOCK_USER.displayName,
                      pictureUrl: DEMO_MOCK_USER.pictureUrl,
                    });
                    setLineIdToken(DEMO_MOCK_USER.idToken);
                  }}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🧪</span>
                  <span className="text-amber-900 font-bold">
                    ทดลองใช้งานด้วยบัญชีจำลอง (สมชาย มั่นคง - Demo Account)
                  </span>
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                  * สำหรับเปิดดู Mockup บนเบราว์เซอร์ แสดงคิวตัวอย่าง PENDING, CONFIRMED และ REJECTED
                </p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 pt-1">
              * DentQ ให้บริการติดตามคิวผ่าน LINE เพื่อความปลอดภัยและเป็นส่วนตัว
            </p>
          </div>
        </div>

        {/* LIFF SDK */}
        <Script
          src="https://static.line-scdn.net/liff/edge/2/sdk.js"
          strategy="afterInteractive"
          onLoad={initLiff}
        />
      </div>
    );
  }

  // =========================================================================
  // MAIN TRACKING VIEW (When authenticated with LINE)
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* User LINE Profile Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {lineProfile.pictureUrl ? (
            <img
              src={lineProfile.pictureUrl}
              alt={lineProfile.displayName}
              className="w-10 h-10 rounded-full border-2 border-[#063466]/20 object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              LINE
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {lineProfile.displayName}
              </span>
              {lineProfile.userId === DEMO_MOCK_USER.userId ? (
                <span className="text-[10px] font-bold bg-[#fcf8eb] text-[#b88c1c] border border-[#D5A423]/40 px-2 py-0.5 rounded-full">
                  🧪 บัญชีจำลอง Demo
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-[#eef3f9] text-[#063466] border border-[#063466]/20 px-2 py-0.5 rounded-full">
                  ✓ ยืนยันตัวตนผ่าน LINE แล้ว
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lineProfile.userId === DEMO_MOCK_USER.userId
                ? "โหมดสาธิต Mockup — แสดงรายการนัดหมายตัวอย่างของบัญชีนี้"
                : "แสดงเฉพาะรายการนัดหมายของบัญชี LINE นี้"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchBookings()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#063466] bg-[#eef3f9] hover:bg-[#dfeaf4] border border-[#063466]/15 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            type="button"
            onClick={handleLineLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#063466] tracking-tight">
          รายการนัดหมายทันตกรรมของคุณ
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          ตรวจสอบสถานะคิว ติดตามผลการอนุมัติ และยืนยันการเข้ารับบริการ
        </p>
      </div>

      {/* Demo Tracking Notice */}
      {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" || lineProfile.userId === DEMO_MOCK_USER.userId) && (
        <div className="bg-[#fcf8eb] border border-[#D5A423]/40 rounded-2xl p-3.5 text-xs text-amber-900 flex items-center gap-2.5 shadow-xs">
          <span className="text-base shrink-0">⚠️</span>
          <span>
            <strong>โหมดสาธิต (Demo Tracking):</strong> แสดงรายการคิวตัวอย่างสำหรับทดสอบระบบ (DEN-001 รอตรวจสอบ, DEN-002 ยืนยันแล้ว, DEN-005 ไม่อนุมัติพร้อมเหตุผลตัวอย่าง)
          </span>
        </div>
      )}

      {/* Error Alert */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchBookings()}
            className="text-xs font-bold underline hover:text-rose-900"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* Action Notification Alert (e.g. from reminder action) */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm flex items-start gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">อัปเดตสถานะเรียบร้อยแล้ว!</p>
            <p className="text-emerald-700">{actionMessage}</p>
          </div>
        </div>
      )}

      {/* Bookings List or Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
          <Loader2 className="w-10 h-10 animate-spin text-[#063466]" />
          <p className="text-xs text-slate-500 font-medium">กำลังโหลดข้อมูลคิวของท่าน...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 p-8 max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#eef3f9] text-[#063466] flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              ไม่พบคิวนัดหมายที่กำลังดำเนินการ
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              บัญชี LINE ของท่านยังไม่มีรายการนัดหมายที่เปิดอยู่ หรือคิวก่อนหน้าได้เข้ารับการรักษาเสร็จสิ้นแล้ว
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#063466] hover:bg-[#05264b] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <span>+ จองคิวนัดหมายใหม่</span>
              <ArrowRight className="w-4 h-4 text-[#D5A423]" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => {
            const badge = getStatusBadge(b.status);
            const isEmergency = b.isEmergency;
            const isRejected = b.status === "REJECTED";

            return (
              <div
                key={b.id || b.queueNumber}
                className={`bg-white rounded-3xl border-2 transition-all shadow-sm overflow-hidden ${
                  isEmergency
                    ? "border-rose-400 shadow-rose-100"
                    : isRejected
                    ? "border-rose-300 shadow-rose-50"
                    : "border-slate-200/90"
                }`}
              >
                {/* Header Banner */}
                <div
                  className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-white ${
                    isEmergency
                      ? "bg-gradient-to-r from-rose-700 to-red-800"
                      : isRejected
                      ? "bg-gradient-to-r from-rose-800 to-red-900"
                      : "bg-[#063466]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-xl font-bold">
                      {isEmergency ? "🚨" : isRejected ? "✕" : "🦷"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xl tracking-tight text-white">
                          {b.queueNumber}
                        </span>
                        {isEmergency && (
                          <span className="bg-red-950/80 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/50">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        Q-Dentist สาขาพญาไท (ข้อมูลจำลอง) • คิวนัดหมายวันที่ {formatThaiDate(b.date, { short: true })}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border ${badge.color} shadow-xs`}
                  >
                    {badge.label}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-5">
                  {/* Grid details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-slate-400 font-medium">บริการทันตกรรม</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {b.service?.nameTh || "บริการทันตกรรมทั่วไป"}
                      </p>
                      {b.service?.priceDisplay && (
                        <p className="text-[11px] text-[#063466] font-semibold">
                          {b.service.priceDisplay}
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-slate-400 font-medium">วันและเวลานัดหมาย</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {formatThaiDate(b.date, { short: true })}
                      </p>
                      <p className="text-[11px] text-[#063466] font-bold">{b.time} น.</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-slate-400 font-medium">สิทธิการรักษาพยาบาล</span>
                      <p className="font-bold text-[#063466] text-sm">
                        {b.medicalRights || "ไม่ได้ระบุ"}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> ยืนยันสิทธิการรักษาแล้ว
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-slate-400 font-medium">ชื่อผู้รับบริการ (LINE)</span>
                      <p className="font-bold text-slate-900 text-sm">{b.patientName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        เบอร์โทร: {b.phoneNumber ? maskPhoneNumber(b.phoneNumber) : "ไม่ได้ระบุ"}
                      </p>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {isRejected && (
                    <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>ไม่อนุมัติการจอง</span>
                      </div>
                      {b.rejectReason && b.rejectReason.trim() ? (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-rose-700">สาเหตุ / คำชี้แจงจากคลินิก:</span>
                          <p className="text-rose-900 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-rose-200/60">
                            {b.rejectReason.trim()}
                          </p>
                        </div>
                      ) : null}
                      <div className="pt-1">
                        <Link
                          href="/book"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#063466] hover:bg-[#05264b] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <span>📅 จองคิวใหม่</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#D5A423]" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Advance Reminder Actions for CONFIRMED */}
                  {b.status === "CONFIRMED" && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#063466]" />
                          <span className="text-xs font-bold text-[#063466]">
                            การยืนยันเข้ารับบริการ (Advance Confirmation)
                          </span>
                        </div>
                        {b.reminderStatus === "ATTENDANCE_CONFIRMED" && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            ✅ ท่านยืนยันการมาแล้ว
                          </span>
                        )}
                        {b.reminderStatus === "RESCHEDULE_REQUESTED" && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            🔄 แจ้งขอเลื่อนนัดแล้ว
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        เพื่อให้ทางคลินิกจัดเตรียมทันตแพทย์และห้องทำหัตถการได้อย่างมีประสิทธิภาพ
                        โปรดยืนยันการมาของท่าน หรือแจ้งขอเลื่อนนัดหมายล่วงหน้า
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={actionLoading || b.reminderStatus === "ATTENDANCE_CONFIRMED"}
                          onClick={() => handleReminderAction(b.queueNumber, "confirm-attendance")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>[ ยืนยันการมา ]</span>
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading || b.reminderStatus === "RESCHEDULE_REQUESTED"}
                          onClick={() => handleReminderAction(b.queueNumber, "reschedule")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>[ ขอเลื่อนนัด ]</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions & Copy */}
                  <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#063466] shrink-0" />
                      <span>สาขาพญาไท อาคารเดอะพลาซ่า (ข้อมูลจำลอง)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `คิวนัดหมายทำฟัน Q-Dentist หมายเลข: ${b.queueNumber} วันที่: ${b.date} เวลา: ${b.time} น. สถานะ: ${badge.label}`
                          );
                          setCopiedId(b.queueNumber);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="font-medium text-[#063466] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedId === b.queueNumber ? "คัดลอกแล้ว!" : "คัดลอกข้อมูลบัตรคิว"}</span>
                      </button>

                      <a
                        href="tel:029998888"
                        className="font-bold text-[#063466] hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> โทร 02-999-8888 (ข้อมูลจำลอง)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIFF SDK Script */}
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={initLiff}
      />
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#063466]" />
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
