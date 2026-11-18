import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminCredentials,
  createAdminSessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกอีเมลและรหัสผ่านผู้ดูแลระบบ" },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const sessionToken = createAdminSessionToken(email);

    const response = NextResponse.json({
      success: true,
      message: "เข้าสู่ระบบผู้ดูแลระบบสำเร็จ",
    });

    // Set secure HttpOnly cookie for admin session
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Admin Login] Error during login:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "ออกจากระบบสำเร็จ",
  });

  response.cookies.delete("admin_session");
  return response;
}
