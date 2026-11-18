const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Q-Dentist database...");

  // 1. Seed Services
  const servicesData = [
    {
      id: "srv-scaling-filling",
      nameTh: "ขูดหินปูน / อุดฟัน",
      nameEn: "Dental Scaling & Filling",
      durationMinutes: 30,
      priceMin: 800,
      priceMax: 1500,
      priceDisplay: "800 - 1,500 บาท",
      description: "ทำความสะอาดคราบหินปูน ขจัดคราบพลัค อุดฟันด้วยวัสดุเรซินสีเหมือนฟันแท้",
      icon: "Sparkles",
      isActive: true,
    },
    {
      id: "srv-extraction-wisdom",
      nameTh: "ถอนฟัน / ผ่าฟันคุด",
      nameEn: "Extraction & Wisdom Tooth Surgery",
      durationMinutes: 45,
      priceMin: 1200,
      priceMax: 4500,
      priceDisplay: "1,200 - 4,500 บาท",
      description: "ผ่าตัดฟันคุด ถอนฟันแท้หรือฟันน้ำนม ด้วยยาชาเฉพาะจุด ปลอดภัย ไร้กังวล",
      icon: "Tooth",
      isActive: true,
    },
    {
      id: "srv-checkup-consult",
      nameTh: "ตรวจสุขภาพช่องปากและฟัน",
      nameEn: "Dental Checkup & Consultation",
      durationMinutes: 30,
      priceMin: 300,
      priceMax: 500,
      priceDisplay: "300 - 500 บาท",
      description: "ตรวจเช็กสภาพฟัน เหงือก และช่องปากเบื้องต้น พร้อมให้คำปรึกษาการวางแผนการรักษา",
      icon: "ShieldCheck",
      isActive: true,
    },
    {
      id: "srv-braces-adjustment",
      nameTh: "ปรับเครื่องมือจัดฟัน",
      nameEn: "Braces Adjustment & Wire Change",
      durationMinutes: 30,
      priceMin: 1000,
      priceMax: 1500,
      priceDisplay: "1,000 - 1,500 บาท",
      description: "เปลี่ยนยาง เปลี่ยนลวดจัดฟัน ตรวจเช็คความเคลื่อนตัวของฟันประจำเดือน",
      icon: "Smile",
      isActive: true,
    },
    {
      id: "srv-root-canal",
      nameTh: "รักษารากฟัน",
      nameEn: "Root Canal Therapy (Endodontics)",
      durationMinutes: 60,
      priceMin: 3500,
      priceMax: 8000,
      priceDisplay: "3,500 - 8,000 บาท",
      description: "รักษาโพรงประสาทฟันติดเชื้อ ป้องกันการสูญเสียฟันแท้ โดยทันตแพทย์เฉพาะทาง",
      icon: "Activity",
      isActive: true,
    },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }

  // 2. Generate dates for today + 7 days
  const today = new Date();
  const formatYMD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatYMD(today);

  // Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatYMD(tomorrow);

  // Two days later
  const day2 = new Date(today);
  day2.setDate(day2.getDate() + 2);
  const day2Str = formatYMD(day2);

  // 3. Block some sample slots to demonstrate Slot Control
  await prisma.slotConfig.upsert({
    where: { id: `${tomorrowStr}_11:30` },
    update: { isBlocked: true, blockedReason: "ทันตแพทย์ติดประชุมวิชาการประจำสัปดาห์" },
    create: {
      id: `${tomorrowStr}_11:30`,
      date: tomorrowStr,
      time: "11:30",
      isBlocked: true,
      blockedReason: "ทันตแพทย์ติดประชุมวิชาการประจำสัปดาห์",
      maxCapacity: 2,
    },
  });

  // 4. Sample Bookings for demonstration
  const sampleBookings = [
    {
      queueNumber: "DEN-001",
      date: todayStr,
      time: "09:00",
      period: "MORNING",
      serviceId: "srv-scaling-filling",
      patientName: "นาย สมชาย ใจดี",
      phoneNumber: "081-456-7890",
      nationalIdOrHn: "1-1002-00345-67-8",
      symptoms: "รู้สึกเสียวฟันกรามล่างขวาเวลาดื่มน้ำเย็น",
      isEmergency: false,
      status: "COMPLETED",
      pdpaAccepted: true,
      lineUserId: "U1234567890abcdef1",
      lineNotificationSent: true,
      reminderStatus: "ATTENDANCE_CONFIRMED",
    },
    {
      queueNumber: "DEN-002",
      date: todayStr,
      time: "10:00",
      period: "MORNING",
      serviceId: "srv-braces-adjustment",
      patientName: "น.ส. ธิดารัตน์ แสนสุข",
      phoneNumber: "089-123-4567",
      nationalIdOrHn: "HN892341",
      symptoms: "ปรับลวดยางจัดฟันครบ 4 สัปดาห์",
      isEmergency: false,
      status: "IN_PROGRESS",
      pdpaAccepted: true,
      lineUserId: "U1234567890abcdef2",
      lineNotificationSent: true,
      reminderStatus: "ATTENDANCE_CONFIRMED",
    },
    {
      queueNumber: "EMG-001",
      date: todayStr,
      time: "10:30",
      period: "MORNING",
      serviceId: "srv-extraction-wisdom",
      patientName: "นาย ภาณุพงศ์ ประเสริฐแท้",
      phoneNumber: "082-998-8776",
      nationalIdOrHn: "1-3301-00892-11-4",
      symptoms: "ปวดฟันคุดเฉียบพลัน แก้มบวม อ้าปากไม่ขึ้น ทานข้าวไม่ได้ ปวดระดับ 9/10",
      isEmergency: true,
      emergencySeverity: "CRITICAL",
      emergencyNotes: "กรณีฉุกเฉินเร่งด่วน Buffer Slot แทรกคิวทันที",
      status: "CONFIRMED",
      pdpaAccepted: true,
      lineUserId: "U9988776655aabbcc1",
      lineNotificationSent: true,
    },
    {
      queueNumber: "DEN-003",
      date: todayStr,
      time: "13:30",
      period: "AFTERNOON",
      serviceId: "srv-root-canal",
      patientName: "คุณ วราภรณ์ มั่งมี",
      phoneNumber: "086-778-9900",
      nationalIdOrHn: "HN765432",
      symptoms: "นัดต่อเนื่องรักษารากฟันครั้งที่ 2",
      isEmergency: false,
      status: "CONFIRMED",
      pdpaAccepted: true,
      lineUserId: "U4455667788ddeeff1",
      lineNotificationSent: true,
    },
    {
      queueNumber: "DEN-004",
      date: tomorrowStr,
      time: "09:30",
      period: "MORNING",
      serviceId: "srv-scaling-filling",
      patientName: "นาย ชาญชัย มั่นคง",
      phoneNumber: "085-334-5566",
      nationalIdOrHn: "1-5509-00123-45-6",
      symptoms: "ต้องการตรวจฟันและขูดหินปูนประจำปี",
      isEmergency: false,
      status: "PENDING",
      pdpaAccepted: true,
      lineUserId: "U5566778899aabbcc2",
      lineNotificationSent: false,
    },
    {
      queueNumber: "DEN-005",
      date: day2Str,
      time: "10:00",
      period: "MORNING",
      serviceId: "srv-extraction-wisdom",
      patientName: "นางสาว มัลลิกา วิริยะ",
      phoneNumber: "087-654-3210",
      nationalIdOrHn: "HN541298",
      symptoms: "นัดผ่าฟันคุดซี่ล่างซ้าย",
      isEmergency: false,
      status: "CONFIRMED",
      pdpaAccepted: true,
      lineUserId: "U6677889900aabbcc3",
      lineNotificationSent: true,
      reminderStatus: "NOT_SENT", // Ready to be tested with the 2-day Advance Reminder Cron!
    },
  ];

  for (const b of sampleBookings) {
    const existing = await prisma.booking.findUnique({
      where: { queueNumber: b.queueNumber },
    });
    if (!existing) {
      await prisma.booking.create({ data: b });
    }
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
