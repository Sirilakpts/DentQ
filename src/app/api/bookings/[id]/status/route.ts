import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildApprovalFlexMessage,
  buildRejectionFlexMessage,
  sendLineFlexNotification,
} from "@/lib/line";
import {
  getBookingByIdFromSheet,
  updateBookingStatusInSheet,
} from "@/lib/google-sheets";
import { isDemoMode, getDemoBookings } from "@/lib/demo-data";
import { verifyAdminSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await req.json();
    const { status, rejectReason } = body;

    // 1. ตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin Authorization Check)
    // หมายเหตุความปลอดภัย: การตรวจสอบ adminSession หรือ demo_token นี้จัดทำขึ้นสำหรับการทำงานในระดับ Demo Mode เท่านั้น
    // ห้ามถือว่าปลอดภัยสำหรับ Production (ใน Production ต้องใช้ระบบ Authentication ที่รัดกุม เช่น Cryptographic JWT หรือ Server-side Session)
    const adminSession = req.cookies.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบก่อนเปลี่ยนสถานะ",
        },
        { status: 401 }
      );
    }

    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    // กฎข้อ 4 & 5: เมื่อสถานะเป็น REJECTED ต้องระบุเหตุผลการไม่อนุมัติเสมอ และจำกัดความยาวไม่เกิน 500 ตัวอักษร
    if (status === "REJECTED") {
      if (!rejectReason || !String(rejectReason).trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "กรุณาระบุเหตุผลการไม่อนุมัติการจองคิว",
          },
          { status: 400 }
        );
      }

      if (String(rejectReason).trim().length > 500) {
        return NextResponse.json(
          {
            success: false,
            error: "เหตุผลการไม่อนุมัติมีความยาวเกินกำหนด (สูงสุด 500 ตัวอักษร)",
          },
          { status: 400 }
        );
      }
    }

    const cleanRejectReason = rejectReason ? String(rejectReason).trim() : "";

    // ในโหมดสาธิต (Demo Mode): จำลองการเปลี่ยนสถานะสำหรับข้อมูลตัวอย่างโดยไม่บันทึกถาวร
    if (isDemoMode()) {
      const demoList = getDemoBookings();
      const exists = demoList.some(
        (b) =>
          b.id.toUpperCase() === bookingId.toUpperCase() ||
          b.queueNumber.toUpperCase() === bookingId.toUpperCase()
      );

      if (!exists) {
        return NextResponse.json(
          { success: false, error: `ไม่พบคิวการนัดหมาย '${bookingId}' ในระบบสาธิต` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "อัปเดตสถานะสำเร็จ (โหมดสาธิต - การเปลี่ยนแปลงไม่ถูกบันทึกถาวร)",
        bookingId,
        status,
        rejectReason: status === "REJECTED" ? cleanRejectReason : null,
        isDemo: true,
      });
    }

    // Feature Flag: BOOKING_STORAGE (sqlite | sheets, default: sqlite)
    const bookingStorage = (process.env.BOOKING_STORAGE || "sqlite").toLowerCase();

    // ==========================================
    // Mode 1: Google Sheets Mode
    // ==========================================
    if (bookingStorage === "sheets") {
      // ตรวจสอบสิทธิ์ Admin: ในโหมด Google Sheets ปฏิเสธ demo_token เด็ดขาด
      const authCheck = verifyAdminSessionToken(adminSession, true);
      if (!authCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: authCheck.error || "Unauthorized: กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบเพื่อเปลี่ยนสถานะ",
          },
          { status: 401 }
        );
      }

      try {
        const booking = await getBookingByIdFromSheet(bookingId);
        if (!booking) {
          return NextResponse.json(
            { success: false, error: "Booking not found in Google Sheets" },
            { status: 404 }
          );
        }

        // อัปเดตเฉพาะคอลัมน์ F (status) และคอลัมน์ M (rejection_reason) ใน Google Sheets
        const updateRes = await updateBookingStatusInSheet(
          booking.bookingId,
          status,
          status === "REJECTED" ? cleanRejectReason : undefined
        );
        if (!updateRes.success) {
          throw new Error(updateRes.error || "Failed to update status in Google Sheets");
        }

        const updatedBooking = {
          id: booking.bookingId,
          queueNumber: booking.bookingId,
          patientName: booking.patientName,
          service: {
            id: "",
            nameTh: booking.service,
            nameEn: "",
            durationMinutes: 30,
            priceMin: 0,
            priceMax: 0,
            priceDisplay: "",
            description: "",
            icon: "Tooth",
            isActive: true,
          },
          date: booking.bookingDate,
          time: booking.bookingTime,
          status: status,
          phoneNumber: booking.phoneNumber,
          rejectReason: status === "REJECTED" ? cleanRejectReason : (booking.rejectionReason || null),
          medicalRights: booking.medicalRights || null,
          lineUserId: booking.lineUserId || null,
          isEmergency: booking.isEmergency,
          reminderStatus: booking.reminderStatus || "PENDING",
        };

        let notificationSent = false;
        let notificationResult: any = null;

        const targetLineUserId = booking.lineUserId ? booking.lineUserId.trim() : null;

        // 3. Automated LINE Notification Triggers สำหรับ Google Sheets mode
        if (status === "CONFIRMED" || status === "REJECTED") {
          // ป้องกันการส่งซ้ำจากเหตุการณ์เดิมหรือการเรียก API ซ้ำ
          if (booking.status === status) {
            notificationSent = false;
            notificationResult = {
              status: "SKIPPED",
              reason: "DUPLICATE_STATUS",
              message: "สถานะเดิม ไม่ส่งแจ้งเตือนซ้ำ",
            };
          } else if (!targetLineUserId) {
            // หากไม่มี line_user_id ให้ข้ามการส่งและรายงานสถานะอย่างถูกต้อง
            notificationSent = false;
            notificationResult = {
              status: "SKIPPED",
              reason: "NO_LINE_USER_ID",
              message: "ข้ามการส่งแจ้งเตือน LINE เนื่องจากไม่มี LINE User ID",
            };
          } else {
            try {
              // มี line_user_id: สร้าง LINE Flex Message ตามรูปแบบเดิม
              const flexMsg =
                status === "CONFIRMED"
                  ? buildApprovalFlexMessage({
                      queueNumber: booking.bookingId,
                      patientName: booking.patientName,
                      phoneNumber: booking.phoneNumber,
                      date: booking.bookingDate,
                      time: booking.bookingTime,
                      serviceNameTh: booking.service,
                      isEmergency: booking.isEmergency,
                    })
                  : buildRejectionFlexMessage({
                      queueNumber: booking.bookingId,
                      patientName: booking.patientName,
                      serviceNameTh: booking.service,
                      date: booking.bookingDate,
                      time: booking.bookingTime,
                      rejectReason: cleanRejectReason,
                    });

              // ส่ง LINE Notification โดยข้าม NotificationLog ของ SQLite ในโหมด sheets
              const sendRes = await sendLineFlexNotification({
                bookingId: booking.bookingId,
                type: status === "CONFIRMED" ? "APPROVAL" : "REJECTION",
                recipient: targetLineUserId,
                flexMessage: flexMsg,
                skipDbLog: true,
              });

              notificationResult = sendRes;
              // รายงาน notificationSent=true หากส่งสำเร็จจริง
              notificationSent = sendRes.status === "SUCCESS";
            } catch (err: any) {
              console.warn("LINE send notification error (non-fatal):", err);
              notificationResult = { status: "FAILED", error: err.message };
              notificationSent = false;
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: `อัปเดตสถานะเป็น ${status} สำเร็จ`,
          booking: updatedBooking,
          notificationSent,
          notificationResult,
        });
      } catch (err: unknown) {
        console.error("Error updating status in Google Sheets:", err);
        const rawMessage =
          err instanceof Error
            ? err.message
            : "Failed to update booking status in Google Sheets";
        const safeMessage = rawMessage.replace(
          /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g,
          "[REDACTED]"
        );
        return NextResponse.json(
          { success: false, error: safeMessage },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // Mode 2: SQLite Mode (Default)
    // ==========================================
    // 1. Fetch current booking
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingId }, { queueNumber: bookingId }],
      },
      include: { service: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // 2. Perform updates
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status,
        ...(status === "REJECTED"
          ? { rejectReason: cleanRejectReason }
          : rejectReason
          ? { rejectReason: String(rejectReason).trim() }
          : {}),
      },
      include: { service: true },
    });

    let notificationSent = false;
    let notificationResult: any = null;

    // 3. Automated LINE Notification Triggers (SQLite Mode)
    // ตรวจสอบการส่งซ้ำ: หากสถานะเดิมตรงกับสถานะใหม่ ไม่ส่งแจ้งเตือนซ้ำ
    if (booking.status === status) {
      notificationSent = false;
      notificationResult = {
        status: "SKIPPED",
        reason: "DUPLICATE_STATUS",
        message: "สถานะเดิม ไม่ส่งแจ้งเตือนซ้ำ",
      };
    } else if (status === "CONFIRMED" && process.env.NODE_ENV !== "test") {
      const targetRecipient = updated.lineUserId ? updated.lineUserId.trim() : null;
      if (!targetRecipient) {
        notificationSent = false;
        notificationResult = {
          status: "SKIPPED",
          reason: "NO_LINE_USER_ID",
          message: "ข้ามการส่งแจ้งเตือน LINE เนื่องจากไม่มี LINE User ID",
        };
      } else {
        try {
          const flexMsg = buildApprovalFlexMessage({
            queueNumber: updated.queueNumber,
            patientName: updated.patientName,
            phoneNumber: updated.phoneNumber,
            date: updated.date,
            time: updated.time,
            serviceNameTh: updated.service.nameTh,
            isEmergency: updated.isEmergency,
          });

          notificationResult = await sendLineFlexNotification({
            bookingId: updated.id,
            type: "APPROVAL",
            recipient: targetRecipient,
            flexMessage: flexMsg,
          });

          if (notificationResult?.status === "SUCCESS") {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { lineNotificationSent: true },
            });
            notificationSent = true;
          }
        } catch (notifErr: any) {
          console.warn("LINE send notification error (non-fatal):", notifErr);
          notificationResult = { status: "FAILED", error: notifErr.message };
          notificationSent = false;
        }
      }
    } else if (status === "REJECTED" && process.env.NODE_ENV !== "test") {
      const targetRecipient = updated.lineUserId ? updated.lineUserId.trim() : null;
      if (!targetRecipient) {
        notificationSent = false;
        notificationResult = {
          status: "SKIPPED",
          reason: "NO_LINE_USER_ID",
          message: "ข้ามการส่งแจ้งเตือน LINE เนื่องจากไม่มี LINE User ID",
        };
      } else {
        try {
          const flexMsg = buildRejectionFlexMessage({
            queueNumber: updated.queueNumber,
            patientName: updated.patientName,
            serviceNameTh: updated.service.nameTh,
            date: updated.date,
            time: updated.time,
            rejectReason: cleanRejectReason,
          });

          notificationResult = await sendLineFlexNotification({
            bookingId: updated.id,
            type: "REJECTION",
            recipient: targetRecipient,
            flexMessage: flexMsg,
          });

          if (notificationResult?.status === "SUCCESS") {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { lineNotificationSent: true },
            });
            notificationSent = true;
          }
        } catch (notifErr: any) {
          console.warn("LINE send notification error (non-fatal):", notifErr);
          notificationResult = { status: "FAILED", error: notifErr.message };
          notificationSent = false;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `อัปเดตสถานะเป็น ${status} สำเร็จ`,
      booking: updated,
      notificationSent,
      notificationResult,
    });
  } catch (err) {
    console.error("Error updating booking status:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}
