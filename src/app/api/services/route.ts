import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode, DEMO_SERVICES } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  // ในโหมดสาธิต (Demo Mode): คืนค่ารายการบริการจำลองทันที
  if (isDemoMode()) {
    return NextResponse.json({ success: true, services: DEMO_SERVICES, isDemo: true });
  }

  try {
    // พยายามดึงข้อมูลจาก Prisma หากมีการเชื่อมต่อฐานข้อมูล
    const services = await prisma.service
      .findMany({
        where: { isActive: true },
        orderBy: { durationMinutes: "asc" },
      })
      .catch(() => []);

    if (services && services.length > 0) {
      return NextResponse.json({ success: true, services });
    }
  } catch (err) {
    console.warn("Could not query prisma.service, falling back to standard dental services:", err);
  }

  // ในโหมด Serverless / Google Sheets หรือเมื่อไม่มี SQLite:
  // คืนค่ารายการบริการทันตกรรมมาตรฐานเดิม 5 บริการ (คงตามข้อกำหนดเดิมของ DentQ ครบถ้วน)
  return NextResponse.json({ success: true, services: DEMO_SERVICES });
}
