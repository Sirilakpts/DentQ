import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { buildApprovalFlexMessage, sendLineFlexNotification } from "@/lib/line";
import { isDemoMode } from "@/lib/demo-data";

const emergencySchema = z.object({
  patientName: z.string().min(2, "กรุณากรอกชื่อ-นามสกุลผู้ป่วย"),
  phoneNumber: z.string().min(9, "กรุณากรอกเบอร์โทรศัพท์"),
  nationalIdOrHn: z.string().optional().default("-"),
  serviceId: z.string().min(1, "กรุณาเลือกบริการที่เกี่ยวข้อง"),
  time: z.string().default("NOW"),
  date: z.string().optional(),
  emergencySeverity: z.enum(["CRITICAL", "URGENT", "MODERATE"]).default("CRITICAL"),
  emergencyNotes: z.string().min(1, "กรุณาระบุอาการฉุกเฉินและสาเหตุที่ต้องแทรกคิว"),
  initialStatus: z.enum(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"]).default("CONFIRMED"),
  lineUserId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json(
      { success: false, error: "การสร้างคิวฉุกเฉินปิดใช้งานในโหมดสาธิต (Demo Mode)" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = emergencySchema.parse(body);

    const now = new Date();
    const todayStr = validated.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const currentTimeStr = validated.time === "NOW" 
      ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      : validated.time;

    // Monotonic EMG-001, EMG-002 queue numbers
    const latestEmg = await prisma.booking.findFirst({
      where: { queueNumber: { startsWith: "EMG-" } },
      orderBy: { createdAt: "desc" },
    });
    let nextEmgNum = 1;
    if (latestEmg) {
      const match = latestEmg.queueNumber.match(/EMG-(\d+)/);
      if (match) {
        nextEmgNum = parseInt(match[1], 10) + 1;
      }
    }
    const queueNumber = `EMG-${String(nextEmgNum).padStart(3, "0")}`;
    const hour = parseInt(currentTimeStr.split(":")[0], 10);
    const period = hour < 12 ? "MORNING" : "AFTERNOON";

    const emergencyBooking = await prisma.booking.create({
      data: {
        queueNumber,
        date: todayStr,
        time: currentTimeStr,
        period,
        serviceId: validated.serviceId,
        patientName: validated.patientName.trim(),
        phoneNumber: validated.phoneNumber.trim(),
        nationalIdOrHn: validated.nationalIdOrHn.trim(),
        symptoms: `🚨 [กรณีฉุกเฉินระดับ ${validated.emergencySeverity}] ${validated.emergencyNotes}`,
        isEmergency: true,
        emergencySeverity: validated.emergencySeverity,
        emergencyNotes: validated.emergencyNotes,
        pdpaAccepted: true,
        pdpaAcceptedAt: new Date(),
        status: validated.initialStatus,
        lineUserId: validated.lineUserId || null,
        lineNotificationSent: true,
      },
      include: {
        service: true,
      },
    });

    // Send LINE confirmation / emergency alert
    const flexMessage = buildApprovalFlexMessage({
      queueNumber: emergencyBooking.queueNumber,
      patientName: emergencyBooking.patientName,
      phoneNumber: emergencyBooking.phoneNumber,
      date: emergencyBooking.date,
      time: emergencyBooking.time,
      serviceNameTh: emergencyBooking.service.nameTh,
      isEmergency: true,
    });

    await sendLineFlexNotification({
      bookingId: emergencyBooking.id,
      type: "EMERGENCY_ALERT",
      recipient: emergencyBooking.lineUserId || emergencyBooking.phoneNumber,
      flexMessage,
    });

    return NextResponse.json({
      success: true,
      message: `แทรกคิวฉุกเฉินสำเร็จ หมายเลขคิว: ${queueNumber}`,
      booking: emergencyBooking,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    console.error("Error creating emergency booking:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการแทรกคิวฉุกเฉิน" },
      { status: 500 }
    );
  }
}
