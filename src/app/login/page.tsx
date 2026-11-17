"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Lock, LogIn, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ฟอร์มเปล่ารอเชื่อมต่อ Backend / Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // จำลองการล็อกอิน (รอเขียน Logic เชื่อมต่อ Database จริง)
    setTimeout(() => {
      setIsLoading(false);
      // ตัวอย่าง: กำหนด cookie จำลองสำหรับการทดสอบ
      document.cookie = "admin_session=demo_token; path=/; max-age=86400; SameSite=Lax";
      window.location.href = "/admin";
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100 flex flex-col justify-center items-center px-4 py-12">
      {/* Container กล่อง Login สไตล์คลีน มินิมอล */}
      <div className="w-full max-w-md">
        
        {/* ลิงก์ย้อนกลับหน้าคนไข้ */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้าหลักคนไข้</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10">
          
          {/* ส่วนหัว Header & โลโก้ Q-Dentist */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25 mb-4">
              <span className="text-3xl">🦷</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent">
                Q-Dentist
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                Admin
              </span>
            </div>
            
            <p className="text-sm text-slate-500">
              ระบบเข้าสู่ระบบสำหรับเจ้าหน้าที่และทันตแพทย์
            </p>
          </div>

          {/* ฟอร์มเข้าสู่ระบบ */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ช่อง Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                อีเมลผู้ใช้งาน (Staff Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@q-dentist.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* ช่อง Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-semibold text-slate-700"
                >
                  รหัสผ่าน (Password)
                </label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); alert("โปรดติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน"); }}
                  className="text-[11px] text-teal-600 hover:text-teal-700 font-medium hover:underline"
                >
                  ลืมรหัสผ่าน?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <label 
                htmlFor="remember-me" 
                className="ml-2 block text-xs text-slate-600 select-none"
              >
                จดจำการเข้าสู่ระบบบนอุปกรณ์นี้
              </label>
            </div>

            {/* ปุ่มเข้าสู่ระบบ */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-md shadow-teal-600/25 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Mode Direct Access Button */}
          {(process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development") && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  document.cookie = "admin_session=demo_admin_token; path=/; max-age=86400; SameSite=Lax";
                  window.location.href = "/admin";
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
              >
                <span>⚡ เข้าชมแดชบอร์ดสาธิต (Demo Dashboard)</span>
              </button>
              <p className="text-[10px] text-amber-700 mt-1.5 text-center">
                * สำหรับผู้ตรวจงาน Mockup — เข้าสู่แดชบอร์ดด้วยสิทธิ์สาธิตโดยใช้ข้อมูลจำลอง
              </p>
            </div>
          )}

          {/* ป้ายกำกับความปลอดภัย */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>เชื่อมต่อด้วยการเข้ารหัส SSL ปลอดภัยตามมาตรฐาน PDPA</span>
          </div>
        </div>

        {/* Footer ด้านล่างกล่อง */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <p>© 2026 Q-Dentist Clinic Thailand. Staff Portal Only.</p>
        </div>
      </div>
    </div>
  );
}
