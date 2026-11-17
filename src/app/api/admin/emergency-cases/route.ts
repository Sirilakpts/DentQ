import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch pending emergency cases from LINE SOS
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ success: true, cases: [], isDemo: true });
  }

  try {
    const cases = await prisma.emergencyCase.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, cases });
  } catch (err: any) {
    console.error("Error fetching emergency cases:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch emergency cases" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Mark emergency case as CONTACTED
 */
export async function PATCH(req: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json(
      { success: false, error: "Emergency management is disabled in Demo Mode" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Case ID is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.emergencyCase.update({
      where: { id },
      data: {
        status: status || "CONTACTED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "อัปเดตสถานะเป็นติดต่อแล้วเรียบร้อย",
      case: updated,
    });
  } catch (err: any) {
    console.error("Error updating emergency case status:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update emergency case" },
      { status: 500 }
    );
  }
}
