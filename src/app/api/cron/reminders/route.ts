import { NextRequest, NextResponse } from "next/server";
import { processAdvanceReminders } from "@/lib/cron";
import { isDemoMode } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      message: "Advance reminders skipped in Demo Mode (Air-gapped)",
      result: { processed: 0, sent: 0, skipped: 0, errors: [] },
      isDemo: true,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const daysAhead = parseInt(searchParams.get("daysAhead") || "2", 10);

    const result = await processAdvanceReminders(daysAhead);
    return NextResponse.json({
      success: true,
      message: `ดำเนินการส่งการแจ้งเตือนล่วงหน้า ${daysAhead} วัน เรียบร้อยแล้ว`,
      result,
    });
  } catch (err) {
    console.error("Error running advance reminder cron:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process advance reminders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
