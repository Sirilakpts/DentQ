import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demo-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, time, isBlocked, blockedReason, maxCapacity } = body;

    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: "Date and time are required" },
        { status: 400 }
      );
    }

    const slotId = `${date}_${time}`;

    if (isDemoMode()) {
      return NextResponse.json({
        success: true,
        message: isBlocked ? "ระงับการจองช่วงเวลาดังกล่าวแล้ว (โหมดสาธิต)" : "เปิดให้บริการช่วงเวลาดังกล่าวแล้ว (โหมดสาธิต)",
        slotConfig: {
          id: slotId,
          date,
          time,
          isBlocked: typeof isBlocked === "boolean" ? isBlocked : true,
          blockedReason: blockedReason || null,
          maxCapacity: maxCapacity || 2,
        },
        isDemo: true,
      });
    }

    const updated = await prisma.slotConfig.upsert({
      where: { id: slotId },
      update: {
        isBlocked: typeof isBlocked === "boolean" ? isBlocked : true,
        blockedReason: blockedReason || null,
        ...(maxCapacity ? { maxCapacity } : {}),
      },
      create: {
        id: slotId,
        date,
        time,
        isBlocked: typeof isBlocked === "boolean" ? isBlocked : true,
        blockedReason: blockedReason || null,
        maxCapacity: maxCapacity || 2,
      },
    });

    return NextResponse.json({
      success: true,
      message: updated.isBlocked ? "ระงับการจองช่วงเวลาดังกล่าวแล้ว" : "เปิดให้บริการช่วงเวลาดังกล่าวแล้ว",
      slotConfig: updated,
    });
  } catch (err) {
    console.error("Error toggling slot:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update slot" },
      { status: 500 }
    );
  }
}
