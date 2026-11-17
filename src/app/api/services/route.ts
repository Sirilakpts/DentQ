import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode, DEMO_SERVICES } from "@/lib/demo-data";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ success: true, services: DEMO_SERVICES, isDemo: true });
  }

  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { durationMinutes: "asc" },
    });
    return NextResponse.json({ success: true, services });
  } catch (err) {
    console.error("Error fetching services:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
