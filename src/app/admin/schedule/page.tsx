"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sliders, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  RefreshCw
} from "lucide-react";
import { formatThaiDate } from "@/lib/utils";
import { SlotAvailability } from "@/lib/types";

export default function ScheduleControlPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  });

  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTime, setUpdatingTime] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom block reason prompt state
  const [blockingSlot, setBlockingSlot] = useState<SlotAvailability | null>(null);
  const [customReason, setCustomReason] = useState("ทันตแพทย์ติดเคสผ่าตัดหรือประชุมวิชาการ");

  async function fetchSlots() {
    try {
      setLoading(true);
      const res = await fetch(`/api/slots?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  async function handleToggleSlot(time: string, shouldBlock: boolean, reason?: string) {
    try {
      setUpdatingTime(time);
      setSuccessMsg(null);

      const res = await fetch("/api/slots/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time,
          isBlocked: shouldBlock,
          blockedReason: shouldBlock ? reason || "ระงับการจองโดยเจ้าหน้าที่คลินิก" : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        fetchSlots();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setUpdatingTime(null);
      setBlockingSlot(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าแดชบอร์ด</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/30">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              จัดการสล็อตและตารางเวลา (Slot & Schedule Control)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            เปิดหรือระงับการจองช่วงเวลาต่างๆ เมื่อคุณหมอติดผ่าตัดใหญ่ ประชุม หรือซ่อมบำรุงยูนิตทำฟัน
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200 text-xs shadow-sm">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span className="font-bold text-slate-700">เลือกวันที่:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold text-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Slots Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              สถานะสล็อตประจำวัน ({formatThaiDate(selectedDate, { includeDay: true })})
            </h2>
            <p className="text-xs text-slate-500">
              คลิกปุ่มเพื่อเปิดให้บริการ (Open) หรือ ระงับการจอง (Block)
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSlots}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {slots.map((s) => {
              const isBlocked = s.status === "BLOCKED";
              const isUpdating = updatingTime === s.time;

              return (
                <div
                  key={s.time}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    isBlocked
                      ? "border-slate-300 bg-slate-50"
                      : "border-teal-200 bg-teal-50/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-900">{s.time} น.</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isBlocked
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isBlocked ? "🔒 ระงับการจอง (Blocked)" : "🟢 เปิดรับนัด (Open)"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      รอบ: {s.period === "MORNING" ? "เช้า (09:00 - 12:00)" : "บ่าย (13:00 - 16:00)"}
                    </div>

                    <div className="text-xs text-slate-600">
                      จำนวนคิวจองในสล็อตนี้: <span className="font-bold">{s.currentBookings} / {s.maxCapacity}</span>
                    </div>

                    {isBlocked && s.blockedReason && (
                      <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                        <strong>สาเหตุ:</strong> {s.blockedReason}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                    {isUpdating ? (
                      <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                    ) : isBlocked ? (
                      <button
                        type="button"
                        onClick={() => handleToggleSlot(s.time, false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>เปิดให้บริการช่วงนี้</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setBlockingSlot(s);
                          setCustomReason("ทันตแพทย์ติดภารกิจผ่าตัดด่วน");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>ระงับการจองช่วงนี้</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      {blockingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Lock className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">
                ระงับการจองเวลา {blockingSlot.time} น. ({selectedDate})
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              ผู้ป่วยจะไม่สามารถเลือกจองคิวในช่วงเวลาดังกล่าวได้
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                สาเหตุการระงับการจอง:
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="เช่น ทันตแพทย์ติดประชุมวิชาการ, เคสผ่าตัดพิเศษ"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockingSlot(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleToggleSlot(blockingSlot.time, true, customReason)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                ยืนยันการระงับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
