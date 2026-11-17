"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  CalendarClock, 
  Settings, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  XCircle, 
  Plus, 
  Search, 
  Phone, 
  Activity, 
  MessageCircle,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Check
} from "lucide-react";

// Mock Data Type
interface QueueItem {
  id: string;
  time: string;
  queueNumber: string;
  patientName: string;
  phone: string;
  service: string;
  isProcedure: boolean; // นับโควตา 6 คิว/วัน (ขูด, อุด, ถอน)
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  lineConfirmed: boolean;
}

const initialQueueData: QueueItem[] = [
  {
    id: "1",
    time: "09:00",
    queueNumber: "DEN-001",
    patientName: "คุณสมชาย ใจดี",
    phone: "081-234-5678",
    service: "ขูดหินปูน",
    isProcedure: true,
    status: "Completed",
    lineConfirmed: true,
  },
  {
    id: "2",
    time: "10:00",
    queueNumber: "DEN-002",
    patientName: "คุณวิภาดา สุขใจ",
    phone: "089-876-5432",
    service: "อุดฟัน",
    isProcedure: true,
    status: "Confirmed",
    lineConfirmed: true,
  },
  {
    id: "3",
    time: "11:00",
    queueNumber: "DEN-003",
    patientName: "คุณกิตติศักดิ์ พัฒนา",
    phone: "086-555-1234",
    service: "ตรวจฟัน/ปรึกษา",
    isProcedure: false,
    status: "Pending",
    lineConfirmed: true,
  },
  {
    id: "4",
    time: "13:30",
    queueNumber: "DEN-004",
    patientName: "คุณศิริพร บุญยืน",
    phone: "082-999-4321",
    service: "ถอนฟัน",
    isProcedure: true,
    status: "Confirmed",
    lineConfirmed: true,
  },
];

export default function AdminDashboardPage() {
  const [activeMenu, setActiveMenu] = useState<"overview" | "queue" | "settings">("overview");
  const [queueList, setQueueList] = useState<QueueItem[]>(initialQueueData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ฟังก์ชันแสดง Toast แจ้งเตือนการกระทำ
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // จัดการปุ่ม Check-in
  const handleCheckIn = (id: string, name: string) => {
    setQueueList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Completed" } : item
      )
    );
    showToast(`✓ บันทึกเช็คอิน/เสร็จสิ้นการรักษา: ${name}`);
  };

  // จัดการปุ่ม Cancel
  const handleCancel = (id: string, name: string) => {
    if (confirm(`คุณต้องการยกเลิกคิวของ "${name}" ใช่หรือไม่?`)) {
      setQueueList((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Cancelled" } : item
        )
      );
      showToast(`✕ ยกเลิกคิวเรียบร้อย: ${name}`);
    }
  };

  // กรองข้อมูลในตาราง
  const filteredQueue = queueList.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.queueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);

    const matchesStatus =
      statusFilter === "ALL" ? true : item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row text-slate-800">
      {/* ======================================================== */}
      {/* 1. SIDEBAR (เมนู: ภาพรวม, จัดการคิว, ตั้งค่าระบบ) */}
      {/* ======================================================== */}
      <aside className="w-full lg:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Brand / Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            🦷
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
              Q-Dentist
            </div>
            <span className="text-[10px] font-semibold tracking-wider text-teal-600 uppercase">
              Staff Portal
            </span>
          </div>
        </div>

        {/* Navigation Menus */}
        <div className="p-4 flex-1 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            เมนูหลัก
          </div>

          <button
            onClick={() => setActiveMenu("overview")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeMenu === "overview"
                ? "bg-teal-50 text-teal-700 font-semibold shadow-xs"
                : "text-slate-600 hover:bg-gray-100 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeMenu === "overview" ? "text-teal-600" : "text-slate-400"}`} />
            <span>ภาพรวม</span>
          </button>

          <button
            onClick={() => setActiveMenu("queue")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeMenu === "queue"
                ? "bg-teal-50 text-teal-700 font-semibold shadow-xs"
                : "text-slate-600 hover:bg-gray-100 hover:text-slate-900"
            }`}
          >
            <CalendarClock className={`w-4 h-4 ${activeMenu === "queue" ? "text-teal-600" : "text-slate-400"}`} />
            <span>จัดการคิว</span>
          </button>

          <button
            onClick={() => setActiveMenu("settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeMenu === "settings"
                ? "bg-teal-50 text-teal-700 font-semibold shadow-xs"
                : "text-slate-600 hover:bg-gray-100 hover:text-slate-900"
            }`}
          >
            <Settings className={`w-4 h-4 ${activeMenu === "settings" ? "text-teal-600" : "text-slate-400"}`} />
            <span>ตั้งค่าระบบ</span>
          </button>
        </div>

        {/* Sidebar Footer / Current User info */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
              ทพ
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                ทพญ. กานดา รักษ์ฟัน
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                ทันตแพทย์ประจำการ
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              คลินิกเปิดบริการ
            </span>
            <Link href="/" className="text-teal-600 hover:underline flex items-center gap-0.5">
              หน้าคนไข้ <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA (เนื้อหาหลักด้านขวา) */}
      {/* ======================================================== */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Top Bar Header & + แทรกคิวฉุกเฉิน (Walk-in) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                แดชบอร์ดจัดการคิวคลินิก
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>วันพฤหัสบดีที่ 14 พฤศจิกายน 2026 • สาขาพญาไท</span>
              </p>
            </div>

            {/* ปุ่ม + แทรกคิวฉุกเฉิน (Walk-in) สีแดง bg-red-500 โดดเด่น */}
            <Link
              href="/admin/emergency"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-sm transition-all hover:shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ แทรกคิวฉุกเฉิน (Walk-in)</span>
            </Link>
          </div>

          {/* ======================================================== */}
          {/* ส่วน Header & โควตา (Top Section - Grid การ์ด 3 ใบ) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* การ์ด 1: โควตาคิวหัตถการวันนี้ (4/6) พร้อม Progress Bar */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  โควตาคิวหัตถการวันนี้
                </span>
                <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    4/6
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (ใช้ไป 67%)
                  </span>
                </div>

                {/* แถบ Progress Bar เล็กๆ */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: "66.7%" }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-50">
                นับเฉพาะ ขูดหินปูน / อุดฟัน / ถอนฟัน • เหลืออีก 2 คิว
              </p>
            </div>

            {/* การ์ด 2: รอเข้าตรวจ (สีเหลือง) */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  รอเข้าตรวจ
                </span>
                <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-600 tracking-tight">
                    2
                  </span>
                  <span className="text-xs text-amber-700 font-medium">
                    คิว
                  </span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-[11px] font-medium text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  คนไข้รอรับการตรวจในคลินิก
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-50">
                เวลารอเฉลี่ยประมาณ 10-15 นาที
              </p>
            </div>

            {/* การ์ด 3: เสร็จสิ้นแล้ว (สีเขียว) */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  เสร็จสิ้นแล้ว
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                    2
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">
                    คิว
                  </span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-[11px] font-medium text-emerald-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ตรวจและรักษาเสร็จสิ้นเรียบร้อย
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-50">
                ระบบส่งแบบประเมินความพึงพอใจผ่าน LINE แล้ว
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. ตารางจัดการคิว (Main Table) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  รายการคิวนัดหมายประจำวัน
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  จัดการคิว ตรวจสอบสถานะการยืนยันผ่าน LINE และเช็คอินเข้าห้องตรวจ
                </p>
              </div>

              {/* Search & Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      statusFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setStatusFilter("Confirmed")}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      statusFilter === "Confirmed"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ยืนยัน
                  </button>
                  <button
                    onClick={() => setStatusFilter("Completed")}
                    className={`px-2 py-1 rounded-md font-medium transition-all ${
                      statusFilter === "Completed"
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            </div>

            {/* Table Element */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">เวลา & รหัสคิว</th>
                    <th className="py-3 px-4">ชื่อคนไข้ & เบอร์โทร</th>
                    <th className="py-3 px-4">บริการ</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">LINE Status</th>
                    <th className="py-3 px-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        ไม่พบข้อมูลคิวนัดหมายที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* 1. เวลา & รหัสคิว */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {item.time} น.
                            </span>
                            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                              {item.queueNumber}
                            </span>
                          </div>
                        </td>

                        {/* 2. ชื่อคนไข้ & เบอร์โทร (สไตล์สะอาด) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {item.patientName}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{item.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. บริการ */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="font-medium text-slate-800 text-xs block">
                              {item.service}
                            </span>
                            {item.isProcedure ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                                นับโควตา (หัตถการ)
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                                ตรวจทั่วไป (ไม่จำกัด)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. สถานะ (Badge UI: Pending, Confirmed, Completed) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.status === "Pending" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending (รอตรวจ)
                            </span>
                          )}
                          {item.status === "Confirmed" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Confirmed (ยืนยันแล้ว)
                            </span>
                          )}
                          {item.status === "Completed" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Completed (เสร็จสิ้น)
                            </span>
                          )}
                          {item.status === "Cancelled" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Cancelled (ยกเลิก)
                            </span>
                          )}
                        </td>

                        {/* 5. LINE Status (แสดงไอคอนแจ้งว่ายืนยันผ่าน LINE แล้ว) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.lineConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <MessageCircle className="w-3.5 h-3.5 text-[#06C755] fill-emerald-100" />
                              <span>ยืนยันผ่าน LINE แล้ว</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-500">
                              <span>ยังไม่เชื่อมต่อ</span>
                            </span>
                          )}
                        </td>

                        {/* 6. การจัดการ (ไอคอนปุ่ม Check-in, Cancel) */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1">
                            {/* ปุ่ม Check-in */}
                            <button
                              onClick={() => handleCheckIn(item.id, item.patientName)}
                              disabled={item.status === "Completed" || item.status === "Cancelled"}
                              title="เช็คอิน / บันทึกตรวจเสร็จสิ้น"
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.status === "Completed"
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100"
                              }`}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            {/* ปุ่ม Cancel */}
                            <button
                              onClick={() => handleCancel(item.id, item.patientName)}
                              disabled={item.status === "Completed" || item.status === "Cancelled"}
                              title="ยกเลิกนัดหมาย"
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.status === "Completed" || item.status === "Cancelled"
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100"
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            <div className="p-3.5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-slate-500 px-4">
              <span>แสดงทั้งหมด {filteredQueue.length} รายการ</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> = เช็คอินเข้าตรวจ/เสร็จสิ้น
                </span>
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" /> = ยกเลิกคิว
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
