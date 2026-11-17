"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Calendar, 
  Search, 
  ShieldAlert, 
  LayoutDashboard, 
  MessageSquare,
  ArrowLeft
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <span className="text-xl">🦷</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent">
                Q-Dentist
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                Clinic
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5">ระบบจองคิวทันตกรรมออนไลน์</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {isAdmin ? (
            // ==========================================
            // กรณี pathname.startsWith('/admin') (หน้าของแอดมิน)
            // แสดง: แดชบอร์ดเจ้าหน้าที่, แทรกคิวฉุกเฉิน, LINE Flex
            // ==========================================
            <>
              <Link
                href="/"
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors mr-1"
                title="ไปยังหน้าเว็บไซต์คนไข้"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>หน้าหลักคนไข้</span>
              </Link>

              <Link
                href="/admin/emergency"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                <span className="font-semibold">แทรกคิวฉุกเฉิน</span>
              </Link>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === "/admin"
                    ? "text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/30"
                    : "text-slate-700 hover:text-teal-700 hover:bg-teal-50"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>แดชบอร์ดเจ้าหน้าที่</span>
              </Link>

              <Link
                href="/admin/line-preview"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="จำลอง LINE Flex Message"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="hidden xl:inline">LINE Flex</span>
              </Link>
            </>
          ) : (
            // ==========================================
            // กรณีอื่นๆ (หน้าเว็บสาธารณะของคนไข้)
            // แสดงเฉพาะ "จองคิวตรวจฟัน" และ "ตรวจสอบคิว" เท่านั้น
            // ==========================================
            <>
              <Link
                href="/book"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/book"
                    ? "bg-teal-50 text-teal-700 font-bold"
                    : "text-slate-700 hover:text-teal-700 hover:bg-teal-50"
                }`}
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>จองคิวตรวจฟัน</span>
              </Link>

              <Link
                href="/tracking"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/tracking"
                    ? "bg-teal-50 text-teal-700 font-bold"
                    : "text-slate-700 hover:text-teal-700 hover:bg-teal-50"
                }`}
              >
                <Search className="w-4 h-4 text-teal-600" />
                <span>ตรวจสอบคิว</span>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          {isAdmin ? (
            <>
              <Link
                href="/admin/emergency"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200"
              >
                แทรกคิว
              </Link>
              <Link
                href="/admin"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                แดชบอร์ด
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/tracking"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                เช็กคิว
              </Link>
              <Link
                href="/book"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                จองคิว
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Sub Navigation bar */}
      <div className="md:hidden flex border-t border-slate-100 bg-slate-50/90 text-xs overflow-x-auto divide-x divide-slate-200">
        {isAdmin ? (
          <>
            <Link
              href="/admin"
              className={`flex-1 py-2 px-2 text-center font-medium whitespace-nowrap ${
                pathname === "/admin" ? "text-teal-800 font-bold bg-white" : "text-slate-700"
              }`}
            >
              🩺 แดชบอร์ด
            </Link>
            <Link
              href="/admin/emergency"
              className={`flex-1 py-2 px-2 text-center font-medium whitespace-nowrap ${
                pathname === "/admin/emergency" ? "text-rose-800 font-bold bg-white" : "text-rose-700"
              }`}
            >
              🚨 แทรกคิวฉุกเฉิน
            </Link>
            <Link
              href="/admin/line-preview"
              className={`flex-1 py-2 px-2 text-center font-medium whitespace-nowrap ${
                pathname === "/admin/line-preview" ? "text-emerald-800 font-bold bg-white" : "text-emerald-700"
              }`}
            >
              💬 LINE Flex
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/book"
              className={`flex-1 py-2 px-2 text-center font-medium whitespace-nowrap ${
                pathname === "/book" ? "text-teal-800 font-bold bg-white" : "text-teal-700"
              }`}
            >
              📅 จองคิวตรวจฟัน
            </Link>
            <Link
              href="/tracking"
              className={`flex-1 py-2 px-2 text-center font-medium whitespace-nowrap ${
                pathname === "/tracking" ? "text-teal-800 font-bold bg-white" : "text-slate-700"
              }`}
            >
              🔍 ตรวจสอบคิว
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
