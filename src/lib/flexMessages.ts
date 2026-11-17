/**
 * LINE Flex Message Templates for Q-Dentist
 * Generates interactive and elegant cards for patient communications
 */

export interface BookingTicketData {
  id: string;
  queueNumber: string;
  patientName: string;
  phoneNumber?: string;
  date: string;
  time: string;
  serviceNameTh?: string;
  isEmergency?: boolean;
}

export interface LineFlexMessage {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}

/**
 * Step 1: ตั๋วนัดหมายดิจิทัล (Digital Appointment Ticket)
 * มาพร้อมปุ่ม Postback "ยืนยันการเข้ารับบริการ" สำหรับการสื่อสาร 2-Way แบบเรียลไทม์
 */
export function getBookingTicketFlex(bookingData: BookingTicketData): LineFlexMessage {
  const isEmergency = Boolean(bookingData.isEmergency);

  return {
    type: "flex",
    altText: `ตั๋วนัดหมายทำฟัน คิวที่ ${bookingData.queueNumber} - Q-Dentist Clinic`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: isEmergency ? "#dc2626" : "#0d9488",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: isEmergency ? "🚨 EMERGENCY TICKET" : "🦷 Q-DENTIST CLINIC",
            color: "#ffffff",
            weight: "bold",
            size: "xs",
          },
          {
            type: "text",
            text: isEmergency ? "บัตรคิวฉุกเฉินด่วน" : "บัตรนัดหมายเข้ารับบริการ",
            color: "#ffffff",
            weight: "bold",
            size: "xl",
            margin: "xs",
          },
          {
            type: "text",
            text: "Dental Appointment Ticket",
            color: isEmergency ? "#fecaca" : "#ccfbf1",
            size: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "md",
        contents: [
          // ไฮไลต์หมายเลขคิว
          {
            type: "box",
            layout: "vertical",
            backgroundColor: isEmergency ? "#fff1f2" : "#f0fdfa",
            cornerRadius: "14px",
            paddingAll: "16px",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: "หมายเลขคิวของคุณ",
                color: isEmergency ? "#b91c1c" : "#0f766e",
                size: "xs",
                weight: "bold",
              },
              {
                type: "text",
                text: bookingData.queueNumber,
                color: isEmergency ? "#e11d48" : "#0d9488",
                size: "3xl",
                weight: "bold",
                margin: "xs",
              },
              {
                type: "text",
                text: "กรุณามาถึงก่อนเวลานัดหมาย 10 นาที",
                color: "#64748b",
                size: "xxs",
                margin: "xs",
              },
            ],
          },
          // ข้อมูลรายละเอียดการนัดหมาย
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
                  { type: "text", text: "ชื่อคนไข้", color: "#64748b", size: "sm", flex: 3 },
                  { type: "text", text: bookingData.patientName, color: "#1e293b", size: "sm", weight: "bold", flex: 6 },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "บริการ", color: "#64748b", size: "sm", flex: 3 },
                  {
                    type: "text",
                    text: bookingData.serviceNameTh || "ตรวจสุขภาพฟันและช่องปาก",
                    color: "#0d9488",
                    size: "sm",
                    weight: "bold",
                    flex: 6,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "วันที่นัด", color: "#64748b", size: "sm", flex: 3 },
                  { type: "text", text: bookingData.date, color: "#1e293b", size: "sm", weight: "bold", flex: 6 },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "เวลานัด", color: "#64748b", size: "sm", flex: 3 },
                  { type: "text", text: `${bookingData.time} น.`, color: "#1e293b", size: "sm", weight: "bold", flex: 6 },
                ],
              },
            ],
          },
          {
            type: "separator",
            margin: "lg",
            color: "#e2e8f0",
          },
          // ข้อมูลสถานที่
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "📍 สถานที่", color: "#64748b", size: "xs", flex: 3 },
              {
                type: "text",
                text: "Q-Dentist Clinic สาขาพญาไท อาคารเดอะพลาซ่า ชั้น 2",
                color: "#475569",
                size: "xs",
                wrap: true,
                flex: 6,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "20px",
        paddingTop: "0px",
        contents: [
          // ปุ่ม Postback สำหรับยืนยันคิวแบบ 2-Way Interaction
          {
            type: "button",
            style: "primary",
            color: "#0d9488",
            height: "sm",
            action: {
              type: "postback",
              label: "ยืนยันการเข้ารับบริการ",
              data: `action=confirmBooking&bookingId=${bookingData.id}`,
              displayText: "ยืนยันการเข้ารับบริการ",
            },
          },
          {
            type: "text",
            text: "กดปุ่มด้านบนเพื่อยืนยันว่าท่านสามารถมาตามนัดหมายได้",
            size: "xxs",
            color: "#94a3b8",
            align: "center",
            margin: "xs",
          },
        ],
      },
    },
  };
}
