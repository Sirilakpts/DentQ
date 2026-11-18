"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  Check,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  User,
  Phone,
  Sparkles,
  Smile,
  Activity,
  Zap,
  CheckCircle2,
  Copy,
  ArrowRight,
  Info,
  Loader2,
  LogOut,
  HeartPulse,
} from "lucide-react";
import confetti from "canvas-confetti";
import { formatThaiDate, getBookableDateRange } from "@/lib/utils";
import { DentalService, SlotAvailability } from "@/lib/types";
import { DEMO_MOCK_USER } from "@/lib/demo-data";

// สิทธิการรักษา 5 แบบตามมาตรฐานระบบทันตกรรม DentQ
const MEDICAL_RIGHTS_OPTIONS = [
  {
    id: "บัตรทอง",
    label: "บัตรทอง (สปสช.)",
    desc: "สิทธิหลักประกันสุขภาพถ้วนหน้า 30 บาทรักษาทุกโรค",
  },
  {
    id: "ประกันสังคม",
    label: "ประกันสังคม",
    desc: "ผู้ประกันตน ม.33 / ม.39 สิทธิทันตกรรมประจำปี",
  },
  {
    id: "ข้าราชการ",
    label: "ข้าราชการ / รัฐวิสาหกิจ",
    desc: "สิทธิเบิกจ่ายตรงกรมบัญชีกลางหรือต้นสังกัด",
  },
  {
    id: "ชำระเอง",
    label: "ชำระเงินเอง",
    desc: "เงินสด, สแกน QR, บัตรเครดิต หรือประกันเอกชน",
  },
  {
    id: "ไม่แน่ใจ",
    label: "ไม่แน่ใจ / ตรวจสอบสิทธิ",
    desc: "ให้เจ้าหน้าที่ช่วยตรวจสอบสิทธิ ณ วันเข้ารับบริการ",
  },
];

export default function BookQueuePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Data states
  const [services, setServices] = useState<DentalService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Form states
  const [selectedService, setSelectedService] = useState<DentalService | null>(null);

  // Date and slots
  const dateRange = getBookableDateRange();
  const [selectedDate, setSelectedDate] = useState<string>(dateRange.minDate);
  const [slotPeriod, setSlotPeriod] = useState<"ALL" | "MORNING" | "AFTERNOON">("ALL");
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);

  // Patient Info & Medical Rights
  const [selectedMedicalRights, setSelectedMedicalRights] = useState<string>("บัตรทอง");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [pdpaAccepted, setPdpaAccepted] = useState(false);
  const [showPdpaModal, setShowPdpaModal] = useState(false);

  // Submission & Result
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // LIFF / LINE Authentication State
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [lineProfile, setLineProfile] = useState<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null>(null);
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);
  const [isLoggingInLine, setIsLoggingInLine] = useState(false);
  const [liffAuthError, setLiffAuthError] = useState<string | null>(null);

  const initLiff = async () => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      console.warn("[LIFF] NEXT_PUBLIC_LIFF_ID not set");
      return;
    }
    if (typeof window === "undefined" || !(window as any).liff) {
      return;
    }
    try {
      const liff = (window as any).liff;
      await liff.init({ liffId });
      setLiffInitialized(true);

      // ตรวจสอบ liff.state กรณี Rich Menu หรือ LINE ส่งต่อไปยังหน้า /tracking
      if (typeof window !== "undefined") {
        const search = window.location.search;
        if (search) {
          const params = new URLSearchParams(search);
          const liffState = params.get("liff.state") || params.get("liffState") || params.get("path");
          if (liffState) {
            const decoded = decodeURIComponent(liffState);
            if (decoded.includes("tracking")) {
              const dest = decoded.startsWith("/") ? decoded : `/${decoded}`;
              window.location.replace(dest);
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
          // มี session เก่าแต่ Token หมดอายุหรือไม่ได้รับ openid scope
          setLineIdToken(null);
          setLineProfile(null);
          setLiffAuthError("การเข้าสู่ระบบ LINE หมดอายุ กรุณากดเข้าสู่ระบบใหม่อีกครั้ง");
        }
      }
    } catch (err: any) {
      console.warn("[LIFF Init Error]:", err);
      setLiffAuthError("ไม่สามารถเชื่อมต่อกับระบบ LINE ได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // Auto-init LIFF if SDK script is already present on window or handle liff.state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const liffState = params.get("liff.state") || params.get("liffState") || params.get("path");
        if (liffState) {
          const decoded = decodeURIComponent(liffState);
          if (decoded.includes("tracking")) {
            const dest = decoded.startsWith("/") ? decoded : `/${decoded}`;
            window.location.replace(dest);
            return;
          }
        }
      }

      if ((window as any).liff) {
        initLiff();
      }
    }
  }, []);

  const handleLineLogin = () => {
    if (typeof window !== "undefined" && (window as any).liff) {
      const liff = (window as any).liff;
      setIsLoggingInLine(true);
      setLiffAuthError(null);
      const redirectUri = window.location.origin + "/book";

      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri });
      } else {
        const idToken = liff.getIDToken();
        if (!idToken) {
          // Token หมดอายุหรือ null: ทำการ logout และ login ใหม่เพื่อให้ได้ Token สด
          liff.logout();
          liff.login({ redirectUri });
        } else {
          setLineIdToken(idToken);
          liff.getProfile().then((profile: any) => {
            setLineProfile(profile);
            setIsLoggingInLine(false);
          }).catch(() => {
            liff.logout();
            liff.login({ redirectUri });
          });
        }
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
    setStep(1);
    setSelectedService(null);
    setSelectedSlot(null);
  };

  // 1. Fetch Services on load
  useEffect(() => {
    async function fetchServices() {
      try {
        setLoadingServices(true);
        const res = await fetch("/api/services");
        const data = await res.json();
        if (data.success) {
          setServices(data.services);
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        setLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  // 2. Fetch Slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const res = await fetch(`/api/slots?date=${selectedDate}`);
        const data = await res.json();
        if (data.success) {
          setSlots(data.slots);
        }
      } catch (err) {
        console.error("Failed to fetch slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate]);

  // Handle Booking Submit
  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingError(null);

    if (!lineProfile || !lineIdToken) {
      setBookingError("กรุณาเข้าสู่ระบบ LINE ก่อนดำเนินการจองคิว");
      return;
    }

    if (!selectedService || !selectedDate || !selectedSlot) {
      setBookingError("กรุณาเลือกบริการ วันที่ และเวลาให้ครบถ้วน");
      return;
    }

    // Phone number is optional, but if entered, validate 10 digits
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone && !/^0[689]\d{8}$/.test(cleanPhone)) {
      setBookingError("หากกรอกเบอร์โทรศัพท์ กรุณากรอกให้ถูกต้อง 10 หลัก (เช่น 0812345678)");
      return;
    }

    if (!pdpaAccepted) {
      setBookingError("กรุณายอมรับเงื่อนไขการคุ้มครองข้อมูลส่วนบุคคล (PDPA)");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedSlot.time,
          period: selectedSlot.period,
          patientName: lineProfile.displayName,
          phoneNumber: cleanPhone || "",
          nationalIdOrHn: "",
          medicalRights: selectedMedicalRights,
          symptoms: symptoms.trim() || null,
          pdpaAccepted: true,
          lineIdToken: lineIdToken,
          isEmergency: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setLineIdToken(null);
          setLineProfile(null);
          setLiffAuthError(data.error || "การเข้าสู่ระบบ LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        }
        throw new Error(data.error || "ไม่สามารถจองคิวได้ กรุณาลองใหม่อีกครั้ง");
      }

      setCreatedBooking(data.booking);
      setStep(4);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Confetti fallback
      }
    } catch (err: any) {
      setBookingError(err.message || "เกิดข้อผิดพลาดในการจองคิว");
    } finally {
      setSubmitting(false);
    }
  }

  // Filter slots by period
  const filteredSlots = slots.filter((slot) => {
    if (slotPeriod === "ALL") return true;
    return slot.period === slotPeriod;
  });

  // Check if selected service has toothache/acute component
  const isToothacheService =
    selectedService &&
    (selectedService.nameTh.includes("ปวด") ||
      selectedService.nameTh.includes("ถอน") ||
      selectedService.nameTh.includes("ราก") ||
      selectedService.nameTh.includes("คุด"));

  // =========================================================================
  // VIEW 1: LINE LOGIN GATE (Clean Modern Government Minimal)
  // สะอาดตา กระชับ เข้าใจง่าย ยืนยันตัวตนด้วย LINE ก่อนเข้าสู่ Booking Stepper
  // =========================================================================
  if (!lineProfile || !lineIdToken) {
    return (
      <div className="max-w-md md:max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5 text-center">
          
          {/* Emblem & Headline */}
          <div className="space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-[#063466] text-[#D5A423] flex items-center justify-center mx-auto shadow-sm">
              <span className="text-2xl sm:text-3xl">🦷</span>
            </div>

            <div className="inline-block px-3 py-1 bg-[#eef3f9] text-[#063466] border border-[#063466]/15 rounded-full text-xs font-semibold">
              บริการทันตกรรม • จองคิวออนไลน์
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#063466] tracking-tight">
              เข้าสู่ระบบเพื่อจองคิวทำฟัน
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              เข้าสู่ระบบผ่าน LINE เพื่อยืนยันตัวตนและรับตั๋วคิวดิจิทัล สะดวก รวดเร็ว โดยไม่ต้องกรอกเลขบัตรประชาชน
            </p>
          </div>

          {/* Key Benefits (กระชับ ไม่ซ้ำซ้อน ไม่กล่าวอ้าง PDPA เกินจริง) */}
          <div className="bg-[#F5F7FA] rounded-2xl p-3.5 border border-slate-200/60 text-left space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#063466] shrink-0" />
              <span>ยืนยันตัวตนด้วยบัญชี LINE สะดวก ปลอดภัย</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#063466] shrink-0" />
              <span>รับตั๋วคิวดิจิทัลสำหรับแสดงในวันเข้ารับบริการ</span>
            </div>
          </div>

          {/* Red-Flag Urgent Symptom Notice (กระชับ ชัดเจน) */}
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-left text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>กรณีมีอาการวิกฤต (Red-Flag Symptoms):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              หากมีอาการรุนแรง เช่น <strong>หายใจลำบาก กลืนลำบาก หรือเลือดออกไม่หยุด</strong> กรุณาไปห้องฉุกเฉินทันที หรือโทร <strong>1669</strong> (ระบบออนไลน์นี้สำหรับนัดหมายทั่วไป)
            </p>
          </div>

          {/* Error Message when LINE Auth fails or token expires */}
          {liffAuthError && (
            <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-left text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{liffAuthError}</span>
            </div>
          )}

          {/* Action Area */}
          <div className="space-y-3 pt-1">
            {/* Primary Action Button: เข้าสู่ระบบด้วย LINE */}
            <button
              type="button"
              disabled={isLoggingInLine || (!liffInitialized && typeof window !== "undefined" && !(window as any).liff)}
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
                  <span>เข้าสู่ระบบด้วย LINE เพื่อเริ่มจองคิว</span>
                </>
              )}
            </button>

            {/* Secondary Action Button: ทดลองใช้งานด้วยบัญชีจำลอง (เฉพาะ Demo Mode) */}
            {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development") && (
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
                  * สำหรับเปิดดู Mockup บนเบราว์เซอร์ ไม่ใช่ LINE Login จริง และไม่บันทึกข้อมูลจริง
                </p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 pt-1">
              * DentQ กำหนดให้ยืนยันตัวตนผ่าน LINE เพื่อความปลอดภัย (ไม่มี Guest Mode)
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
  // VIEW 2: BOOKING WIZARD (Authenticated with LINE)
  // Stepper 4 ขั้นตอนสไตล์ Modern Government Minimal
  // =========================================================================
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      
      {/* Patient Profile Header Banner */}
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
                  🧪 บัญชีจำลอง Demo (ไม่บันทึกจริง)
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-[#eef3f9] text-[#063466] border border-[#063466]/20 px-2 py-0.5 rounded-full">
                  ✓ ยืนยันตัวตนผ่าน LINE แล้ว
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lineProfile.userId === DEMO_MOCK_USER.userId
                ? "โหมดทดสอบ Mockup — ไม่มีการส่งข้อมูลไปยังฐานข้อมูลจริงหรือ LINE จริง"
                : "คิวจะถูกบันทึกภายใต้บัญชีนี้ และส่งผลการอนุมัติแจ้งเตือนเข้า LINE อัตโนมัติ"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLineLogout}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 font-medium self-end sm:self-center shrink-0 cursor-pointer transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Stepper Progress Bar (Requirement 9: 4 ขั้นตอนครบถ้วน) */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#063466] tracking-tight">
            จองคิวนัดหมายทันตกรรม
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ระบบจองคิวออนไลน์ล่วงหน้า 1-7 วัน ยืนยันรวดเร็ว พร้อมแจ้งเตือนผ่าน LINE อัตโนมัติ
          </p>
        </div>

        {/* 4-Step Stepper Cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-xs font-medium">
          <div
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all ${
              step >= 1
                ? "bg-white border-[#063466] border-teal-300 text-[#063466] shadow-xs"
                : "bg-white/60 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > 1 ? "bg-[#063466] text-white" : "bg-[#eef3f9] text-[#063466]"
              }`}
            >
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </div>
            <span className="truncate hidden sm:inline">เลือกบริการ</span>
            <span className="sm:hidden text-[11px]">บริการ</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all ${
              step >= 2
                ? "bg-white border-[#063466] border-teal-300 text-[#063466] shadow-xs"
                : "bg-white/60 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > 2
                  ? "bg-[#063466] text-white"
                  : step === 2
                  ? "bg-[#eef3f9] text-[#063466]"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
            </div>
            <span className="truncate hidden sm:inline">เลือกวันและเวลา</span>
            <span className="sm:hidden text-[11px]">วันและเวลา</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all ${
              step >= 3
                ? "bg-white border-[#063466] border-teal-300 text-[#063466] shadow-xs"
                : "bg-white/60 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > 3
                  ? "bg-[#063466] text-white"
                  : step === 3
                  ? "bg-[#eef3f9] text-[#063466]"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > 3 ? <Check className="w-3.5 h-3.5" /> : "3"}
            </div>
            <span className="truncate hidden sm:inline">ข้อมูลผู้จอง</span>
            <span className="sm:hidden text-[11px]">ข้อมูลผู้จอง</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all ${
              step === 4
                ? "bg-white border-[#D5A423] text-[#b88c1c] shadow-xs"
                : "bg-white/60 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 4 ? "bg-[#D5A423] text-slate-950" : "bg-slate-100 text-slate-400"
              }`}
            >
              4
            </div>
            <span className="truncate hidden sm:inline">ตรวจสอบและยืนยัน</span>
            <span className="sm:hidden text-[11px]">ยืนยัน</span>
          </div>
        </div>
      </div>

      {/* STEP 1: SERVICE SELECTION */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#063466]">
                ขั้นตอนที่ 1: เลือกสาเหตุที่มาพบทันตแพทย์
              </h2>
              <p className="text-xs text-slate-500">
                กรุณาเลือกการรักษาหรือบริการทันตกรรมที่ต้องการ
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#eef3f9] text-[#063466] rounded-full">
              ขั้นตอน 1 จาก 3
            </span>
          </div>

          {/* Red-Flag Urgent Symptom Notice (Requirement 6) */}
          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 text-left text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>ข้อควรระวัง - หากมีอาการวิกฤต (Red-Flag Symptoms):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              หากมีอาการรุนแรง เช่น <strong>หายใจลำบาก กลืนลำบาก หรือเลือดออกมากในช่องปากไม่หยุด</strong> กรุณาไปห้องฉุกเฉินโรงพยาบาลทันที หรือโทร <strong>1669</strong> (ระบบจองคิวออนไลน์นี้สำหรับบริการทันตกรรมทั่วไป ไม่รองรับกรณีฉุกเฉิน)
            </p>
          </div>

          {/* Toothache Walk-in Guidance Notice */}
          <div className="bg-[#fcf8eb] border border-[#D5A423]/40 rounded-xl p-3 text-left text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Info className="w-4 h-4 text-[#D5A423] shrink-0" />
              <span>คำแนะนำกรณีปวดฟันเร่งด่วน:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              ท่านสามารถเดินทางมา <strong>Walk-in เพื่อรับการคัดกรองอาการ</strong> ได้ที่คลินิก ทั้งนี้ <strong>ไม่การันตีว่าจะได้รับการทำหัตถการทันที</strong> (ขึ้นอยู่กับจำนวนคิวและดุลยพินิจของทันตแพทย์เวร)
            </p>
          </div>

          {/* Services List */}
          {loadingServices ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-[#063466]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {services.map((srv) => {
                const isSelected = selectedService?.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    className={`cursor-pointer rounded-xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-[#063466] bg-[#eef3f9]/60 shadow-xs ring-1 ring-[#063466]"
                        : "border-slate-200 hover:border-[#063466]/40 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-[#063466] text-white"
                                : "bg-[#eef3f9] text-[#063466]"
                            }`}
                          >
                            {srv.icon === "Sparkles" && <Sparkles className="w-4 h-4" />}
                            {srv.icon === "Tooth" && <Activity className="w-4 h-4" />}
                            {srv.icon === "Smile" && <Smile className="w-4 h-4" />}
                            {srv.icon === "Activity" && <Zap className="w-4 h-4" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">
                              {srv.nameTh}
                            </h3>
                            <p className="text-[11px] text-slate-400">{srv.nameEn}</p>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-[#063466] bg-[#063466] text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                        {srv.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#063466]" /> ประมาณ{" "}
                        {srv.durationMinutes} นาที
                      </span>
                      <span className="font-bold text-[#063466]">{srv.priceDisplay}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Conditional Guidance if Selected Service is Toothache/Root/Extraction */}
          {isToothacheService && (
            <div className="p-3 rounded-xl bg-[#eef3f9] border border-[#063466]/20 text-[#063466] text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#063466] shrink-0 mt-0.5" />
              <span>
                <strong>บริการนี้ครอบคลุมอาการปวดฟัน/รักษาราก/ผ่าฟันคุด:</strong> หากจองคิวออนไลน์ ท่านจะได้รับการตรวจตามวันเวลาที่นัด หากมีอาการปวดเร่งด่วนทนไม่ไหว สามารถเดินทางมา Walk-in ได้ในเวลาทำการ
              </span>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={!selectedService}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#063466] hover:bg-[#05264b] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
            >
              <span>ถัดไป: เลือกวันและเวลา</span>
              <ChevronRight className="w-4 h-4 text-[#D5A423]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INTERACTIVE DATE & TIME SLOTS */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#063466]">
                ขั้นตอนที่ 2: เลือกวันและช่วงเวลานัดหมาย
              </h2>
              <p className="text-xs text-slate-500">
                บริการ:{" "}
                <span className="font-semibold text-[#063466]">
                  {selectedService?.nameTh}
                </span>{" "}
                ({selectedService?.durationMinutes} นาที)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#eef3f9] text-[#063466] rounded-full">
              ขั้นตอน 2 จาก 3
            </span>
          </div>

          {/* Date Picker Bar (Next 7 days) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              📅 เลือกวันที่ต้องการนัดหมาย (ล่วงหน้า 1 - 7 วัน):
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {dateRange.availableDates.map((dateStr) => {
                const isSelected = selectedDate === dateStr;
                const formatted = formatThaiDate(dateStr, { short: true });
                const parts = formatted.split(" ");
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border min-w-[85px] transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#063466] text-white border-[#063466] shadow-sm scale-102"
                        : "bg-white text-slate-700 border-slate-200 hover:border-[#063466]/40 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[11px] opacity-90">{parts[1]}</span>
                    <span className="text-xl font-extrabold">{parts[0]}</span>
                    <span className="text-[10px] opacity-80">{parts[2]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Period Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setSlotPeriod("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  slotPeriod === "ALL"
                    ? "bg-white text-[#063466] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setSlotPeriod("MORNING")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  slotPeriod === "MORNING"
                    ? "bg-white text-[#063466] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌅 รอบเช้า (09:00 - 12:00)
              </button>
              <button
                type="button"
                onClick={() => setSlotPeriod("AFTERNOON")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  slotPeriod === "AFTERNOON"
                    ? "bg-white text-[#063466] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ☀️ รอบบ่าย (13:00 - 16:00)
              </button>
            </div>

            {/* Availability Legend */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ว่าง
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> เต็ม
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> งดรับนัด
              </span>
            </div>
          </div>

          {/* Morning Quota Hint */}
          <div className="text-[11px] text-slate-500 bg-[#F5F7FA] p-2.5 rounded-xl border border-slate-200/60 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#063466] shrink-0" />
            <span>
              <strong>โควตารอบเช้า:</strong> รับจองสูงสุด 6 คนรวมทุกบริการ หากครบแล้วระบบจะแสดงสถานะเต็มทุกสล็อตเช้า
            </span>
          </div>

          {/* Slots Grid */}
          {loadingSlots ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-[#063466]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredSlots.map((slot) => {
                const isSelected = selectedSlot?.time === slot.time;
                const currentCount = slot.currentBookings ?? 0;
                const maxCapacity = slot.maxCapacity ?? 2;
                const isFull = currentCount >= maxCapacity || slot.status === "FULL";
                const isBlocked = slot.status === "BLOCKED";
                const isDisabled = isFull || isBlocked;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelectedSlot(slot)}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-[#063466] bg-[#eef3f9]/80 shadow-xs scale-102"
                        : isFull
                        ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                        : isBlocked
                        ? "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
                        : "border-slate-200 hover:border-[#063466]/40 hover:shadow-xs bg-white cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm sm:text-base font-extrabold ${
                          isSelected
                            ? "text-[#063466]"
                            : isDisabled
                            ? "text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {slot.time} น.
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#063466] text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      {isBlocked ? (
                        <span className="text-slate-400 font-medium">✕ งดรับนัด</span>
                      ) : isFull ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          เต็ม ({currentCount}/{maxCapacity})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ว่าง ({currentCount}/{maxCapacity})
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Navigation */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </button>

            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#063466] hover:bg-[#05264b] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
            >
              <span>ถัดไป: ข้อมูลผู้จอง & สิทธิการรักษา</span>
              <ChevronRight className="w-4 h-4 text-[#D5A423]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MEDICAL RIGHTS & CONFIRMATION */}
      {step === 3 && (
        <form
          onSubmit={handleBookingSubmit}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#063466]">
                ขั้นตอนที่ 3: ข้อมูลผู้จองและสิทธิการรักษา
              </h2>
              <p className="text-xs text-slate-500">
                ยืนยันข้อมูลนัดหมายและเลือกสิทธิการรักษาพยาบาล
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#eef3f9] text-[#063466] rounded-full">
              ขั้นตอน 3 จาก 3
            </span>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-[#eef3f9] border border-[#063466]/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[#063466] font-bold text-sm">
                🦷 {selectedService?.nameTh}
              </span>
              <p className="text-slate-700">
                วัน{formatThaiDate(selectedDate, { includeDay: true })} เวลา{" "}
                {selectedSlot?.time} น.
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-500">ประมาณการค่าบริการ:</span>
              <p className="font-bold text-[#063466] text-sm">{selectedService?.priceDisplay}</p>
            </div>
          </div>

          {bookingError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Form Inputs: LINE Name (Read-only), Medical Rights, Optional Phone, Optional Symptoms */}
          <div className="space-y-5">
            {/* Patient Name from LINE Profile (No manual typing, No National ID) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ชื่อผู้รับบริการ (ดึงจากโปรไฟล์ LINE) <span className="text-[#063466]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#063466] absolute left-3 top-3" />
                <input
                  type="text"
                  disabled
                  value={lineProfile.displayName}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-[#F5F7FA] text-slate-900 text-sm font-semibold cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                ยืนยันตัวตนอัตโนมัติด้วยบัญชี LINE ไม่ต้องกรอกเลขบัตรประชาชน
              </p>
            </div>

            {/* Medical Rights Selection (5 standard options) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                สิทธิการรักษาพยาบาล <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MEDICAL_RIGHTS_OPTIONS.map((mr) => {
                  const isSelected = selectedMedicalRights === mr.id;
                  return (
                    <button
                      key={mr.id}
                      type="button"
                      onClick={() => setSelectedMedicalRights(mr.id)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-[#063466] bg-[#eef3f9]/60 shadow-xs ring-1 ring-[#063466]"
                          : "border-slate-200 hover:border-[#063466]/40 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          {mr.label}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-[#063466] bg-[#063466] text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{mr.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Phone Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  เบอร์โทรศัพท์มือถือ
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  ไม่บังคับ (Optional)
                </span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="เช่น 0812345678 (เว้นว่างได้)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#063466] focus:ring-1 focus:ring-[#063466] font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                กรอกเพื่อให้เจ้าหน้าที่ติดต่อได้สะดวกกรณีมีข้อสงสัยเกี่ยวกับอาการหรือเวลานัดหมาย
              </p>
            </div>

            {/* Optional Symptoms / Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  อาการเบื้องต้น / ข้อมูลเพิ่มเติมสำหรับทันตแพทย์
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  ไม่บังคับ (Optional)
                </span>
              </div>
              <input
                type="text"
                placeholder="เช่น เสียวฟันเมื่อดื่มน้ำเย็น, นัดตรวจฟันประจำปี"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#063466] focus:ring-1 focus:ring-[#063466]"
              />
            </div>
          </div>

          {/* Automatic LINE Notification Notice */}
          <div className="bg-[#F5F7FA] border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
              LINE
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-[#063466]">
                ระบบจะส่งบัตรคิวและการแจ้งเตือนอัตโนมัติผ่าน LINE
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                ส่งข้อความไปยังบัญชี <strong>{lineProfile.displayName}</strong> ทันทีเมื่อเจ้าหน้าที่ทำการตรวจสอบและอนุมัติคิว
              </p>
            </div>
          </div>

          {/* Mandatory PDPA Consent Card */}
          <div className="bg-[#F5F7FA] border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="pdpa-consent"
                required
                checked={pdpaAccepted}
                onChange={(e) => setPdpaAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#063466] rounded border-slate-300 focus:ring-[#063466] cursor-pointer"
              />
              <label
                htmlFor="pdpa-consent"
                className="text-xs text-slate-700 leading-relaxed cursor-pointer"
              >
                <span className="font-bold text-slate-900">
                  ข้าพเจ้ายินยอมให้ Q-Dentist Clinic จัดเก็บและใช้ข้อมูลเพื่อการนัดหมายทันตกรรมและรับการแจ้งเตือนผ่าน LINE
                </span>{" "}
                ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA){" "}
                <button
                  type="button"
                  onClick={() => setShowPdpaModal(true)}
                  className="text-[#063466] font-bold underline ml-1 hover:text-[#05264b]"
                >
                  [อ่านเงื่อนไข PDPA ฉบับเต็ม]
                </button>
              </label>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(2)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </button>

            <button
              type="submit"
              disabled={submitting || !pdpaAccepted}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white bg-[#063466] hover:bg-[#05264b] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังยืนยันคิว...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#D5A423]" />
                  <span>ยืนยันการจองคิวทันที</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: DIGITAL QUEUE TICKET & TRACKING */}
      {step === 4 && createdBooking && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#063466]">
              จองคิวสำเร็จเรียบร้อยแล้ว!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              ระบบได้บันทึกคิวของท่านแล้ว เจ้าหน้าที่จะทำการตรวจสอบและยืนยันคิวผ่าน LINE โดยอัตโนมัติ
            </p>
          </div>

          {/* Digital Queue Ticket Card (Modern Government Minimal) */}
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden relative">
            {/* Ticket Header (Navy with Gold Accent) */}
            <div className="bg-[#063466] p-6 text-white text-center relative">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#D5A423]">
                Q-DENTIST DIGITAL TICKET
              </div>
              <div className="text-lg font-bold mt-0.5">บัตรคิวนัดหมายทันตกรรม</div>
              <p className="text-xs text-slate-300 mt-0.5">คลินิกทันตกรรม Q-Dentist</p>

              {/* Status Badge: รอเจ้าหน้าที่ตรวจสอบ (PENDING) */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D5A423] text-slate-950 shadow-xs">
                <span>⏳ รอเจ้าหน้าที่ตรวจสอบ (PENDING)</span>
              </div>

              {(createdBooking?.isDemo || process.env.NEXT_PUBLIC_DEMO_MODE === "true" || lineProfile?.userId === DEMO_MOCK_USER.userId) && (
                <div className="mt-2 text-[10px] text-amber-200 bg-white/10 rounded-lg py-1 px-3 inline-block">
                  ⚠️ คิวจำลองเพื่อการสาธิต (Demo) — ไม่บันทึกถาวร
                </div>
              )}
            </div>

            {/* Ticket Body */}
            <div className="p-6 space-y-5 bg-white">
              {/* Big Queue Number */}
              <div className="text-center p-4 bg-[#F5F7FA] rounded-2xl border border-slate-200/80">
                <span className="text-xs text-slate-500 font-medium">หมายเลขคิวของคุณ</span>
                <div className="text-4xl sm:text-5xl font-black text-[#063466] tracking-tight my-1">
                  {createdBooking.queueNumber || createdBooking.id}
                </div>
                <span className="text-[11px] text-[#063466] font-semibold">
                  กรุณาแสดงบัตรคิวนี้แก่เจ้าหน้าที่เมื่อมาถึงคลินิก
                </span>
              </div>

              {/* Ticket Details */}
              <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">บริการ:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {createdBooking.service?.nameTh || selectedService?.nameTh}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">วันนัดหมาย:</span>
                  <span className="font-bold text-slate-900">
                    {formatThaiDate(createdBooking.date || selectedDate, {
                      includeDay: true,
                    })}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">เวลานัด:</span>
                  <span className="font-bold text-[#063466] text-sm">
                    {createdBooking.time || selectedSlot?.time} น.
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">สิทธิการรักษา:</span>
                  <span className="font-bold text-slate-900">
                    {createdBooking.medicalRights || selectedMedicalRights}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">ชื่อผู้รับบริการ (LINE):</span>
                  <span className="font-semibold text-slate-900">
                    {createdBooking.patientName || lineProfile.displayName}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">เบอร์โทรศัพท์:</span>
                  <span className="font-mono text-slate-900">
                    {createdBooking.phoneNumber || phoneNumber || "ไม่ได้ระบุ"}
                  </span>
                </div>
              </div>

              {/* Notification Status Banner */}
              {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" || lineProfile?.userId === DEMO_MOCK_USER.userId) ? (
                <div className="bg-[#fcf8eb] border border-[#D5A423]/40 p-3 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                  <span className="text-base shrink-0">⚠️</span>
                  <span>
                    <strong>โหมดสาธิต (Demo Mockup):</strong> ระบบแสดงตัวอย่างการออกบัตรคิวสถานะ PENDING โดยไม่มีการบันทึกข้อมูลจริงลงฐานข้อมูล และไม่มีการส่งข้อความผ่าน LINE จริง
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                  <span className="text-base shrink-0">💬</span>
                  <span>
                    <strong>เชื่อมต่อ LINE สำเร็จ:</strong> ระบบจะส่งข้อความแจ้งเตือนผลการตรวจสอบคิวไปยังบัญชี LINE นี้โดยอัตโนมัติ
                  </span>
                </div>
              )}

              {/* Ticket Instructions */}
              <div className="bg-[#F5F7FA] p-3 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">💡 ข้อควรปฏิบัติ:</p>
                <p>• กรุณามาถึงคลินิกก่อนเวลานัด 10-15 นาที</p>
                <p>• บันทึกภาพหน้าจอบัตรคิวนี้ไว้เพื่อความสะดวก</p>
              </div>
            </div>

            {/* Ticket Perforation effect */}
            <div className="relative flex items-center justify-between px-2 bg-white">
              <div className="w-4 h-8 bg-[#F5F7FA] rounded-r-full -ml-4 border-r border-slate-200" />
              <div className="flex-1 border-b-2 border-dashed border-slate-200 mx-2" />
              <div className="w-4 h-8 bg-[#F5F7FA] rounded-l-full -mr-4 border-l border-slate-200" />
            </div>

            {/* Ticket Footer Action Buttons */}
            <div className="p-4 bg-[#F5F7FA] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const qNum = createdBooking.queueNumber || createdBooking.id;
                  const dateStr = createdBooking.date || selectedDate;
                  const timeStr = createdBooking.time || selectedSlot?.time;
                  navigator.clipboard.writeText(
                    `คิวนัดหมายทำฟัน Q-Dentist หมายเลข: ${qNum} วันที่: ${dateStr} เวลา: ${timeStr} น. สิทธิ: ${createdBooking.medicalRights || selectedMedicalRights}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "คัดลอกแล้ว!" : "คัดลอกข้อมูล"}</span>
              </button>

              <Link
                href={`/tracking?q=${createdBooking.queueNumber || createdBooking.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#063466] text-white text-xs font-bold hover:bg-[#05264b] transition-colors"
              >
                <span>ตรวจสอบคิวในระบบติดตาม</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D5A423]" />
              </Link>
            </div>
          </div>

          {/* Quick Buttons below ticket */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedSlot(null);
                setPhoneNumber("");
                setSymptoms("");
                setSelectedMedicalRights("บัตรทอง");
                setPdpaAccepted(false);
                setCreatedBooking(null);
              }}
              className="text-xs text-[#063466] hover:underline font-semibold cursor-pointer"
            >
              + ทำการจองคิวใหม่เพิ่มเติม
            </button>
          </div>
        </div>
      )}

      {/* PDPA Full Terms Modal */}
      {showPdpaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#063466]" />
                <h3 className="font-bold text-slate-900 text-base">
                  นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA Privacy Notice)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPdpaModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto text-xs text-slate-600 space-y-3 leading-relaxed">
              <p className="font-semibold text-slate-800">
                พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) — คลินิกทันตกรรม Q-Dentist
              </p>
              <p>
                <strong>1. วัตถุประสงค์ในการเก็บรวบรวม:</strong> ข้อมูลชื่อ-นามสกุล และ LINE User ID จะถูกนำไปใช้เพื่อการระบุตัวตนของผู้รับบริการ การจัดการคิวตรวจทันตกรรม และการติดต่อแจ้งเตือนนัดหมายผ่าน LINE Messaging API เท่านั้น
              </p>
              <p>
                <strong>2. การรักษาความปลอดภัยของข้อมูล:</strong> คลินิกใช้มาตรการปกป้องข้อมูลระดับมาตรฐาน มีการตรวจสอบความถูกต้องของ ID Token เพื่อความปลอดภัย
              </p>
              <p>
                <strong>3. สิทธิการรักษาพยาบาล:</strong> ข้อมูลสิทธิการรักษาพยาบาลใช้เพื่อการจัดเตรียมเอกสารการเบิกจ่ายและอำนวยความสะดวกในการเข้ารับบริการ
              </p>
              <p>
                <strong>4. สิทธิของเจ้าของข้อมูลส่วนบุคคล:</strong> ท่านมีสิทธิตามกฎหมายในการขอเข้าถึง ขอสำเนา ขอแก้ไข หรือขอให้ลบข้อมูลส่วนบุคคลของท่านได้โดยแจ้งเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ของคลินิก
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPdpaAccepted(true);
                  setShowPdpaModal(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#063466] hover:bg-[#05264b] cursor-pointer"
              >
                เข้าใจและยอมรับเงื่อนไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIFF SDK for LINE Login & Automated Notifications */}
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={initLiff}
      />
    </div>
  );
}
