"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  Loader2, 
  Activity,
  HeartPulse,
  Sparkles,
  Zap,
  Upload,
  X,
  Image as ImageIcon
} from "lucide-react";
import { DentalService } from "@/lib/types";

export default function EmergencyWalkInPage() {
  const QUICK_SYMPTOM_TAGS = [
    "เลือดไหลไม่หยุด",
    "ฟันหัก/อุบัติเหตุ",
    "ปวดฟันคุดเฉียบพลัน",
    "เครื่องมือจัดฟันหลุด/ทิ่ม",
  ];

  const [services, setServices] = useState<DentalService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nationalIdOrHn, setNationalIdOrHn] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [emergencySeverity, setEmergencySeverity] = useState<"CRITICAL" | "URGENT" | "MODERATE">("CRITICAL");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [initialStatus, setInitialStatus] = useState<"CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS">("CONFIRMED");
  const [symptomImage, setSymptomImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSymptomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSymptomImage(null);
    setImagePreview(null);
  };

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdEmergency, setCreatedEmergency] = useState<any>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        if (data.success) {
          setServices(data.services);
          if (data.services.length > 0) {
            // Default to extraction or wisdom surgery or first
            const defaultSrv = data.services.find((s: any) => s.id.includes("extraction")) || data.services[0];
            setServiceId(defaultSrv.id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  const handleAppendTag = (tag: string) => {
    setEmergencyNotes((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
  };

  async function handleEmergencySubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!patientName.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุลผู้ป่วย");
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg("กรุณากรอกเบอร์โทรศัพท์");
      return;
    }
    if (!emergencyNotes.trim()) {
      setErrorMsg("กรุณาระบุอาการฉุกเฉินและสาเหตุที่ต้องแทรกคิวเร่งด่วน");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          phoneNumber: phoneNumber.replace(/\D/g, ""),
          nationalIdOrHn: nationalIdOrHn.trim() || "-",
          serviceId,
          emergencySeverity,
          emergencyNotes,
          initialStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการแทรกคิวฉุกเฉิน");
      }

      setCreatedEmergency(data.booking);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าแดชบอร์ด</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              แทรกคิวฉุกเฉิน (Emergency & Walk-In Buffer)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            สำหรับกรณีผู้ป่วยปวดฟันรุนแรง ฟันหัก เลือดออก หรืออุบัติเหตุช่องปาก — ข้ามขีดจำกัดสล็อตมาตรฐาน
          </p>
        </div>
      </div>

      {createdEmergency ? (
        <div className="bg-white rounded-3xl border-2 border-rose-500 p-8 shadow-xl text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              EMERGENCY QUEUE ACTIVATED
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              แทรกคิวฉุกเฉินสำเร็จเรียบร้อย!
            </h2>
            <div className="inline-block mt-2 px-6 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-3xl font-black font-mono">
              {createdEmergency.queueNumber}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl max-w-md mx-auto text-xs text-left space-y-2 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">ผู้ป่วย:</span>
              <span className="font-bold text-slate-900">{createdEmergency.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ระดับความฉุกเฉิน:</span>
              <span className="font-bold text-rose-600">{createdEmergency.emergencySeverity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">สถานะเริ่มต้น:</span>
              <span className="font-bold text-slate-900">{createdEmergency.status}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500">อาการฉุกเฉิน:</span>
              <p className="font-medium text-slate-800 mt-0.5">{createdEmergency.emergencyNotes}</p>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/admin"
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
            >
              ไปยังตารางคิวในแดชบอร์ด
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedEmergency(null);
                setPatientName("");
                setPhoneNumber("");
                setNationalIdOrHn("");
                setEmergencyNotes("");
                handleRemoveImage();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              แทรกเคสฉุกเฉินอื่นเพิ่ม
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleEmergencySubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Severity Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              เลือกระดับความฉุกเฉิน (Triage Priority):
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setEmergencySeverity("CRITICAL")}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  emergencySeverity === "CRITICAL"
                    ? "border-rose-600 bg-rose-50 text-rose-800 font-black shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="text-sm font-bold">🔴 วิกฤต (Critical)</div>
                <div className="text-[10px] opacity-75 mt-0.5">เลือดออกไม่หยุด / ปวดระดับ 9-10</div>
              </button>

              <button
                type="button"
                onClick={() => setEmergencySeverity("URGENT")}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  emergencySeverity === "URGENT"
                    ? "border-amber-500 bg-amber-50 text-amber-800 font-black shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="text-sm font-bold">🟠 เร่งด่วน (Urgent)</div>
                <div className="text-[10px] opacity-75 mt-0.5">บวมมาก / ฟันหักจากอุบัติเหตุ</div>
              </button>

              <button
                type="button"
                onClick={() => setEmergencySeverity("MODERATE")}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  emergencySeverity === "MODERATE"
                    ? "border-blue-500 bg-blue-50 text-blue-800 font-black shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="text-sm font-bold">🔵 ปานกลาง (Walk-In)</div>
                <div className="text-[10px] opacity-75 mt-0.5">เครื่องมือจัดฟันทิ่มแก้ม</div>
              </button>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ชื่อ - นามสกุล ผู้ป่วย <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น นาย ภาณุพงศ์ ประเสริฐแท้"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="เช่น 0829988776"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                เลขประจำตัวประชาชน หรือ HN (ไม่บังคับ)
              </label>
              <input
                type="text"
                placeholder="เลขบัตร 13 หลัก หรือ HN (ถ้ามี)"
                value={nationalIdOrHn}
                onChange={(e) => setNationalIdOrHn(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                บริการที่คาดว่าจะต้องทำหัตถการ
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500 bg-white"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameTh} ({s.durationMinutes} นาที)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Emergency Symptoms Description & Quick Tags */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs font-bold text-slate-700">
                รายละเอียดอาการฉุกเฉินและสาเหตุที่แทรกคิว <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">คลิกแท็กด่วนเพื่อลดเวลาพิมพ์:</span>
            </div>

            {/* Quick Tags Chips */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {QUICK_SYMPTOM_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAppendTag(tag)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                >
                  <span className="text-xs font-bold">+</span>
                  <span>{tag}</span>
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              required
              placeholder="เช่น ปวดฟันคุดเฉียบพลัน ปวดระดับ 9/10 แก้มบวม อ้าปากไม่ขึ้น ทานยาแก้ปวดแล้วไม่ดีขึ้น..."
              value={emergencyNotes}
              onChange={(e) => setEmergencyNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Initial Status */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              กำหนดสถานะเริ่มต้นในคิว:
            </label>
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="initialStatus"
                  value="CONFIRMED"
                  checked={initialStatus === "CONFIRMED"}
                  onChange={() => setInitialStatus("CONFIRMED")}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>ยืนยันคิวทันที (Confirmed)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="initialStatus"
                  value="CHECKED_IN"
                  checked={initialStatus === "CHECKED_IN"}
                  onChange={() => setInitialStatus("CHECKED_IN")}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>คนไข้มาถึงแล้ว (Checked In)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="initialStatus"
                  value="IN_PROGRESS"
                  checked={initialStatus === "IN_PROGRESS"}
                  onChange={() => setInitialStatus("IN_PROGRESS")}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>เข้าห้องตรวจทันที (In Progress)</span>
              </label>
            </div>
          </div>

          {/* Step 3: แนบไฟล์รูปถ่ายอาการจาก LINE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              แนบไฟล์รูปภาพอาการ (เซฟจากแชท LINE ของคนไข้):
            </label>

            {!imagePreview ? (
              <label className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-200 hover:border-rose-300 rounded-2xl bg-slate-50 hover:bg-rose-50/40 cursor-pointer transition-all group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                <span className="text-xs text-slate-600 group-hover:text-rose-700 font-medium">
                  คลิกเพื่อเลือกไฟล์รูปถ่ายอาการ (PNG, JPG, HEIC)
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Symptom Preview"
                    className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0 shadow-xs"
                  />
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 truncate">{symptomImage?.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {symptomImage ? `${(symptomImage.size / 1024).toFixed(1)} KB` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                  title="ลบไฟล์รูป"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-0.5">
              ⚠️ สงวนสิทธิ์สำหรับเคสเลือดออกไม่หยุด/อุบัติเหตุ/ปวดรุนแรง หากประเมินหน้างานแล้วไม่ฉุกเฉิน จะถูกจัดเป็นคิวปกติ
            </p>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังแทรกคิว...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>ยืนยันแทรกคิวฉุกเฉิน (Emergency Buffer)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
