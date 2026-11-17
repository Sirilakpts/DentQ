import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ดักจับเส้นทางที่ขึ้นต้นด้วย /admin
  if (pathname.startsWith("/admin")) {
    const adminSession = request.cookies.get("admin_session");

    // หากไม่มี Cookie ชื่อ admin_session ให้ redirect ผู้ใช้กลับไปที่หน้า /login
    if (!adminSession || !adminSession.value) {
      const loginUrl = new URL("/login", request.url);
      // แนบ path ต้นทางเพื่อให้สามารถ redirect กลับมาหลังจาก login สำเร็จได้
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// ตั้งค่า matcher ให้ทำงานเฉพาะ route ที่ขึ้นต้นด้วย /admin
export const config = {
  matcher: ["/admin/:path*"],
};
