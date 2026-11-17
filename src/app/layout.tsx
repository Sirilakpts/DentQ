import type { Metadata } from "next";
import { PhoneCall, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DentQ - ระบบจองคิวทันตกรรมออนไลน์",
  description: "ระบบจองคิวคลินิกทันตกรรมออนไลน์เพื่อประชาชน สะดวก รวดเร็ว ไม่ต้องรอนาน",
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
      <body className="min-h-screen flex flex-col bg-slate-50 bg-[#F5F7FA] text-slate-800 antialiased font-sans">
        {/* Demo Mode Notice Banner */}
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
          <div className="bg-[#D5A423] text-slate-950 px-4 py-1.5 text-center text-xs font-bold shadow-xs flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>โหมดสาธิต — ข้อมูลจำลอง ไม่ใช่การจองจริง (Demo Mockup Only)</span>
          </div>
        )}

        {/* Top Announcement Bar */}
        <div className="bg-[#063466] text-white text-xs py-1.5 px-4 border-b border-[#063466]/20">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#D5A423] text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-bold">
                ระบบบริการนัดหมาย
              </span>
              <span className="text-slate-100">ระบบจองคิวทันตกรรมออนไลน์เพื่อประชาชน (ระบบต้นแบบสาธิต)</span>
            </div>
            <div className="flex items-center gap-4 text-slate-200">
              <span className="hidden sm:inline flex items-center gap-1 text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D5A423]" /> ยืนยันตัวตนปลอดภัย
              </span>
            </div>
          </div>
        </div>

        {/* Main Navbar Component (Separates citizen vs admin navigation) */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 bg-[#F5F7FA]">{children}</main>
      </body>
    </html>
  );
}
