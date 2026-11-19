import { formatThaiDate, maskPhoneNumber } from "./utils";
import { prisma } from "./prisma";

export interface LineFlexMessage {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}

/**
 * Creates LINE Flex Message for Booking Creation (Pending Staff Review)
 * ระบุชัดเจนว่า "รอเจ้าหน้าที่ตรวจสอบ" ยังไม่ใช่คิวที่อนุมัติแล้ว
 */
export function buildPendingFlexMessage(booking: {
  queueNumber: string;
  patientName: string;
  phoneNumber?: string;
  date: string;
  time: string;
  serviceNameTh: string;
}): LineFlexMessage {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });
  const maskedPhone = booking.phoneNumber ? maskPhoneNumber(booking.phoneNumber) : "";

  return {
    type: "flex",
    altText: `บันทึกคำขอจองคิว ${booking.queueNumber} (รอตรวจสอบ) - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0d9488",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "บันทึกคำขอจองคิวแล้ว",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "md",
          },
          {
            type: "text",
            text: "⏳ อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ (ยังไม่อนุมัติ)",
            color: "#ccfbf1",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          // Queue Number Card (Amber / Pending badge)
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#fffbeb",
            cornerRadius: "md",
            paddingAll: "14px",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: "หมายเลขคำขอของคุณ (Booking ID)",
                size: "xs",
                color: "#92400e",
              },
              {
                type: "text",
                text: booking.queueNumber,
                size: "3xl",
                weight: "bold",
                color: "#b45309",
                margin: "xs",
              },
              {
                type: "text",
                text: "⏳ รอเจ้าหน้าที่ตรวจสอบ (PENDING)",
                size: "xs",
                color: "#b45309",
                weight: "bold",
                margin: "xs",
              },
            ],
          },
          // Booking Details Grid
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "บริการ:", size: "sm", color: "#64748b", flex: 2 },
                  {
                    type: "text",
                    text: booking.serviceNameTh,
                    size: "sm",
                    weight: "bold",
                    color: "#0f172a",
                    flex: 5,
                    wrap: true,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "วันนัดหมาย:", size: "sm", color: "#64748b", flex: 2 },
                  {
                    type: "text",
                    text: formattedDate,
                    size: "sm",
                    weight: "bold",
                    color: "#0f172a",
                    flex: 5,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "เวลานัด:", size: "sm", color: "#64748b", flex: 2 },
                  {
                    type: "text",
                    text: `${booking.time} น.`,
                    size: "sm",
                    weight: "bold",
                    color: "#0d9488",
                    flex: 5,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "ผู้ขอรับบริการ:", size: "sm", color: "#64748b", flex: 2 },
                  {
                    type: "text",
                    text: maskedPhone
                      ? `${booking.patientName} (${maskedPhone})`
                      : booking.patientName,
                    size: "sm",
                    color: "#334155",
                    flex: 5,
                    wrap: true,
                  },
                ],
              },
            ],
          },
          // Information Notice
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f8fafc",
            cornerRadius: "sm",
            paddingAll: "10px",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "ℹ️ ข้อควรทราบ:",
                size: "xs",
                weight: "bold",
                color: "#475569",
              },
              {
                type: "text",
                text: "• คำขอนี้ยังไม่ใช่การยืนยันนัดหมายขั้นสุดท้าย\n• เจ้าหน้าที่จะทำการตรวจสอบข้อมูลและแจ้งผลการอนุมัติผ่าน LINE อีกครั้ง\n• ท่านสามารถติดตามสถานะคิวได้ตลอดเวลาผ่านหน้าระบบติดตาม",
                size: "xs",
                color: "#64748b",
                wrap: true,
                margin: "xs",
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0d9488",
            action: {
              type: "uri",
              label: "📱 ติดตามสถานะคิว (Tracking)",
              uri: `https://q-dentist.clinic/tracking?q=${booking.queueNumber}`,
            },
          },
        ],
      },
    },
  };
}

/**
 * Creates LINE Flex Message for Booking Confirmation / Approval
 */
export function buildApprovalFlexMessage(booking: {
  queueNumber: string;
  patientName: string;
  phoneNumber: string;
  date: string;
  time: string;
  serviceNameTh: string;
  isEmergency?: boolean;
}): LineFlexMessage {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });
  const maskedPhone = maskPhoneNumber(booking.phoneNumber);

  return {
    type: "flex",
    altText: `ยืนยันนัดหมายทำฟัน คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: booking.isEmergency ? "#ef4444" : "#0d9488",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: booking.isEmergency ? "🚨 แจ้งเตือนคิวฉุกเฉิน / EMERGENCY" : "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "ยืนยันการนัดหมายเรียบร้อยแล้ว",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "md",
          },
          {
            type: "text",
            text: "กรุณาแสดงบัตรคิวนี้แก่เจ้าหน้าที่เมื่อมาถึงคลินิก",
            color: "#ccfbf1",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          // Queue Number Card
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f0fdfa",
            cornerRadius: "md",
            paddingAll: "14px",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: "หมายเลขคิวของคุณ (Queue No.)",
                size: "xs",
                color: "#64748b",
              },
              {
                type: "text",
                text: booking.queueNumber,
                size: "3xl",
                weight: "bold",
                color: booking.isEmergency ? "#dc2626" : "#0d9488",
                margin: "xs",
              },
              {
                type: "text",
                text: "✅ อนุมัติการจองแล้ว (Confirmed)",
                size: "xs",
                color: "#059669",
                weight: "bold",
                margin: "xs",
              },
            ],
          },
          // Booking Details Grid
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "บริการ:", size: "sm", color: "#64748b", flex: 2 },
                  { type: "text", text: booking.serviceNameTh, size: "sm", weight: "bold", color: "#0f172a", flex: 5, wrap: true },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "วันนัดหมาย:", size: "sm", color: "#64748b", flex: 2 },
                  { type: "text", text: formattedDate, size: "sm", weight: "bold", color: "#0f172a", flex: 5 },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "เวลานัด:", size: "sm", color: "#64748b", flex: 2 },
                  { type: "text", text: `${booking.time} น.`, size: "sm", weight: "bold", color: "#0d9488", flex: 5 },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "ผู้เข้ารับบริการ:", size: "sm", color: "#64748b", flex: 2 },
                  { type: "text", text: `${booking.patientName} (${maskedPhone})`, size: "sm", color: "#334155", flex: 5, wrap: true },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "สถานที่:", size: "sm", color: "#64748b", flex: 2 },
                  { type: "text", text: "Q-Dentist สาขาพญาไท อาคารเดอะพลาซ่า ชั้น 2", size: "sm", color: "#334155", flex: 5, wrap: true },
                ],
              },
            ],
          },
          // Preparation Advice or Visual Triage for Emergency
          booking.isEmergency
            ? {
                type: "box",
                layout: "vertical",
                backgroundColor: "#fff1f2",
                cornerRadius: "md",
                paddingAll: "10px",
                margin: "md",
                borderColor: "#fecdd3",
                borderWidth: "1px",
                contents: [
                  {
                    type: "text",
                    text: "📸 เพื่อความรวดเร็ว โปรดส่ง 'รูปถ่ายอาการ' เข้ามาในแชทนี้เพื่อให้แพทย์ประเมินเบื้องต้น",
                    size: "xs",
                    color: "#be123c",
                    weight: "bold",
                    wrap: true,
                  },
                ],
              }
            : {
                type: "box",
                layout: "vertical",
                backgroundColor: "#f8fafc",
                cornerRadius: "sm",
                paddingAll: "10px",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: "💡 คำแนะนำก่อนรับบริการ:",
                    size: "xs",
                    weight: "bold",
                    color: "#475569",
                  },
                  {
                    type: "text",
                    text: "• กรุณามาถึงก่อนเวลานัดหมาย 10-15 นาที\n• แปรงฟันให้สะอาดก่อนพบแพทย์\n• เตรียมบัตรประชาชนเพื่อยืนยันตัวตน",
                    size: "xs",
                    color: "#64748b",
                    wrap: true,
                    margin: "xs",
                  },
                ],
              },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: booking.isEmergency ? "#dc2626" : "#0d9488",
            action: {
              type: "uri",
              label: booking.isEmergency ? "🚨 แสดงบัตรฉุกเฉินแก่เจ้าหน้าที่" : "📱 ดูบัตรคิวดิจิทัล (Digital Ticket)",
              uri: `https://q-dentist.clinic/tracking?q=${booking.queueNumber}`,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "📞 โทรติดต่อคลินิก (02-999-8888)",
              uri: "tel:029998888",
            },
          },
          ...(booking.isEmergency
            ? [
                {
                  type: "text",
                  text: "⚠️ สงวนสิทธิ์สำหรับเคสเลือดออกไม่หยุด/อุบัติเหตุ/ปวดรุนแรง หากประเมินหน้างานแล้วไม่ฉุกเฉิน จะถูกจัดเป็นคิวปกติ",
                  size: "xxs",
                  color: "#94a3b8",
                  wrap: true,
                  align: "center",
                  margin: "md",
                },
              ]
            : []),
        ],
      },
    },
  };
}

/**
 * Creates LINE Flex Message for Emergency SOS Card (The SOS Card)
 * Includes:
 * 1. Visual Triage (ส่งรูปถ่ายอาการ)
 * 2. 2 Action buttons (Share Contact & Share Location)
 * 3. Disclaimer ใต้ปุ่มกด (สงวนสิทธิ์สำหรับเคสเลือดออกไม่หยุด/อุบัติเหตุ/ปวดรุนแรง)
 */
export function buildEmergencySosCard(): LineFlexMessage {
  return {
    type: "flex",
    altText: "🚨 แจ้งเหตุฉุกเฉินทันตกรรม (Dental Emergency SOS) - Q-Dentist Clinic",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#dc2626",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "🚨 DENTAL EMERGENCY SOS",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "แจ้งเหตุทันตกรรมฉุกเฉิน",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "md",
          },
          {
            type: "text",
            text: "ระบบประสานงานด่วนเพื่อเข้ารับการรักษาทันที",
            color: "#fee2e2",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "กรุณากดปุ่มด้านล่างเพื่อแชร์ข้อมูลติดต่อและตำแหน่งของคุณให้คลินิกเตรียมความพร้อมล่วงหน้า",
            size: "sm",
            color: "#334155",
            wrap: true,
          },
          // 📸 Visual Triage Text Block
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#fff1f2",
            cornerRadius: "md",
            paddingAll: "12px",
            borderColor: "#fecdd3",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: "📸 เพื่อความรวดเร็ว โปรดส่ง 'รูปถ่ายอาการ' เข้ามาในแชทนี้เพื่อให้แพทย์ประเมินเบื้องต้น",
                size: "xs",
                color: "#be123c",
                weight: "bold",
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#dc2626",
            action: {
              type: "uri",
              label: "📞 แชร์เบอร์โทรศัพท์ติดต่อ",
              uri: "tel:029998888",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "📍 แชร์พิกัดตำแหน่งปัจจุบัน",
              uri: "https://line.me/R/nv/location/",
            },
          },
          // ⚠️ Disclaimer Text Block (ใต้ปุ่มกด)
          {
            type: "text",
            text: "⚠️ สงวนสิทธิ์สำหรับเคสเลือดออกไม่หยุด/อุบัติเหตุ/ปวดรุนแรง หากประเมินหน้างานแล้วไม่ฉุกเฉิน จะถูกจัดเป็นคิวปกติ",
            size: "xxs",
            color: "#94a3b8",
            wrap: true,
            align: "center",
            margin: "md",
          },
        ],
      },
    },
  };
}

/**
 * Creates LINE Flex Message for Booking Rejection / Cancellation
 */
export function buildRejectionFlexMessage(booking: {
  queueNumber: string;
  patientName: string;
  serviceNameTh: string;
  date: string;
  time: string;
  rejectReason?: string;
}): LineFlexMessage {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });

  return {
    type: "flex",
    altText: `แจ้งเตือนการนัดหมาย คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#e11d48",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "ไม่สามารถยืนยันนัดหมายได้",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "md",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: `เรียน คุณ${booking.patientName}`,
            size: "sm",
            weight: "bold",
            color: "#0f172a",
          },
          {
            type: "text",
            text: `คลินิกขออภัยที่ไม่สามารถยืนยันคิว ${booking.queueNumber} สำหรับบริการ "${booking.serviceNameTh}" ในวัน${formattedDate} เวลา ${booking.time} น. ได้`,
            size: "sm",
            color: "#475569",
            wrap: true,
          },
          ...(booking.rejectReason && booking.rejectReason.trim()
            ? [
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#fff1f2",
                  cornerRadius: "md",
                  paddingAll: "12px",
                  contents: [
                    {
                      type: "text",
                      text: "สาเหตุ / คำชี้แจงจากเจ้าหน้าที่:",
                      size: "xs",
                      weight: "bold",
                      color: "#e11d48",
                    },
                    {
                      type: "text",
                      text: booking.rejectReason.trim(),
                      size: "sm",
                      color: "#9f1239",
                      margin: "xs",
                      wrap: true,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0d9488",
            action: {
              type: "uri",
              label: "📅 เลือกวันและเวลานัดหมายใหม่",
              uri: "https://q-dentist.clinic/book",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "💬 ปรึกษาเจ้าหน้าที่ผ่าน LINE",
              uri: "https://line.me/R/ti/p/@q-dentist",
            },
          },
        ],
      },
    },
  };
}

/**
 * Creates LINE Flex Message for Advance Reminder (1-2 Days Prior)
 * Includes Interactive Action Buttons: [ ยืนยันการมา ] and [ ขอเลื่อนนัด ]
 */
export function buildAdvanceReminderFlexMessage(booking: {
  queueNumber: string;
  patientName: string;
  serviceNameTh: string;
  date: string;
  time: string;
}): LineFlexMessage {
  const formattedDate = formatThaiDate(booking.date, { includeDay: true });

  return {
    type: "flex",
    altText: `⏰ เตือนนัดหมายทำฟันล่วงหน้า คิวที่ ${booking.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284c7",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "⏰ แจ้งเตือนนัดหมายล่วงหน้า",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "md",
          },
          {
            type: "text",
            text: "อีก 1-2 วันจะถึงกำหนดนัดหมายของท่าน",
            color: "#e0f2fe",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f0f9ff",
            cornerRadius: "md",
            paddingAll: "14px",
            contents: [
              {
                type: "text",
                text: `คุณ ${booking.patientName}`,
                size: "md",
                weight: "bold",
                color: "#0369a1",
              },
              {
                type: "text",
                text: `คิวตรวจ: ${booking.queueNumber}`,
                size: "sm",
                color: "#0284c7",
                margin: "xs",
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "sm",
            contents: [
              {
                type: "text",
                text: `• บริการ: ${booking.serviceNameTh}`,
                size: "sm",
                color: "#334155",
              },
              {
                type: "text",
                text: `• วันที่: ${formattedDate}`,
                size: "sm",
                weight: "bold",
                color: "#0f172a",
              },
              {
                type: "text",
                text: `• เวลา: ${booking.time} น.`,
                size: "sm",
                weight: "bold",
                color: "#0284c7",
              },
            ],
          },
          {
            type: "text",
            text: "โปรดยืนยันการเข้ารับบริการ เพื่อให้ทางคลินิกเตรียมห้องตรวจและเครื่องมือล่วงหน้า",
            size: "xs",
            color: "#64748b",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#059669",
            action: {
              type: "uri",
              label: "✅ [ ยืนยันการมา ]",
              uri: `https://q-dentist.clinic/tracking?q=${booking.queueNumber}&action=confirm-attendance`,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "🔄 [ ขอเลื่อนนัด ]",
              uri: `https://q-dentist.clinic/tracking?q=${booking.queueNumber}&action=reschedule`,
            },
          },
        ],
      },
    },
  };
}

/**
 * ตรวจสอบว่า recipient (LINE User ID) อยู่ใน Allowlist สำหรับการส่งข้อความจริงหรือไม่
 * ในโหมด UAT/ทดสอบ: บังคับส่งเฉพาะบัญชีที่ระบุใน LINE_NOTIF_ALLOWLIST เท่านั้น
 * เพื่อป้องกันการส่งข้อความรบกวนประชาชนหรือผู้ป่วยจริงโดยไม่ตั้งใจ
 */
export function isLineRecipientAllowlisted(recipient: string): boolean {
  if (!recipient || !recipient.trim()) return false;
  const cleanRecipient = recipient.trim();
  if (cleanRecipient.startsWith("08") || cleanRecipient.startsWith("09") || cleanRecipient.startsWith("U_demo_")) {
    return false;
  }

  // LINE_NOTIF_ALLOWLIST ใช้ควบคุมผู้รับการแจ้งเตือนเท่านั้น
  const rawEnv = (process.env.LINE_NOTIF_ALLOWLIST || "")
    .replace(/^["']|["']$/g, "")
    .trim();

  // หากไม่มีการกำหนด Allowlist ในสิ่งแวดล้อม: Fail-Safe บล็อกการส่งข้อความจริงทั้งหมด
  if (!rawEnv) {
    return false;
  }

  // หากระบุเป็น "*" จึงจะอนุญาตทุกบัญชี
  if (rawEnv === "*") {
    return true;
  }

  const allowed = rawEnv
    .split(",")
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .filter((s) => s.length > 0 && !/\s/.test(s))
    .map((s) => s.toLowerCase());

  return allowed.includes(cleanRecipient.toLowerCase());
}

/**
 * Dispatch LINE Flex Message:
 * 1. If LINE_CHANNEL_ACCESS_TOKEN is set and recipient has lineUserId, sends actual HTTP request to LINE Messaging API.
 * 2. In all cases, persists the message in NotificationLog for staff audit and UI preview.
 */
export async function sendLineFlexNotification(params: {
  bookingId: string;
  type: "PENDING" | "APPROVAL" | "REJECTION" | "ADVANCE_REMINDER" | "STATUS_UPDATE" | "EMERGENCY_ALERT";
  recipient: string;
  flexMessage: LineFlexMessage;
  skipDbLog?: boolean;
}) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  let status = "SIMULATED";

  const isAllowlisted = isLineRecipientAllowlisted(params.recipient);

  if (!isAllowlisted) {
    console.log(
      `[LINE Safe Guard] Recipient '${params.recipient}' is not in LINE_NOTIF_ALLOWLIST. Message push simulated.`
    );
    status = "SIMULATED_NOT_IN_ALLOWLIST";
  } else if (token && params.recipient && !params.recipient.startsWith("08") && !params.recipient.startsWith("09")) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: params.recipient,
          messages: [params.flexMessage],
        }),
      });

      if (res.ok) {
        status = "SUCCESS";
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.warn("LINE Messaging API responded with error:", errorData);
        status = "FAILED";
      }
    } catch (err) {
      console.warn("Error sending LINE message:", err);
      status = "FAILED";
    }
  }

  // หากอยู่ในโหมด sheets หรือระบุ skipDbLog ให้ข้ามการบันทึก Prisma NotificationLog เพื่อไม่ให้เรียก SQLite
  const isSheetsMode = (process.env.BOOKING_STORAGE || "").toLowerCase() === "sheets";
  if (params.skipDbLog || isSheetsMode) {
    return {
      success: status === "SUCCESS",
      status,
      logId: null,
    };
  }

  // Record in NotificationLog
  try {
    const log = await prisma.notificationLog.create({
      data: {
        bookingId: params.bookingId,
        type: params.type,
        recipient: params.recipient,
        flexMessagePayload: JSON.stringify(params.flexMessage),
        status: status,
      },
    });
    return { success: true, status, logId: log.id };
  } catch (err) {
    console.error("Failed to save NotificationLog:", err);
    return { success: false, status: "ERROR" };
  }
}
