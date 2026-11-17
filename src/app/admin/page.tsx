"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Activity, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Bell, 
  Sliders, 
  MessageSquare,
  Search,
  Check,
  ChevronDown,
  Loader2,
  ExternalLink,
  MapPin,
  PhoneCall,
  Settings
} from "lucide-react";
import { formatThaiDate, maskPhoneNumber, maskNationalIdOrHn } from "@/lib/utils";
import { BookingRecord, BookingStatus, ClinicKPIs } from "@/lib/types";

export default function AdminDashboardPage() {
  const [dateMode, setDateMode] = useState<"ALL" | "SINGLE">("ALL");
  const [customDate, setCustomDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [medicalRightsFilter, setMedicalRightsFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMasked, setShowMasked] = useState(true);

  // Data states
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<ClinicKPIs>({
    pendingCount: 0,
    confirmedTodayCount: 0,
    inProgressCount: 0,
    completedTodayCount: 0,
    emergencyCount: 0,
    totalToday: 0,
  });
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  // Action states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Emergency SOS cases state
  const [sosCases, setSosCases] = useState<any[]>([]);
  const [contactingId, setContactingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingBooking, setRejectingBooking] = useState<BookingRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Cron test trigger state
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // Developer tools dropdown toggle
  const [showDevTools, setShowDevTools] = useState(false);

  // Load KPIs, Bookings and Emergency SOS Cases
  async function loadData() {
    setLoading(true);
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const activeDate = dateMode === "ALL" ? "ALL" : customDate;
      const kpiDate = activeDate === "ALL" ? todayStr : activeDate;

      // 1. Fetch KPIs
      const kpiRes = await fetch(`/api/admin/kpis?date=${kpiDate}`);
      const kpiData = await kpiRes.json();
      if (kpiData.success) {
        setKpis(kpiData.kpis);
      }

      // 2. Fetch Bookings (แสดงรายการจองทั้งหมดโดยไม่จำกัดเพียงวันปัจจุบัน)
      const dateParam = activeDate === "ALL" ? "date=ALL" : `date=${activeDate}`;
      const statusParam = statusFilter !== "ALL" ? `&status=${statusFilter}` : "";
      const bookingRes = await fetch(`/api/bookings?${dateParam}${statusParam}`);
      const bookingData = await bookingRes.json();
      if (bookingData.success) {
        setBookings(bookingData.bookings);
      }

      // 3. Fetch Emergency SOS Cases (PENDING)
      const sosRes = await fetch("/api/admin/emergency-cases");
      const sosData = await sosRes.json();
      if (sosData.success) {
        setSosCases(sosData.cases);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Mark Emergency Case as Contacted
  async function handleMarkContacted(caseId: string) {
    try {
      setContactingId(caseId);
      const res = await fetch("/api/admin/emergency-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: caseId, status: "CONTACTED" }),
      });
      const data = await res.json();
      if (data.success) {
        setSosCases((prev) => prev.filter((c) => c.id !== caseId));
        setActionMessage("บันทึกการโทรติดต่อกลับเคสฉุกเฉินเรียบร้อยแล้ว");
      }
    } catch (err) {
      console.error("Error marking contacted:", err);
    } finally {
      setContactingId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, [dateMode, customDate, statusFilter]);

  // Handle Quick Status Change
  async function handleStatusChange(bookingId: string, newStatus: BookingStatus, reason?: string) {
    try {
      setUpdatingId(bookingId);
      setActionMessage(null);

      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          rejectReason: reason || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(
          `อัปเดตสถานะคิวเป็น ${newStatus} สำเร็จ ${
            data.notificationSent ? "พร้อมส่ง LINE Flex Notification แล้ว" : ""
          }`
        );
        loadData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setUpdatingId(null);
      setRejectingBooking(null);
      setRejectReason("");
    }
  }

  // Handle Manual Advance Reminder Cron Run
  async function triggerAdvanceReminderCron() {
    try {
      setCronRunning(true);
      setCronResult(null);

      const res = await fetch("/api/cron/reminders?daysAhead=2");
      const data = await res.json();
      if (data.success) {
        setCronResult(data.result);
        setActionMessage(
          `⚡ รันระบบส่งการแจ้งเตือนล่วงหน้า 2 วันสำเร็จ: ส่งแจ้งเตือนทั้งหมด ${data.result.count} รายการ`
        );
        loadData();
      }
    } catch (err) {
      console.error("Cron trigger error:", err);
      alert("ไม่สามารถรัน Cron Job ได้");
    } finally {
      setCronRunning(false);
    }
  }

  // Handle Reject Flow Submit
  async function handleRejectSubmit() {
    if (!rejectingBooking) return;
    const cleanReason = rejectReason.trim();
    if (!cleanReason) {
      setRejectError("กรุณาระบุเหตุผลการไม่อนุมัติการจองคิว");
      return;
    }
    if (cleanReason.length > 500) {
      setRejectError("เหตุผลการไม่อนุมัติมีความยาวเกินกำหนด (สูงสุด 500 ตัวอักษร)");
      return;
    }

    try {
      setIsSubmittingReject(true);
      setRejectError(null);

      const res = await fetch(`/api/bookings/${rejectingBooking.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectReason: cleanReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(
          `ไม่อนุมัติคิว ${rejectingBooking.queueNumber} สำเร็จ ${
            data.notificationSent ? "พร้อมส่ง LINE Flex แจ้งเตือนแล้ว" : ""
          }`
        );
        setRejectingBooking(null);
        setRejectReason("");
        setRejectError(null);
        await loadData();
      } else {
        setRejectError(data.error || "เกิดข้อผิดพลาดในการไม่อนุมัติคิว");
      }
    } catch (err) {
      console.error("Error rejecting booking:", err);
      setRejectError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmittingReject(false);
    }
  }

  // Filter Bookings by Search, Period, Service, and Medical Rights
  const filteredBookings = bookings.filter((b) => {
    // 1. Search Query: ค้นหารหัสคิว, ชื่อโปรไฟล์ LINE (patientName), หรือเบอร์โทร
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQueue = (b.queueNumber || "").toLowerCase().includes(q);
      const matchName = (b.patientName || "").toLowerCase().includes(q);
      const matchPhone = (b.phoneNumber || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
      if (!matchQueue && !matchName && !matchPhone) return false;
    }

    // 2. รอบเวลา (Period): เช้า (< 12:00) / บ่าย (>= 12:00)
    if (periodFilter !== "ALL") {
      const hour = parseInt((b.time || "").split(":")[0], 10);
      const isMorning = !isNaN(hour) && hour < 12;
      const bPeriod = b.period || (isMorning ? "MORNING" : "AFTERNOON");
      if (periodFilter === "MORNING" && bPeriod !== "MORNING") return false;
      if (periodFilter === "AFTERNOON" && bPeriod !== "AFTERNOON") return false;
    }

    // 3. สาเหตุการมา / บริการ (Service)
    if (serviceFilter !== "ALL") {
      const sName = (b.service?.nameTh || "").toLowerCase();
      if (!sName.includes(serviceFilter.toLowerCase())) return false;
    }

    // 4. สิทธิการรักษา (Medical Rights)
    if (medicalRightsFilter !== "ALL") {
      const mRights = (b.medicalRights || "").trim();
      if (mRights !== medicalRightsFilter) return false;
    }

    return true;
  });

  // คำนวณจำนวนคิวหัตถการ (ขูด, อุด, ถอน) ในวันที่เลือก
  const procedureCount =
    kpis.procedureCount ??
    bookings.filter((b) => {
      if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
      const name = b.service?.nameTh || "";
      const nameEn = (b.service?.nameEn || "").toLowerCase();
      const id = (b.service?.id || "").toLowerCase();
      const isMatch =
        name.includes("ขูด") ||
        name.includes("อุด") ||
        name.includes("ถอน") ||
        nameEn.includes("scaling") ||
        nameEn.includes("filling") ||
        nameEn.includes("extraction") ||
        id.includes("scaling") ||
        id.includes("filling") ||
        id.includes("extraction");
      const isConsult = name.includes("ตรวจ") || name.includes("ปรึกษา");
      return isMatch && !isConsult;
    }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Demo Mode Notice Banner */}
      {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development") && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div>
              <p className="font-bold text-sm text-amber-950">
                แดชบอร์ดระบบสาธิต (Admin Demo Mode — ข้อมูลจำลอง)
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                ข้อมูลคิว ตัวชี้วัด และการดำเนินการทั้งหมดในหน้านี้เป็นข้อมูลจำลองเพื่อการตรวจสอบ Mockup เท่านั้น
                การอนุมัติ/ปฏิเสธคิว และการแจ้งเตือน LINE จะเป็นการจำลองโดย<strong>ไม่มีการส่งข้อความจริงไปยัง LINE และไม่มีการบันทึกข้อมูลถาวร</strong>
              </p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-amber-200 text-amber-950 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
            DEMO ONLY
          </span>
        </div>
      )}

      {/* Dashboard Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
              <LayoutDashboard className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              แดชบอร์ดจัดการคิวคลินิกทันตกรรม
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ฝั่งเจ้าหน้าที่คลินิก • จัดการคิวประจำวัน อนุมัติ/ปฏิเสธคิว ระบบฉุกเฉิน และ LINE Messaging
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Step 2: Emergency Fast Track - โดดเด่นที่สุดในแถบด้านบน */}
          <Link
            href="/admin/emergency"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>+ แทรกคิวฉุกเฉิน (Walk-In)</span>
          </Link>

          {/* Slot Control */}
          <Link
            href="/admin/schedule"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>ตั้งค่าสล็อตเวลา</span>
          </Link>

          {/* Step 2: ซ่อน Developer Tools ในเมนู Dropdown รูปเฟือง ⚙️ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDevTools(!showDevTools)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-medium transition-all"
              title="เครื่องมือทดสอบสำหรับนักพัฒนา"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>เครื่องมือทดสอบ</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  showDevTools ? "rotate-180" : ""
                }`}
              />
            </button>

            {showDevTools && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-1 animate-fade-in">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  เครื่องมือทดสอบ (Dev Tools)
                </div>

                {/* LINE Preview */}
                <Link
                  href="/admin/line-preview"
                  onClick={() => setShowDevTools(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>จำลอง LINE Flex</span>
                </Link>

                {/* Cron Trigger Button */}
                <button
                  type="button"
                  disabled={cronRunning}
                  onClick={() => {
                    setShowDevTools(false);
                    triggerAdvanceReminderCron();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 text-xs font-medium transition-colors text-left disabled:opacity-50"
                  title="ทดสอบรัน Cron Job เตือนล่วงหน้า 2 วันทันที"
                >
                  {cronRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                  ) : (
                    <Bell className="w-4 h-4 text-cyan-600" />
                  )}
                  <span>ทดสอบ Cron ล่วงหน้า 2 วัน</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚨 Emergency SOS from LINE Alert Box (ด้านบนสุดของ Dashboard) */}
      {sosCases.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-3xl p-4 sm:p-6 shadow-lg shadow-rose-500/10 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-rose-900 tracking-tight flex items-center gap-2">
                <span>🚨 เคสฉุกเฉิน SOS ผ่าน LINE Official Account</span>
                <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {sosCases.length} เคสรอติดต่อกลับ
                </span>
              </h2>
            </div>
            <span className="text-[11px] font-bold text-rose-700 hidden sm:inline">
              ด่วนที่สุด (High Priority)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sosCases.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-rose-400 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                      <span>{c.phone ? c.phone : "ยังไม่ระบุเบอร์"}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(c.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                    </span>
                  </div>

                  {c.address && (
                    <p className="text-[11px] text-slate-500 truncate" title={c.address}>
                      📍 {c.address}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {/* ปุ่ม 📍 ดูแผนที่ */}
                  {c.latitude && c.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors text-center"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>📍 ดูแผนที่</span>
                    </a>
                  ) : (
                    <span className="flex-1 text-[11px] text-slate-400 text-center py-2 bg-slate-50 rounded-xl">
                      ไม่มีพิกัด
                    </span>
                  )}

                  {/* ปุ่ม โทรกลับแล้ว (Mark as Contacted) */}
                  <button
                    type="button"
                    disabled={contactingId === c.id}
                    onClick={() => handleMarkContacted(c.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
                  >
                    {contactingId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>โทรกลับแล้ว</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 text-teal-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-teal-700 hover:text-teal-900 text-xs font-bold"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Real-time KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Pending */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">รออนุมัติ</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">
            {kpis.pendingCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">ต้องตรวจสอบและกดยืนยัน</p>
        </div>

        {/* KPI 2: Confirmed Today */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">ยืนยันแล้ววันนี้</span>
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-teal-700">
            {kpis.confirmedTodayCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">คิวพร้อมเข้าตรวจ</p>
        </div>

        {/* KPI 3: In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">กำลังรักษา</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-indigo-600">
            {kpis.inProgressCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">อยู่ในห้องตรวจทันตกรรม</p>
        </div>

        {/* KPI 4: Completed Today */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">เสร็จสิ้นวันนี้</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
            {kpis.completedTodayCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">รักษาเรียบร้อยแล้ว</p>
        </div>

        {/* KPI 5: Emergency Cases */}
        <div className="bg-white p-4 rounded-2xl border border-rose-300 bg-rose-50/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">เคสฉุกเฉิน</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600">
            {kpis.emergencyCount}
          </div>
          <p className="text-[10px] text-rose-500 mt-0.5">แทรกคิว Buffer วันนี้</p>
        </div>

        {/* Step 1: KPI 6: Procedure Quota (โควตาคิวหัตถการ 6 คิว) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              โควตาคิวหัตถการ
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                procedureCount >= 6
                  ? "bg-rose-100 text-rose-600 font-bold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 flex items-baseline gap-1">
            <span className={procedureCount >= 6 ? "text-rose-600" : "text-slate-800"}>
              {procedureCount}
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-400">/6</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">เฉพาะขูด, อุด, ถอน</p>
        </div>
      </div>

      {/* Filter and Date Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        {/* Top Controls Row: Date, Status, Period, Service, Medical Rights */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-600 ml-1.5" />
            <button
              type="button"
              onClick={() => setDateMode("ALL")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                dateMode === "ALL"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ทั้งหมด (ทุกวัน)
            </button>
            <button
              type="button"
              onClick={() => setDateMode("SINGLE")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                dateMode === "SINGLE"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              เลือกวันที่
            </button>
            {dateMode === "SINGLE" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none"
              />
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-bold text-slate-700">สถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ทั้งหมด (All)</option>
              <option value="PENDING">⏳ รออนุมัติ (Pending)</option>
              <option value="CONFIRMED">✅ ยืนยันแล้ว (Confirmed)</option>
              <option value="CHECKED_IN">🏥 เช็คอินแล้ว (Checked In)</option>
              <option value="IN_PROGRESS">🩺 กำลังรักษา (In Progress)</option>
              <option value="COMPLETED">🎉 เสร็จสิ้น (Completed)</option>
              <option value="REJECTED">🚫 ไม่อนุมัติ (Rejected)</option>
            </select>
          </div>

          {/* Period Filter (รอบเช้า / บ่าย) */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-bold text-slate-700">รอบเวลา:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ทุกรอบเวลา (All)</option>
              <option value="MORNING">☀️ รอบเช้า (&lt; 12:00 น.)</option>
              <option value="AFTERNOON">⛅ รอบบ่าย (≥ 12:00 น.)</option>
            </select>
          </div>

          {/* Service Filter (สาเหตุการมา) */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">บริการ:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ทุกบริการ</option>
              <option value="ตรวจ">ตรวจฟัน / ปรึกษา</option>
              <option value="ขูด">ขูดหินปูน</option>
              <option value="อุด">อุดฟัน</option>
              <option value="ถอน">ถอนฟัน</option>
            </select>
          </div>

          {/* Medical Rights Filter (สิทธิการรักษา) */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">สิทธิการรักษา:</span>
            <select
              value={medicalRightsFilter}
              onChange={(e) => setMedicalRightsFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสิทธิการรักษา</option>
              <option value="บัตรทอง">บัตรทอง</option>
              <option value="ประกันสังคม">ประกันสังคม</option>
              <option value="ข้าราชการ">ข้าราชการ</option>
              <option value="ชำระเอง">ชำระเอง</option>
              <option value="ไม่แน่ใจ">ไม่แน่ใจ</option>
            </select>
          </div>

          {/* PDPA Masking Staff Toggle */}
          <button
            type="button"
            onClick={() => setShowMasked(!showMasked)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              showMasked
                ? "bg-slate-100 text-slate-600 border-slate-200"
                : "bg-teal-50 text-teal-800 border-teal-300"
            }`}
            title="สลับโหมดการปกปิดข้อมูลตาม PDPA"
          >
            {showMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showMasked ? "PDPA: ปิดบังข้อมูล" : "PDPA: แสดงข้อมูลจริง"}</span>
          </button>
        </div>

        {/* Bottom Search & Refresh Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหารหัสคิว, ชื่อโปรไฟล์ LINE, เบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {(statusFilter !== "ALL" || periodFilter !== "ALL" || serviceFilter !== "ALL" || medicalRightsFilter !== "ALL" || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setPeriodFilter("ALL");
                  setServiceFilter("ALL");
                  setMedicalRightsFilter("ALL");
                  setSearchQuery("");
                }}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold"
              >
                ล้างตัวกรอง
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>
      </div>

      {/* Queue Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              ตารางคิวตรวจ ({dateMode === "ALL" ? "รายการจองทั้งหมดทุกวัน" : formatThaiDate(customDate, { includeDay: true })})
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredBookings.length} รายการ
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs text-slate-400">กำลังโหลดรายการคิว...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            ไม่พบคิวการนัดหมายตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">คิวตรวจ</th>
                  <th className="py-3.5 px-4">วัน & เวลา</th>
                  <th className="py-3.5 px-4">ผู้รับบริการ (LINE)</th>
                  <th className="py-3.5 px-4">สิทธิการรักษา</th>
                  <th className="py-3.5 px-4">สาเหตุ / บริการ</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4">แจ้งเตือน LINE</th>
                  <th className="py-3.5 px-4 text-center">จัดการสถานะ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => {
                  const isUpdating = updatingId === b.id;
                  const isEmergency = b.isEmergency;
                  const hour = parseInt((b.time || "").split(":")[0], 10);
                  const isMorning = !isNaN(hour) && hour < 12;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEmergency ? "bg-rose-50/40" : ""
                      }`}
                    >
                      {/* Queue Number */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                              isEmergency
                                ? "bg-rose-600 text-white"
                                : "bg-teal-100 text-teal-900"
                            }`}
                          >
                            {b.queueNumber}
                          </span>
                          {isEmergency && (
                            <span className="text-[10px] font-bold text-rose-600">
                              🚨 ฉุกเฉิน
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {formatThaiDate(b.date, { short: true })}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-teal-700 font-bold mt-0.5">
                          <span>{b.time} น.</span>
                          <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-md ${
                            isMorning ? "bg-amber-50 text-amber-700" : "bg-cyan-50 text-cyan-700"
                          }`}>
                            {isMorning ? "รอบเช้า" : "รอบบ่าย"}
                          </span>
                        </div>
                      </td>

                      {/* Patient Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-sm">
                            {b.patientName}
                          </div>
                          <div className="font-mono text-slate-500 text-[11px]">
                            {showMasked ? maskPhoneNumber(b.phoneNumber) : (b.phoneNumber || "ไม่ได้ระบุ")}
                          </div>
                          {b.symptoms && (
                            <div className="text-[11px] text-teal-700 italic max-w-xs truncate">
                              "{b.symptoms}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Medical Rights */}
                      <td className="py-3.5 px-4">
                        {b.medicalRights ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            b.medicalRights === "บัตรทอง"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : b.medicalRights === "ประกันสังคม"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : b.medicalRights === "ข้าราชการ"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : b.medicalRights === "ชำระเอง"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {b.medicalRights}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">ไม่ได้ระบุ</span>
                        )}
                      </td>

                      {/* Service */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.service?.nameTh || "ทันตกรรมทั่วไป"}</div>
                        <div className="text-slate-400 text-[10px]">
                          ~{b.service?.durationMinutes || 30} นาที
                        </div>
                      </td>

                      {/* Status & Rejection Reason */}
                      <td className="py-3.5 px-4">
                        {b.status === "PENDING" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⏳ รออนุมัติ
                          </span>
                        )}
                        {b.status === "CONFIRMED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            ✅ ยืนยันแล้ว
                          </span>
                        )}
                        {b.status === "CHECKED_IN" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            🏥 เช็คอินแล้ว
                          </span>
                        )}
                        {b.status === "IN_PROGRESS" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse">
                            🩺 กำลังรักษา
                          </span>
                        )}
                        {b.status === "COMPLETED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🎉 เสร็จสิ้น
                          </span>
                        )}
                        {b.status === "REJECTED" && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              🚫 ไม่อนุมัติ
                            </span>
                            {b.rejectReason && (
                              <div className="text-[10px] text-rose-700 bg-rose-50/90 p-1.5 rounded-lg border border-rose-200/80 max-w-xs leading-relaxed font-medium">
                                <span className="font-bold text-rose-800">เหตุผล: </span>
                                {b.rejectReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Reminder / LINE Notification */}
                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="space-y-1">
                          {b.lineNotificationSent ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              ส่ง LINE แล้ว
                            </span>
                          ) : (
                            <span className="text-slate-400">ยังไม่ส่ง</span>
                          )}

                          {b.reminderStatus === "ATTENDANCE_CONFIRMED" && (
                            <div className="text-[10px] text-blue-700 font-bold">
                              คนไข้ยืนยันการมาแล้ว
                            </div>
                          )}
                          {b.reminderStatus === "RESCHEDULE_REQUESTED" && (
                            <div className="text-[10px] text-amber-700 font-bold">
                              คนไข้ขอเลื่อนนัด
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        {isUpdating ? (
                          <Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {/* PENDING -> Approve or Reject */}
                            {b.status === "PENDING" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(b.id, "CONFIRMED")}
                                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-sm transition-colors"
                                  title="อนุมัติคิวและส่ง LINE Flex แจ้งเตือนคนไข้ทันที"
                                >
                                  ✓ อนุมัติ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingBooking(b);
                                    setRejectReason("");
                                    setRejectError(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-colors"
                                  title="ไม่อนุมัติคิวและระบุสาเหตุ"
                                >
                                  ✕ ไม่อนุมัติ
                                </button>
                              </>
                            )}

                            {/* CONFIRMED -> Check-In or Reject */}
                            {b.status === "CONFIRMED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(b.id, "CHECKED_IN")}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors"
                                >
                                  เช็คอิน
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingBooking(b);
                                    setRejectReason("");
                                    setRejectError(null);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-colors"
                                  title="ไม่อนุมัติคิวและระบุสาเหตุ"
                                >
                                  ✕ ไม่อนุมัติ
                                </button>
                              </>
                            )}

                            {/* CHECKED_IN -> In Progress */}
                            {b.status === "CHECKED_IN" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(b.id, "IN_PROGRESS")}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors"
                              >
                                เรียกเข้าตรวจ
                              </button>
                            )}

                            {/* IN_PROGRESS -> Completed */}
                            {b.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(b.id, "COMPLETED")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                              >
                                เสร็จสิ้น
                              </button>
                            )}

                            {/* Finished or Rejected options */}
                            {(b.status === "COMPLETED" || b.status === "REJECTED") && (
                              <span className="text-[11px] text-slate-400">
                                {b.status === "REJECTED" ? "ไม่อนุมัติแล้ว" : "ปิดงานแล้ว"}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Prompt Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">
                ไม่อนุมัติคิวตรวจ: {rejectingBooking.queueNumber}
              </h3>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700">
              <p>
                <strong>ผู้รับบริการ:</strong> {rejectingBooking.patientName}
              </p>
              <p>
                <strong>บริการ:</strong> {rejectingBooking.service?.nameTh || "ทันตกรรมทั่วไป"} • <strong>วัน-เวลา:</strong> {rejectingBooking.date} ({rejectingBooking.time} น.)
              </p>
              {rejectingBooking.medicalRights && (
                <p>
                  <strong>สิทธิการรักษา:</strong> {rejectingBooking.medicalRights}
                </p>
              )}
            </div>

            {/* Quick preset reasons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">
                เลือกเหตุผลสำเร็จรูป หรือกรอกรายละเอียดเพิ่มเติม:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "คิวเต็มในช่วงเวลาดังกล่าว",
                  "ทันตแพทย์ติดภารกิจผ่าตัดฉุกเฉิน",
                  "อยู่นอกเวลาให้บริการของคลินิก",
                  "ข้อมูลการจองไม่ถูกต้องหรือไม่ครบถ้วน",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={isSubmittingReject}
                    onClick={() => {
                      setRejectReason(preset);
                      setRejectError(null);
                    }}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 disabled:opacity-50 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  ระบุเหตุผลการไม่อนุมัติ (จะส่งแจ้งเตือนผ่าน LINE ถึงคนไข้): <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    rejectReason.trim().length > 500
                      ? "text-rose-600 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {rejectReason.trim().length}/500
                </span>
              </div>
              <textarea
                rows={3}
                required
                disabled={isSubmittingReject}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectError(null);
                }}
                placeholder="ระบุเหตุผลจริง เช่น คิวเต็มในช่วงเวลาดังกล่าว กรุณาเลือกวันหรือเวลาใหม่..."
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                  rejectReason.trim().length > 500
                    ? "border-rose-400 focus:border-rose-600 bg-rose-50/30"
                    : "border-slate-200 focus:border-rose-500"
                }`}
              />
              {rejectError && (
                <p className="text-xs text-rose-600 font-semibold">{rejectError}</p>
              )}
            </div>

            {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development") && (
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                💡 โหมดสาธิต (Demo Mode): การปฏิเสธคิวเป็นการจำลอง ไม่มีการส่งข้อความจริงไปยัง LINE และไม่มีการบันทึกข้อมูลถาวร
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={() => {
                  setRejectingBooking(null);
                  setRejectReason("");
                  setRejectError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectReason.trim().length > 500 || isSubmittingReject}
                onClick={handleRejectSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
              >
                {isSubmittingReject ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>ยืนยันการไม่อนุมัติ & ส่ง LINE</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
