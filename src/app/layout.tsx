import type { Metadata } from "next";
import Link from "next/link";
import { 
  Calendar,
  Search,
  ShieldAlert,
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  MapPin,
  Clock
} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q-Dentist - ระบบจองคิวทันตกรรมและจัดการคิวฉุกเฉิน",
  description: "ระบบจองคิวคลินิกทันตกรรม แจ้งเตือนผ่าน LINE อัตโนมัติ จัดการคิวฉุกเฉินและรองรับ PDPA สำหรับคลินิกทันตกรรมในไทย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
        {/* Demo Mode Notice Banner */}
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-xs font-bold shadow-sm flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>โหมดสาธิต — ข้อมูลจำลอง ไม่ใช่การจองจริง (Demo Mockup Only)</span>
          </div>
        )}

        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 text-white text-xs py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-teal-800/80 text-teal-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                เปิดบริการทุกวัน
              </span>
              <span>09:00 - 17:00 น. | Q-Dentist Clinic สาขาพญาไท อาคารเดอะพลาซ่า ชั้น 2</span>
            </div>
            <div className="flex items-center gap-4 text-teal-100">
              <span className="flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5" /> 02-999-8888, 081-999-7777
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline flex items-center gap-1 text-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> มาตรฐาน PDPA พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
              </span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
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
              <Link
                href="/book"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>จองคิวตรวจฟัน</span>
              </Link>
              <Link
                href="/tracking"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors"
              >
                <Search className="w-4 h-4 text-teal-600" />
                <span>ตรวจสอบคิว</span>
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/30 transition-all hover:shadow"
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
            </nav>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <Link
                href="/book"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                จองคิว
              </Link>
              <Link
                href="/admin"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                เจ้าหน้าที่
              </Link>
            </div>
          </div>

          {/* Mobile Sub Navigation bar */}
          <div className="md:hidden flex border-t border-slate-100 bg-slate-50/90 text-xs overflow-x-auto divide-x divide-slate-200">
            <Link href="/book" className="flex-1 py-2 px-2 text-center text-teal-800 font-medium whitespace-nowrap">
              📅 จองคิว
            </Link>
            <Link href="/tracking" className="flex-1 py-2 px-2 text-center text-slate-700 font-medium whitespace-nowrap">
              🔍 ตรวจสอบคิว
            </Link>
            <Link href="/admin/emergency" className="flex-1 py-2 px-2 text-center text-rose-700 font-medium whitespace-nowrap">
              🚨 คิวฉุกเฉิน
            </Link>
            <Link href="/admin" className="flex-1 py-2 px-2 text-center text-slate-700 font-medium whitespace-nowrap">
              🩺 แดชบอร์ด
            </Link>
            <Link href="/admin/line-preview" className="flex-1 py-2 px-2 text-center text-emerald-700 font-medium whitespace-nowrap">
              💬 LINE
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
