import React from "react";
import Link from "next/link";
import { 
  Calendar, 
  Search, 
  ArrowRight, 
  UserCheck, 
  CalendarDays, 
  CheckCircle2,
  Clock, 
  Phone, 
  MapPin,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import LiffRedirect from "@/components/LiffRedirect";

export default function HomePage() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="min-h-screen bg-slate-50 bg-[#F5F7FA] flex flex-col justify-between font-sans text-slate-800">
      {/* ประมวลผล liff.state จาก Rich Menu เพื่อนำทางไปยัง /book หรือ /tracking */}
      <LiffRedirect />
      <div>
        {/* ========================================================================= */}
        {/* Section 1: Hero Section (Friendly Dental Healthcare + Government Minimal) */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/40 via-white to-[#F5F7FA] border-b border-slate-200/70 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* ฝั่งซ้าย: ข้อมูลหลักและปุ่ม Action */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* 1. Badge ด้านบนสุด */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eef3f9] border border-[#063466]/15 text-[#063466] text-xs sm:text-sm font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#D5A423] animate-pulse" />
                  <span>ระบบนัดหมายทันตกรรมออนไลน์เพื่อประชาชน</span>
                </div>

                {/* 2. หัวข้อหลัก: จองคิวทำฟันออนไลน์ */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#063466] tracking-tight leading-tight">
                  จองคิวทำฟันออนไลน์
                </h1>

                {/* 3. คำอธิบายสั้น ๆ ไม่เกิน 2 บรรทัด (ไม่กล่าวอ้างเกินจริง หรือ LINE ส่งจริงบนเดโม) */}
                <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                  เลือกวันและเวลาที่สะดวกได้ด้วยตนเอง ไม่ต้องรอคิวหน้าห้องตรวจ
                  พร้อมรับบัตรคิวดิจิทัลและตรวจสอบสถานะคิวได้สะดวกรวดเร็ว
                </p>

                {/* 4. Action Buttons (เฉพาะการดำเนินการของประชาชน) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                  {/* ปุ่ม Primary: จองคิวทำฟันเลย -> ไปที่ /book */}
                  <Link
                    href="/book"
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold text-white bg-teal-600 bg-[#063466] hover:bg-[#05264b] shadow-md shadow-[#063466]/20 transition-all hover:-translate-y-0.5 active:translate-y-0 min-h-[48px]"
                  >
                    <Calendar className="w-5 h-5 text-[#D5A423]" />
                    <span>จองคิวทำฟันเลย</span>
                    <ArrowRight className="w-4 h-4 text-[#D5A423]" />
                  </Link>

                  {/* ปุ่ม Secondary: ตรวจสอบสถานะคิว -> ไปที่ /tracking */}
                  <Link
                    href="/tracking"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-[#063466] bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all hover:border-slate-300 min-h-[48px]"
                  >
                    <Search className="w-4 h-4 text-slate-500" />
                    <span>ตรวจสอบคิว</span>
                  </Link>
                </div>

                {/* จุดเด่นสั้น ๆ ด้านล่างปุ่ม (กระชับ ไม่กล่าวอ้างเกินจริง) */}
                <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ยืนยันตัวตนปลอดภัย
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D5A423]" />
                    รองรับสิทธิบัตรทอง / ประกันสังคม / ข้าราชการ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-600" />
                    รอบบริการเช้าและบ่าย (ข้อมูลจำลอง)
                  </span>
                </div>
              </div>

              {/* ฝั่งขวา: ภาพประกอบทันตแพทย์กับเด็ก (Friendly Dental Healthcare Vector Artwork) */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-md bg-gradient-to-br from-[#EBF3FA] via-[#F0F7FF] to-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-md relative overflow-hidden">
                  
                  {/* แสงและฟองตกแต่งด้านหลัง */}
                  <div className="absolute -top-12 -right-12 w-36 h-36 bg-sky-200/50 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-100/60 rounded-full blur-xl pointer-events-none" />

                  {/* ป้ายด้านบนของภาพประกอบ */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-sky-100 text-sky-900 text-xs font-semibold shadow-2xs">
                      <span className="text-base">🦷</span> คลินิกทันตกรรมเป็นมิตร
                    </span>
                    <span className="text-xs font-bold text-[#b88c1c] bg-[#fcf8eb] px-2.5 py-0.5 rounded-full border border-[#D5A423]/30">
                      สำหรับทุกวัย
                    </span>
                  </div>

                  {/* ภาพเวกเตอร์ทันตแพทย์ตรวจฟันเด็กอย่างอ่อนโยนและเป็นมิตร */}
                  <div className="relative z-10 my-3 flex flex-col items-center">
                    <svg
                      viewBox="0 0 320 220"
                      className="w-full h-auto max-h-[220px] drop-shadow-sm"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="ภาพประกอบทันตแพทย์ตรวจสุขภาพฟันเด็กอย่างอ่อนโยนและเป็นมิตร"
                    >
                      {/* พื้นหลังวงกลมสีฟ้าอ่อน */}
                      <circle cx="160" cy="110" r="95" fill="#E0F2FE" />
                      <circle cx="160" cy="110" r="80" fill="#F0F9FF" />

                      {/* เก้าอี้ทันตกรรมจำลอง */}
                      <path
                        d="M80 180 C80 150, 110 145, 140 145 L200 145 C230 145, 250 160, 255 185"
                        stroke="#BAE6FD"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />

                      {/* ทันตแพทย์ (ซ้าย) */}
                      {/* ลำตัว/เสื้อกาวน์ */}
                      <path
                        d="M75 190 C75 140, 95 125, 120 120 L135 120 C155 125, 165 140, 165 190"
                        fill="#063466"
                      />
                      <path
                        d="M100 125 L120 150 L140 125"
                        fill="#FFFFFF"
                      />
                      {/* ป้ายตรวจ */}
                      <path
                        d="M110 135 L130 135"
                        stroke="#D5A423"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* ศีรษะและหมวกทันตแพทย์ */}
                      <circle cx="120" cy="90" r="24" fill="#FDE68A" />
                      {/* หน้ากากอนามัยสีฟ้า */}
                      <rect x="106" y="92" width="28" height="16" rx="4" fill="#38BDF8" />
                      {/* หมวกคลุมผมทางการแพทย์ */}
                      <path
                        d="M96 85 C96 68, 144 68, 144 85 Z"
                        fill="#0284C7"
                      />
                      {/* ดวงตายิ้ม */}
                      <path d="M112 84 Q116 80 120 84" stroke="#063466" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M125 84 Q129 80 133 84" stroke="#063466" strokeWidth="2.5" strokeLinecap="round" />

                      {/* กระจกส่องตรวจทันตกรรม (Dental Mirror ในมือแพทย์) */}
                      <line x1="145" y1="130" x2="175" y2="115" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="178" cy="113" r="7" stroke="#0284C7" strokeWidth="2.5" fill="#E0F2FE" />

                      {/* เด็ก/คนไข้ (ขวา) */}
                      {/* ลำตัวเด็ก */}
                      <path
                        d="M175 190 C175 155, 190 145, 215 145 L225 145 C245 145, 255 160, 255 190"
                        fill="#0284C7"
                      />
                      {/* ศีรษะเด็ก */}
                      <circle cx="210" cy="115" r="22" fill="#FED7AA" />
                      {/* ผมเด็ก */}
                      <path
                        d="M192 110 C192 95, 228 95, 228 110 C228 100, 200 95, 192 110 Z"
                        fill="#475569"
                      />
                      {/* รอยยิ้มฟันสะอาด */}
                      <path d="M202 122 Q210 130 218 122" stroke="#063466" strokeWidth="2" strokeLinecap="round" fill="white" />
                      {/* แก้มชมพู */}
                      <circle cx="199" cy="120" r="3" fill="#FDA4AF" />
                      <circle cx="221" cy="120" r="3" fill="#FDA4AF" />
                      {/* ดวงตายิ้ม */}
                      <circle cx="203" cy="113" r="2" fill="#063466" />
                      <circle cx="217" cy="113" r="2" fill="#063466" />

                      {/* สัญลักษณ์ฟันสะอาดพร้อมประกาย (Sparkling Tooth Icon) */}
                      <g transform="translate(145, 20)">
                        <path
                          d="M15 0 C6 0 0 6 0 16 C0 26 5 36 9 44 C11 48 13 48 15 42 C17 48 19 48 21 44 C25 36 30 26 30 16 C30 6 24 0 15 0 Z"
                          fill="#FFFFFF"
                          stroke="#0284C7"
                          strokeWidth="2.5"
                        />
                        {/* รอยยิ้มบนฟัน */}
                        <path d="M9 16 Q15 22 21 16" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" fill="none" />
                        {/* ประกายดาวสีทอง */}
                        <path d="M28 4 L30 0 L32 4 L36 6 L32 8 L30 12 L28 8 L24 6 Z" fill="#D5A423" />
                        <path d="M-2 18 L-1 15 L0 18 L3 19 L0 20 L-1 23 L-2 20 L-5 19 Z" fill="#D5A423" />
                      </g>
                    </svg>
                  </div>

                  {/* กล่องข้อความสั้นใต้ภาพประกอบ */}
                  <div className="bg-white/95 rounded-2xl p-3.5 border border-sky-100 shadow-2xs text-center space-y-1 relative z-10">
                    <p className="text-xs font-bold text-[#063466]">
                      ทันตกรรมที่เป็นมิตร ใส่ใจทุกช่วงวัย
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ดูแลโดยทันตแพทย์ผู้เชี่ยวชาญ ปลอดภัย อบอุ่น และไม่น่ากลัว
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Section 2: ขั้นตอนการจองคิว (4 Steps - Desktop Horizontal, Mobile 2 Cols) */}
        {/* ========================================================================= */}
        <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold text-[#b88c1c] uppercase tracking-wider bg-[#fcf8eb] px-3 py-1 rounded-full border border-[#D5A423]/30">
              จองง่ายใน 4 ขั้นตอน
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#063466] tracking-tight mt-2.5">
              ขั้นตอนการจองคิว
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              สะดวก รวดเร็ว และเป็นระบบ ไม่ต้องเดินทางมารอคิวแต่เช้า
            </p>
          </div>

          {/* Desktop 4 ขั้นแนวนอน | Mobile 2 คอลัมน์ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Step 1: เลือกบริการ */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-shadow text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#eef3f9] text-[#063466] flex items-center justify-center font-bold mb-3 border border-[#063466]/10">
                <Sparkles className="w-6 h-6 text-[#063466]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-[#063466] text-white text-[11px] font-bold flex items-center justify-center mb-2">
                1
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                เลือกบริการ
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ขูดหินปูน อุดฟัน ถอนฟัน ตรวจสุขภาพ หรือรักษารากฟัน
              </p>
            </div>

            {/* Step 2: เลือกวันเวลา */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-shadow text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#eef3f9] text-[#063466] flex items-center justify-center font-bold mb-3 border border-[#063466]/10">
                <CalendarDays className="w-6 h-6 text-[#063466]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-[#063466] text-white text-[11px] font-bold flex items-center justify-center mb-2">
                2
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                เลือกวันเวลา
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                เลือกรอบเช้าหรือบ่าย และสล็อตเวลาที่ว่างตามสะดวก
              </p>
            </div>

            {/* Step 3: กรอกข้อมูล */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-shadow text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#eef3f9] text-[#063466] flex items-center justify-center font-bold mb-3 border border-[#063466]/10">
                <UserCheck className="w-6 h-6 text-[#063466]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-[#063466] text-white text-[11px] font-bold flex items-center justify-center mb-2">
                3
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                กรอกข้อมูล
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                เข้าสู่ระบบด้วย LINE ระบุสิทธิการรักษาและเบอร์โทร
              </p>
            </div>

            {/* Step 4: ยืนยันการจอง */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-shadow text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#eef3f9] text-[#063466] flex items-center justify-center font-bold mb-3 border border-[#063466]/10">
                <CheckCircle2 className="w-6 h-6 text-[#D5A423]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-[#063466] text-white text-[11px] font-bold flex items-center justify-center mb-2">
                4
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                ยืนยันการจอง
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                รับตั๋วคิวดิจิทัล พร้อมรหัสคิวสำหรับแสดงในวันรับบริการ
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* Section 3: Information Cards (แสดงเพียง 4 การ์ด ระบุสถานะจำลองชัดเจน) */}
        {/* ========================================================================= */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#063466] tracking-tight">
              ข้อมูลบริการและคลินิก
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              ข้อมูลตัวอย่างสำหรับการทดสอบระบบจองคิวนัดหมาย
            </p>
          </div>

          {/* Grid 4 การ์ดเท่านั้น: บริการทันตกรรม, ตรวจสอบคิว, เวลาทำการ, ติดต่อคลินิก */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* การ์ดที่ 1: บริการทันตกรรม */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:border-[#063466]/30 hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#eef3f9] text-[#063466] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#063466]">
                  บริการทันตกรรม
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ให้บริการขูดหินปูน, อุดฟัน, ถอนฟัน/ผ่าฟันคุด, ตรวจสุขภาพช่องปาก และรักษารากฟัน ตามมาตรฐานวิชาชีพ
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#063466] hover:text-[#D5A423] transition-colors"
                >
                  <span>จองตรวจทันตกรรม</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* การ์ดที่ 2: ตรวจสอบคิว */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:border-[#063466]/30 hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#fcf8eb] text-[#b88c1c] flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#063466]">
                  ตรวจสอบคิว
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ตรวจสอบสถานะคิวดิจิทัล ดูเวลานัดหมาย และรายละเอียดการจองได้สะดวกด้วยบัญชี LINE
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100">
                <Link
                  href="/tracking"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#063466] hover:text-[#D5A423] transition-colors"
                >
                  <span>ตรวจสอบสถานะคิว</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* การ์ดที่ 3: เวลาทำการ (แก้ข้อความโควตา: ช่วงเช้าไม่เกิน 6 คิว, ช่วงบ่ายตามสล็อตปกติ) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:border-[#063466]/30 hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#063466]">
                    เวลาทำการ
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    รอบจำลอง
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  <p className="font-semibold text-slate-800">09:00 - 17:00 น.</p>
                  <p className="text-slate-600 text-[11px] leading-tight">
                    • <strong>รอบเช้า (09:00 - 12:00 น.):</strong> ทุกบริการรวมกันไม่เกิน 6 คิว
                  </p>
                  <p className="text-slate-600 text-[11px] leading-tight">
                    • <strong>รอบบ่าย (13:00 - 16:00 น.):</strong> ให้บริการตามสล็อตนัดหมายปกติ
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 text-[11px] text-slate-500">
                * ข้อมูลรอบเวลาตัวอย่างสำหรับสาธิตระบบ
              </div>
            </div>

            {/* การ์ดที่ 4: ติดต่อคลินิก (ระบุชัดเจนว่าเป็นข้อมูลจำลอง ไม่แอบอ้างข้อมูลทางการ) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs hover:border-[#063466]/30 hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#063466]">
                    ติดต่อคลินิก
                  </h3>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                    ข้อมูลจำลอง
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  <p className="font-semibold text-slate-800">สาขาพญาไท อาคารเดอะพลาซ่า</p>
                  <p className="text-[11px] text-slate-500">(ข้อมูลที่อยู่จำลองเพื่อการทดสอบ)</p>
                  <p className="font-semibold text-[#063466] pt-1">
                    02-999-8888, 081-999-7777
                  </p>
                  <p className="text-[10px] text-slate-400">
                    (หมายเลขจำลองเพื่อการสาธิต)
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 text-[11px] text-slate-500">
                ช่องทางทางการจะแจ้งเมื่อเปิดบริการจริง
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* Section 5: Minimal Footer (ข้อมูลจำลองกำกับชัดเจน, ปราศจาก Admin & PDPA Claim) */}
      {/* ========================================================================= */}
      <footer className="bg-[#063466] text-white pt-12 pb-8 border-t border-[#063466]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-white/10">
            
            {/* ฝั่งซ้าย: โลโก้ และข้อมูลระบบ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-lg">
                  🦷
                </div>
                <div>
                  <span className="text-white font-extrabold text-lg tracking-tight">
                    DentQ
                  </span>
                  <span className="block text-[11px] text-[#D5A423] font-medium">
                    ระบบจองคิวทันตกรรมออนไลน์เพื่อประชาชน
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed max-w-md">
                ยกระดับการให้บริการสุขภาพช่องปาก สะดวก รวดเร็ว เป็นระบบ และลดระยะเวลารอคอยหน้าห้องตรวจ
              </p>
              {isDemo && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#D5A423]/20 border border-[#D5A423]/40 text-[#D5A423] text-xs font-semibold">
                  <span>ℹ️</span>
                  <span>ระบบกำลังทำงานในโหมดสาธิต (Demo Mockup Mode)</span>
                </div>
              )}
            </div>

            {/* ฝั่งขวา: ข้อมูลติดต่อตัวอย่าง (กำกับชัดเจนว่าเป็นข้อมูลจำลอง) */}
            <div className="space-y-2.5 md:text-right flex flex-col md:items-end justify-center text-xs text-slate-200">
              <h4 className="text-white font-bold text-sm tracking-wide mb-1">
                เวลาทำการและข้อมูลติดต่อ (ข้อมูลจำลอง)
              </h4>
              <p className="flex items-center gap-2 md:justify-end">
                <Clock className="w-4 h-4 text-[#D5A423] shrink-0" />
                <span>รอบเวลาบริการตัวอย่าง: 09:00 - 17:00 น.</span>
              </p>
              <p className="flex items-center gap-2 md:justify-end">
                <Phone className="w-4 h-4 text-[#D5A423] shrink-0" />
                <span>02-999-8888, 081-999-7777 (หมายเลขจำลอง)</span>
              </p>
              <p className="flex items-center gap-2 md:justify-end">
                <MapPin className="w-4 h-4 text-[#D5A423] shrink-0" />
                <span>สาขาพญาไท อาคารเดอะพลาซ่า (ข้อมูลจำลอง)</span>
              </p>
              <p className="text-[11px] text-slate-300 md:text-right">
                * ข้อมูลสถานที่ เวลา และเบอร์ติดต่อเป็นข้อมูลจำลองเพื่อการสาธิตระบบ
              </p>
            </div>

          </div>

          {/* ลิขสิทธิ์ทางการ ปราศจากลิงก์เจ้าหน้าที่ และไม่กล่าวอ้าง PDPA */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
            <p>© 2026 DentQ. ระบบจองคิวตรวจทันตกรรมออนไลน์เพื่อประชาชน</p>
            <p className="text-[11px] text-slate-300">ระบบต้นแบบจำลองสำหรับการสาธิตบริการประชาชน (Demo Mockup)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
