"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  ArrowLeft, 
  Smartphone, 
  Code, 
  CheckCircle2, 
  Clock, 
  Send, 
  RefreshCw, 
  Copy, 
  AlertCircle,
  ShieldCheck,
  Calendar,
  ExternalLink
} from "lucide-react";
import { 
  buildApprovalFlexMessage, 
  buildRejectionFlexMessage, 
  buildAdvanceReminderFlexMessage,
  buildEmergencySosCard
} from "@/lib/line";

export default function LinePreviewPage() {
  const [activeTab, setActiveTab] = useState<"APPROVAL" | "REJECTION" | "REMINDER" | "EMERGENCY">("APPROVAL");
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [selectedLogPayload, setSelectedLogPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sample data for rendering previews
  const sampleData = {
    queueNumber: "DEN-001",
    patientName: "นาย สมชาย ใจดี",
    phoneNumber: "081-456-7890",
    date: "2026-11-12",
    time: "10:00",
    serviceNameTh: "ขูดหินปูน / อุดฟัน (Scaling & Filling)",
    rejectReason: "ช่วงเวลาดังกล่าวทันตแพทย์ติดเคสผ่าตัดฉุกเฉิน กรุณาเลือกช่วงเวลาใหม่",
  };

  const approvalFlex = buildApprovalFlexMessage(sampleData);
  const rejectionFlex = buildRejectionFlexMessage({
    queueNumber: sampleData.queueNumber,
    patientName: sampleData.patientName,
    serviceNameTh: sampleData.serviceNameTh,
    date: sampleData.date,
    time: sampleData.time,
    rejectReason: sampleData.rejectReason,
  });
  const reminderFlex = buildAdvanceReminderFlexMessage({
    queueNumber: sampleData.queueNumber,
    patientName: sampleData.patientName,
    serviceNameTh: sampleData.serviceNameTh,
    date: sampleData.date,
    time: sampleData.time,
  });
  const emergencyFlex = buildEmergencySosCard();

  const currentFlex = 
    activeTab === "APPROVAL" ? approvalFlex :
    activeTab === "REJECTION" ? rejectionFlex :
    activeTab === "REMINDER" ? reminderFlex : emergencyFlex;

  async function fetchLogs() {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
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
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              จำลอง LINE Messaging API & บันทึกการส่ง (Flex Simulator)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            พรีวิวและตรวจสอบรูปแบบ LINE Flex Messages ที่ส่งถึงผู้ป่วยจริงในสถานการณ์ต่างๆ
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin text-teal-600" : ""}`} />
          <span>รีเฟรชประวัติการส่ง</span>
        </button>
      </div>

      {/* Simulator & Details Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Smartphone Mockup Frame */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px] bg-slate-900 rounded-[44px] p-4 shadow-2xl border-4 border-slate-800 relative">
            {/* Phone Notch & Speaker */}
            <div className="w-32 h-5 bg-slate-950 rounded-b-2xl mx-auto mb-2 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Simulated LINE Screen Header */}
            <div className="bg-[#1f2937] text-white px-3 py-2 rounded-t-2xl flex items-center justify-between text-xs border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                  🦷
                </div>
                <div>
                  <div className="font-bold text-[11px]">Q-Dentist Clinic Official</div>
                  <div className="text-[9px] text-emerald-400">LINE Official Account</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">08:00</span>
            </div>

            {/* LINE Chat Canvas */}
            <div className="bg-[#8c9bb0] min-h-[460px] p-3 rounded-b-2xl flex flex-col justify-end space-y-2 overflow-hidden">
              {/* Flex Message Card Bubble Preview */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden text-slate-800 text-xs animate-fade-in border border-slate-100">
                {/* Header */}
                <div
                  className={`p-3 text-white ${
                    activeTab === "APPROVAL"
                      ? "bg-teal-600"
                      : activeTab === "REJECTION"
                      ? "bg-rose-600"
                      : activeTab === "REMINDER"
                      ? "bg-sky-600"
                      : "bg-red-600"
                  }`}
                >
                  <div className="text-[10px] tracking-wider uppercase font-bold opacity-90">
                    {activeTab === "EMERGENCY" ? "🚨 EMERGENCY" : "🦷 Q-DENTIST CLINIC"}
                  </div>
                  <div className="font-extrabold text-sm mt-0.5">
                    {activeTab === "APPROVAL" && "ยืนยันการนัดหมายเรียบร้อยแล้ว"}
                    {activeTab === "REJECTION" && "ไม่สามารถยืนยันนัดหมายได้"}
                    {activeTab === "REMINDER" && "⏰ แจ้งเตือนนัดหมายล่วงหน้า (2 วัน)"}
                    {activeTab === "EMERGENCY" && "ยืนยันแทรกคิวฉุกเฉินเรียบร้อยแล้ว"}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-3.5 space-y-2.5 bg-white">
                  {/* Queue Pill */}
                  <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                    <span className="text-[10px] text-slate-400">หมายเลขคิวของคุณ</span>
                    <div className="text-2xl font-black text-teal-700 tracking-tight">
                      {activeTab === "EMERGENCY" ? "EMG-001" : "DEN-001"}
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">บริการ:</span>
                      <span className="font-bold text-slate-800 text-right">
                        {sampleData.serviceNameTh}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">วันนัด:</span>
                      <span className="font-semibold text-slate-800">
                        {sampleData.date} ({sampleData.time} น.)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ผู้รับบริการ:</span>
                      <span className="text-slate-800">{sampleData.patientName}</span>
                    </div>
                  </div>

                  {/* Rejection notice */}
                  {activeTab === "REJECTION" && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px]">
                      <strong>สาเหตุ:</strong> {sampleData.rejectReason}
                    </div>
                  )}

                  {/* Advance Reminder notice */}
                  {activeTab === "REMINDER" && (
                    <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[10px]">
                      💡 กรุณายืนยันความพร้อม เพื่อให้ทางคลินิกเตรียมยูนิตและอุปกรณ์
                    </div>
                  )}

                  {/* Emergency Visual Triage notice */}
                  {activeTab === "EMERGENCY" && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold leading-relaxed">
                      📸 เพื่อความรวดเร็ว โปรดส่ง 'รูปถ่ายอาการ' เข้ามาในแชทนี้เพื่อให้แพทย์ประเมินเบื้องต้น
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 space-y-1.5">
                  {activeTab === "APPROVAL" && (
                    <>
                      <button className="w-full py-1.5 bg-teal-600 text-white rounded-lg font-bold text-[11px]">
                        📱 ดูบัตรคิวดิจิทัล
                      </button>
                      <button className="w-full py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px]">
                        📞 โทรติดต่อคลินิก
                      </button>
                    </>
                  )}

                  {activeTab === "REJECTION" && (
                    <>
                      <button className="w-full py-1.5 bg-teal-600 text-white rounded-lg font-bold text-[11px]">
                        📅 เลือกวันและเวลานัดหมายใหม่
                      </button>
                    </>
                  )}

                  {activeTab === "REMINDER" && (
                    <div className="space-y-1">
                      <button className="w-full py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px]">
                        ✅ [ ยืนยันการมา ]
                      </button>
                      <button className="w-full py-1.5 bg-slate-200 text-slate-800 rounded-lg font-semibold text-[11px]">
                        🔄 [ ขอเลื่อนนัด ]
                      </button>
                    </div>
                  )}

                  {activeTab === "EMERGENCY" && (
                    <div className="space-y-1.5">
                      <button className="w-full py-1.5 bg-rose-600 text-white rounded-lg font-bold text-[11px]">
                        📞 แชร์เบอร์โทรศัพท์ติดต่อ
                      </button>
                      <button className="w-full py-1.5 bg-white border border-rose-300 text-rose-700 rounded-lg font-semibold text-[10px]">
                        📍 แชร์พิกัดตำแหน่งปัจจุบัน
                      </button>
                      <div className="text-[9px] text-slate-400 text-center leading-tight pt-1">
                        ⚠️ สงวนสิทธิ์สำหรับเคสเลือดออกไม่หยุด/อุบัติเหตุ/ปวดรุนแรง หากประเมินหน้างานแล้วไม่ฉุกเฉิน จะถูกจัดเป็นคิวปกติ
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Template Selector & JSON Inspector */}
        <div className="lg:col-span-7 space-y-6">
          {/* Template Tabs */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800">
              เลือกเทมเพลต LINE Flex Message ที่ต้องการทดสอบ:
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("APPROVAL")}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                  activeTab === "APPROVAL"
                    ? "bg-teal-50 border-teal-500 text-teal-800 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✅ อนุมัตินัดหมาย
                <div className="text-[10px] font-normal text-slate-400 mt-0.5">Confirmation</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("REJECTION")}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                  activeTab === "REJECTION"
                    ? "bg-rose-50 border-rose-500 text-rose-800 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                🚫 ปฏิเสธนัดหมาย
                <div className="text-[10px] font-normal text-slate-400 mt-0.5">Rejection</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("REMINDER")}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                  activeTab === "REMINDER"
                    ? "bg-sky-50 border-sky-500 text-sky-800 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ⏰ เตือนล่วงหน้า 1-2 วัน
                <div className="text-[10px] font-normal text-slate-400 mt-0.5">Cron Reminder</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("EMERGENCY")}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                  activeTab === "EMERGENCY"
                    ? "bg-red-50 border-red-500 text-red-800 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                🚨 แจ้งเตือนฉุกเฉิน
                <div className="text-[10px] font-normal text-slate-400 mt-0.5">Emergency Alert</div>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">📌 จุดเด่นของเทมเพลต:</p>
              {activeTab === "APPROVAL" && (
                <p>• แสดงรหัสคิวเด่นชัด ข้อมูลวันเวลาแพทย์ พร้อมปุ่มเข้าสู่ Digital Ticket ทันที</p>
              )}
              {activeTab === "REJECTION" && (
                <p>• แจ้งเหตุผลที่สุภาพ พร้อมปุ่มลัดให้คนไข้กดเลือกวันเวลาใหม่โดยไม่ต้องเริ่มต้นกรอกข้อมูลใหม่ทั้งหมด</p>
              )}
              {activeTab === "REMINDER" && (
                <p>• มีปุ่มโต้ตอบแบบ 2 ทิศทาง: `[ ยืนยันการมา ]` และ `[ ขอเลื่อนนัด ]` อัปเดตเข้าระบบทันที</p>
              )}
              {activeTab === "EMERGENCY" && (
                <p>• Emergency SOS Card พร้อมปุ่มแชร์เบอร์โทร/พิกัด, ระบบ Visual Triage ขอรูปถ่ายอาการ และ Disclaimer กรองเคสด่วนปลอม</p>
              )}
            </div>

            {/* Raw JSON Flex Code Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-teal-600" />
                  LINE Flex Message Payload (JSON):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(currentFlex, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-teal-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? "คัดลอกแล้ว!" : "คัดลอก JSON"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(currentFlex, null, 2)}
              </pre>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                ประวัติการส่งการแจ้งเตือน (Notification Logs)
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {logs.length} รายการ
              </span>
            </div>

            {loadingLogs ? (
              <div className="text-center py-8 text-xs text-slate-400">กำลังโหลดบันทึก...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                ยังไม่มีประวัติการส่งการแจ้งเตือน (จะเกิดขึ้นเมื่อกดอนุมัติ, ปฏิเสธ หรือรัน Cron เตือนล่วงหน้า)
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">ประเภท</th>
                      <th className="py-2 px-3">คิว / ผู้รับ</th>
                      <th className="py-2 px-3">สถานะ</th>
                      <th className="py-2 px-3">เวลาที่ส่ง</th>
                      <th className="py-2 px-3 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {log.type}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-teal-700">
                            {log.booking?.queueNumber || "-"}
                          </span>{" "}
                          <span className="text-slate-500 text-[11px]">({log.recipient})</span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-cyan-100 text-cyan-800"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[10px]">
                          {new Date(log.createdAt).toLocaleTimeString("th-TH")}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLogPayload(log.flexMessagePayload)}
                            className="text-teal-600 hover:underline text-[11px]"
                          >
                            ดู JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                LINE Flex Message Payload
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLogPayload(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl overflow-y-auto flex-1 leading-relaxed">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedLogPayload), null, 2);
                } catch {
                  return selectedLogPayload;
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
