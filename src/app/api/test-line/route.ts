import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { pushMessage } from "@/lib/lineApi";
import { getBookingTicketFlex } from "@/lib/flexMessages";
import { isDemoMode } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

function sanitizeUserId(val: string): string {
  return val.replace(/^[\\"'`\s]+|[\\"'`\s]+$/g, "").trim();
}

function resolveUserId(queryUserId: string | null): {
  userId: string | null;
  source: string;
} {
  if (queryUserId && queryUserId.trim()) {
    return { userId: sanitizeUserId(queryUserId), source: "URL Parameter (?userId=...)" };
  }

  const envVal = process.env.LINE_USER_ID || process.env.MY_LINE_USER_ID;
  if (envVal && envVal.trim()) {
    return { userId: sanitizeUserId(envVal), source: "process.env.LINE_USER_ID" };
  }

  const rootDir = process.cwd();
  for (const filename of [".env", ".env.local", ".env.example"]) {
    const filePath = path.join(rootDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) continue;
          const match = trimmed.match(
            /^(?:export\s+)?(?:LINE_USER_ID|MY_LINE_USER_ID|USER_ID)\s*=\s*(.*)$/i
          );
          if (match && match[1]) {
            const cleanId = sanitizeUserId(match[1].split("#")[0]);
            if (cleanId && cleanId.length > 5) {
              return { userId: cleanId, source: `ไฟล์ ${filename} (Real-time Read)` };
            }
          }
        }
      } catch {}
    }
  }

  return { userId: null, source: "none" };
}

export async function GET(req: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json(
      { success: false, error: "Test LINE API is disabled in Demo Mode" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get("userId");
  const type = searchParams.get("type"); // "flex" | "text" | "simulate-postback"

  const { userId: targetUserId, source } = resolveUserId(queryUserId);

  if (!targetUserId) {
    return NextResponse.json(
      {
        success: false,
        error: "ไม่พบ User ID สำหรับส่งข้อความ",
        instruction: "โปรดระบุ LINE_USER_ID ในไฟล์ .env หรือส่ง ?userId=U...",
      },
      { status: 400 }
    );
  }

  // CASE 1: จำลองการยิง Postback ในระบบเพื่อทดสอบการอัปเดต DB แบบ 2-Way
  if (type === "simulate-postback") {
    try {
      // ค้นหาคิวล่าสุดในระบบ หรือสร้างคิวจำลอง
      let targetBooking = await prisma.booking.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      if (!targetBooking) {
        targetBooking = await prisma.booking.findFirst({
          orderBy: { createdAt: "desc" },
        });
      }

      if (!targetBooking) {
        return NextResponse.json({
          success: false,
          error: "ไม่พบคิวในระบบสำหรับจำลอง Postback กรุณาลองจองคิวผ่าน /book ก่อนครับ",
        });
      }

      // จำลองเหตุการณ์ Postback ยืนยันคิว
      const updated = await prisma.booking.update({
        where: { id: targetBooking.id },
        data: {
          status: "CONFIRMED",
          reminderStatus: "ATTENDANCE_CONFIRMED",
        },
      });

      return NextResponse.json({
        success: true,
        action: "confirmBooking",
        message: `จำลองการกดปุ่ม Postback สำเร็จ! คิวหมายเลข ${updated.queueNumber} ถูกอัปเดตเป็น CONFIRMED เรียบร้อยแล้ว`,
        updatedBooking: updated,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // CASE 2: ยิงบัตรคิวดิจิทัล Flex Message จริงเข้า LINE มือถือ
  if (type === "flex") {
    // ดึงคิวล่าสุดของระบบมาแสดงในการ์ด
    const latestBooking = await prisma.booking.findFirst({
      orderBy: { createdAt: "desc" },
      include: { service: true },
    });

    const bookingTicketData = {
      id: latestBooking?.id || "demo-booking-id",
      queueNumber: latestBooking?.queueNumber || "DEN-001",
      patientName: latestBooking?.patientName || "คุณผู้รับบริการ (ทดสอบระบบ)",
      date: latestBooking?.date || new Date().toISOString().slice(0, 10),
      time: latestBooking?.time || "10:00",
      serviceNameTh: latestBooking?.service?.nameTh || "ขูดหินปูน / อุดฟัน (Scaling & Filling)",
      isEmergency: latestBooking?.isEmergency || false,
    };

    const flexCard = getBookingTicketFlex(bookingTicketData);
    const result = await pushMessage(targetUserId, [flexCard]);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          hint: "โปรดตรวจสอบว่า User ID ถูกต้องและได้กดเพิ่มเพื่อนกับบอทแล้ว",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "🚀 ส่งบัตรคิว Flex Message (ตั๋วนัดหมายดิจิทัล) ไปยัง LINE มือถือของคุณเรียบร้อยแล้ว!",
      recipient: targetUserId,
      source,
      bookingTicket: bookingTicketData,
      nextStep: "ลองเปิดแอป LINE ในมือถือเพื่อดูการ์ดตั๋ว และกดปุ่ม 'ยืนยันการเข้ารับบริการ' ได้เลยครับ",
    });
  }

  // CASE 3: ข้อความ Text ทั่วไป (Default)
  const testMessage =
    "🎉 ระบบ Q-Dentist เชื่อมต่อ LINE Messaging API สำเร็จแล้ว!\nระบบพร้อมส่งการแจ้งเตือนคิวและเตือนล่วงหน้า 1-2 วันครับ\n\n(หากต้องการทดสอบรับตั๋ว Flex Card ให้ใส่ ?type=flex)";

  const result = await pushMessage(targetUserId, [testMessage]);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "ส่งข้อความทดสอบไปยัง LINE เรียบร้อยแล้ว!",
    recipient: targetUserId,
    source,
    sentMessage: testMessage,
  });
}
