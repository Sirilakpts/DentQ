import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Calendar, 
  Search, 
  ShieldAlert, 
  ArrowRight, 
  UserCheck, 
  FileText, 
  CalendarDays, 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  Phone, 
  MapPin,
  Lock,
  Timer
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* ========================================================================= */}
        {/* Section 1: Hero Section (Minimalist) */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/40 via-white to-slate-50 py-20 sm:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 1. Badge ด้านบนสุด */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200/60 text-teal-800 text-xs sm:text-sm font-medium shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>✨ ระบบจองคิวอัจฉริยะ • ปลอดภัยตามมาตรฐาน PDPA</span>
            </div>

            {/* 2. Headline (อยู่บรรทัดเดียวกันทั้งหมด) */}
            <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-bold text-slate-900 tracking-tight leading-tight md:whitespace-nowrap">
              จองคิวทำฟันออนไลน์ สะดวก รวดเร็ว ไม่ต้องรอนาน
            </h1>

            {/* 3. Subtext */}
            <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-500 leading-relaxed font-normal">
              เลือกบริการและกำหนดเวลาที่สะดวกได้ด้วยตนเอง พร้อมรับตั๋วคิวดิจิทัลทันที ระบบจะส่งข้อความแจ้งเตือนล่วงหน้าผ่าน LINE เพื่อให้คุณไม่พลาดทุกนัดหมายสำคัญ
            </p>

            {/* 4. Action Buttons (อยู่ในระนาบเดียวกันแบบสมดุล) */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4 sm:pt-6">
              {/* ปุ่มหลัก: จองคิวทำฟัน */}
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-sm shadow-teal-600/20 transition-all hover:shadow hover:-translate-y-0.5"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>จองคิวทำฟัน</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* ปุ่มรอง: ตรวจสอบสถานะคิว */}
              <Link
                href="/tracking"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all hover:border-slate-300"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                <span>ตรวจสอบสถานะคิว</span>
              </Link>

              {/* ปุ่ม Ghost/Text link: ติดต่อเคสฉุกเฉิน */}
              <Link
                href="/admin/emergency"
                className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-xl text-sm sm:text-base font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition-colors"
              >
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                <span>ติดต่อเคสฉุกเฉิน</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Section 2: ขั้นตอนการเข้ารับบริการ (How it Works - Seamless Flow) */}
        {/* ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ขั้นตอนการจองคิวที่ง่ายและรวดเร็ว
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              จัดการนัดหมายกับทันตแพทย์ได้ใน 4 ขั้นตอนที่สะดวก รวดเร็ว และเป็นระบบ
            </p>
          </div>

          {/* Grid 4 คอลัมน์แบบไร้กรอบ (Frameless Timeline) */}
          <div className="relative">
            {/* เส้นประบางๆ เชื่อมต่อระหว่างขั้นตอนสำหรับจอ Desktop */}
            <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-[1px] border-t-2 border-dashed border-teal-200/70 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 relative z-10">
              
              {/* Step 1: เข้าสู่ระบบ */}
              <div className="text-center group">
                <div className="relative inline-block mb-5">
                  <div className="w-24 h-24 rounded-full bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600 shadow-xs group-hover:scale-105 transition-transform bg-white">
                    <UserCheck className="w-9 h-9 text-teal-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    1
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  เข้าสู่ระบบ
                </h3>
                <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mb-2">
                  ยืนยันตัวตน
                </span>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  ระบุเบอร์โทรศัพท์เพื่อยืนยันตัวตนตามมาตรฐานความปลอดภัย PDPA
                </p>
              </div>

              {/* Step 2: เลือกบริการ */}
              <div className="text-center group">
                <div className="relative inline-block mb-5">
                  <div className="w-24 h-24 rounded-full bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600 shadow-xs group-hover:scale-105 transition-transform bg-white">
                    <FileText className="w-9 h-9 text-teal-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    2
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  เลือกบริการ
                </h3>
                <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mb-2">
                  ระบุอาการ/หัตถการ
                </span>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  เลือกหัตถการที่ต้องการ เช่น ขูดหินปูน อุดฟัน ถอนฟัน หรือตรวจสุขภาพช่องปาก
                </p>
              </div>

              {/* Step 3: กำหนดเวลา */}
              <div className="text-center group">
                <div className="relative inline-block mb-5">
                  <div className="w-24 h-24 rounded-full bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600 shadow-xs group-hover:scale-105 transition-transform bg-white">
                    <CalendarDays className="w-9 h-9 text-teal-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    3
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  กำหนดเวลา
                </h3>
                <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mb-2">
                  เลือกวันและสล็อตคิว
                </span>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  เลือกวันและรอบเวลาที่สะดวก พร้อมตรวจสอบจำนวนคิวว่างแบบ Real-Time
                </p>
              </div>

              {/* Step 4: รับตั๋วคิว */}
              <div className="text-center group">
                <div className="relative inline-block mb-5">
                  <div className="w-24 h-24 rounded-full bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600 shadow-xs group-hover:scale-105 transition-transform bg-white">
                    <MessageSquare className="w-9 h-9 text-teal-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    4
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  รับตั๋วคิว
                </h3>
                <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mb-2">
                  แจ้งเตือนผ่าน LINE
                </span>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  รับตั๋วคิวดิจิทัลทันที พร้อมรับข้อความแจ้งเตือนสถานะการอนุมัติผ่าน LINE
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* Section 3: จุดเด่นและความปลอดภัย (Trust & Features) */}
        {/* ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/60">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              จุดเด่นและความปลอดภัย
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              มั่นใจในมาตรฐานการรักษาและความเป็นส่วนตัวระดับพรีเมียม
            </p>
          </div>

          {/* Grid 3 คอลัมน์ กล่องสีขาว เงาบางมากๆ shadow-sm ขอบมน rounded-2xl */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Feature 1: ประหยัดเวลา */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
                  <Timer className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  ประหยัดเวลา
                </h3>
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-3">
                  จองล่วงหน้า ไม่ต้องรอนาน
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  ระบบจัดสรรคิวอัจฉริยะช่วยลดระยะเวลารอคอยหน้าห้องตรวจ นัดหมายเวลาไหนได้เข้าตรวจตรงเวลา พร้อมระบบจำกัดโควตาคิวหัตถการต่อวันเพื่อการรักษาที่ได้มาตรฐานสูงสุด
                </p>
              </div>
            </div>

            {/* Feature 2: แจ้งเตือนผ่าน LINE */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  แจ้งเตือนผ่าน LINE
                </h3>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
                  รับตั๋วดิจิทัลและเตือนก่อนถึงคิว
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  เชื่อมต่อกับ LINE Official Account โดยตรง ส่งบัตรคิวดิจิทัลพร้อมบาร์โค้ด และส่งข้อความเตือนล่วงหน้า 1-2 วัน ให้คุณกดคอนเฟิร์มหรือขอเลื่อนนัดได้สะดวกรวดเร็ว
                </p>
              </div>
            </div>

            {/* Feature 3: PDPA Compliant */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  PDPA Compliant
                </h3>
                <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider mb-3">
                  ข้อมูลส่วนบุคคลของคุณถูกเก็บรักษาเป็นความลับอย่างสูงสุด
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  ปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคลอย่างเคร่งครัด เข้ารหัสข้อมูลเวชระเบียนและปกปิดข้อมูลสำคัญบนหน้าจอสาธารณะ มั่นใจได้ในความปลอดภัยของข้อมูลสุขภาพ
                </p>
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* Section 4: Minimal Footer */}
      {/* ========================================================================= */}
      <footer className="bg-slate-900 text-slate-300 pt-14 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10 border-b border-slate-800/80">
            
            {/* ฝั่งซ้าย: โลโก้ และข้อความ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  🦷
                </div>
                <div>
                  <span className="text-white font-extrabold text-xl tracking-tight">
                    Q-Dentist Clinic
                  </span>
                  <span className="block text-[11px] text-teal-400 font-medium">
                    Dental Care & Surgery
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 font-medium">
                คลินิกทันตกรรม Q-Dentist ให้บริการครบวงจร
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                ดูแลสุขภาพช่องปากและรอยยิ้มของคุณด้วยมาตรฐานทางการแพทย์สากล เทคโนโลยีทันตกรรมสมัยใหม่ สะอาด ปลอดภัย ใส่ใจทุกรายละเอียด
              </p>
            </div>

            {/* ฝั่งขวา: เวลาทำการ และข้อมูลติดต่อ */}
            <div className="space-y-3 md:text-right flex flex-col md:items-end justify-center">
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-1">
                เวลาทำการ และข้อมูลติดต่อ
              </h4>
              <p className="text-xs text-slate-300 flex items-center gap-2 md:justify-end">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span>จันทร์ - อาทิตย์: 09:00 - 17:00 น.</span>
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-2 md:justify-end">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>02-999-8888, 081-999-7777 (สายด่วน)</span>
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-2 md:justify-end">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span>สาขาพญาไท อาคารเดอะพลาซ่า ชั้น 2 (BTS พญาไท ทางออก 3)</span>
              </p>
            </div>

          </div>

          {/* ด้านล่างสุด: ลิขสิทธิ์ & ลิงก์เจ้าหน้าที่ */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© 2026 Q-Dentist Clinic. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <Link 
                href="/login" 
                className="hover:text-teal-400 transition-colors flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>เข้าสู่ระบบเจ้าหน้าที่ (Staff Login)</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
