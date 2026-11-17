# 🦷 Q-Dentist — Dental Clinic Queue & Emergency Management System
> ระบบจองคิวทันตกรรมออนไลน์ จัดการคิวฉุกเฉิน และแจ้งเตือนผ่าน LINE Messaging API อัตโนมัติ สำหรับคลินิกทันตกรรมในประเทศไทย

---

## 🌟 จุดเด่นและภาพรวมระบบ (Overview)

**Q-Dentist** ถูกออกแบบและพัฒนาขึ้นเพื่อยกระดับการให้บริการของคลินิกทันตกรรมในไทย แก้ปัญหาผู้ป่วยรอคิวนาน ลดอัตราการผิดนัด (No-Show) ด้วยระบบเตือนล่วงหน้า 1-2 วันทาง LINE และรองรับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) อย่างเคร่งครัด

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** Next.js 14+ (App Router), React 18, Tailwind CSS, Lucide React, Canvas Confetti
- **Backend:** Next.js Server Actions & API Routes, Zod Validation, Transactional Concurrency Lock
- **Database:** Prisma ORM with SQLite (`dev.db`), รองรับสลับเป็น PostgreSQL
- **Messaging API:** LINE Messaging API (Flex Message Push & Reply), Interactive Actions (`[ ยืนยันการมา ]`, `[ ขอเลื่อนนัด ]`)
- **Scheduled Tasks:** `node-cron` ทำงานอัตโนมัติทุกวันเวลา 08:00 น. (`0 8 * * *`) พร้อมปุ่ม Manual Trigger บนแดชบอร์ด

---

## 📑 รายละเอียดโมดูลระบบ (System Modules)

### 1. ฝั่งประชาชน (Patient Portal)
- **Step 1: เลือกบริการทันตกรรม**
  - ขูดหินปูน / อุดฟัน (30 นาที | 800 - 1,500 บาท)
  - ถอนฟัน / ผ่าฟันคุด (45 นาที | 1,200 - 4,500 บาท)
  - ปรับเครื่องมือจัดฟัน (30 นาที | 1,000 - 1,500 บาท)
  - รักษารากฟัน (60 นาที | 3,500 - 8,000 บาท)
- **Step 2: เลือกวันและเวลา (Interactive Slots)**
  - จองล่วงหน้าได้ 1-7 วัน
  - แบ่งรอบเช้า (09:00 - 12:00) และรอบบ่าย (13:00 - 16:00)
  - แสดงสถานะสล็อตแบบ Real-time: `ว่าง (Available)`, `เต็มแล้ว (Full)`, `ระงับการจอง (Blocked)`
  - ป้องกันการจองซ้อน (Double Booking Prevention) ด้วย Database Transactions
- **Step 3: กรอกข้อมูลและยินยอม PDPA**
  - ชื่อ-นามสกุล, เบอร์โทรศัพท์มือถือ 10 หลัก
  - เลขประจำตัวประชาชน 13 หลัก หรือเลขประจำตัวผู้ป่วย (HN)
  - กล่องข้อตกลง PDPA Consent พร้อมปุ่มอ่านนโยบายฉบับเต็ม
- **Step 4: บัตรคิวดิจิทัล (Digital Queue Ticket)**
  - สร้างรหัสคิว เช่น `DEN-001`
  - สถานะ: `⏳ รออนุมัติ`, `✅ ยืนยันแล้ว`, `🩺 กำลังรักษา`, `🎉 เสร็จสิ้น`, `🚫 ปฏิเสธ`
  - ค้นหาและติดตามบัตรคิวผ่านเบอร์โทรศัพท์หรือรหัสคิวได้ตลอด 24 ชม.

### 2. ฝั่งเจ้าหน้าที่คลินิก (Clinic Admin Dashboard)
- **Real-time KPI Overview:**
  - รออนุมัติ (Pending), ยืนยันแล้ววันนี้ (Confirmed Today), กำลังตรวจ (In Progress), เสร็จสิ้นวันนี้ (Completed Today), เคสฉุกเฉิน (Emergency), รวมคิววันนี้
- **ตารางคิวและปุ่มจัดการด่วน (Action Controls):**
  - **อนุมัติ (Approve):** เปลี่ยนสถานะเป็น `Confirmed` และส่ง LINE Flex Message แจ้งเตือนผู้ป่วยทันที
  - **ปฏิเสธ (Reject):** ระบุสาเหตุ (เช่น แพทย์ติดผ่าตัดด่วน) และส่งแจ้งเตือนทาง LINE
  - **เช็คอิน (Check-In):** ผู้ป่วยมาถึงคลินิก
  - **เรียกเข้าตรวจ (In Progress):** ผู้ป่วยเข้าห้องทำหัตถการ
  - **เสร็จสิ้น (Completed):** การรักษาเสร็จสมบูรณ์
- **ระบบแทรกคิวฉุกเฉิน (🚨 Emergency Buffer):**
  - ปุ่มแทรกคิวกรณีปวดฟันรุนแรง ฟันหักจากอุบัติเหตุ หรือเลือดออก
  - ข้ามขีดจำกัดสล็อตมาตรฐาน ออกรหัสคิวเฉพาะ `EMG-xxx`
- **ระบบควบคุมสล็อตและตารางเวลา (Slot & Schedule Control):**
  - เปิดรับนัด (Open) หรือระงับการจอง (Block) สล็อตใดๆ พร้อมระบุสาเหตุ
- **ระบบทดสอบ Cron Job เตือนล่วงหน้า 2 วัน (Advance Reminder Trigger):**
  - ทดสอบส่ง Flex Message เตือนนัดหมายล่วงหน้าได้ทันทีจากแดชบอร์ด

### 3. ระบบแจ้งเตือน LINE & เครื่องมือจำลอง (LINE Flex Simulator)
- **Flex Message 4 รูปแบบ:**
  1. การ์ดยืนยันการนัดหมาย (Approval Card)
  2. การ์ดแจ้งปฏิเสธการนัดหมาย (Rejection Card)
  3. การ์ดแจ้งเตือนล่วงหน้า 1-2 วัน พร้อมปุ่มโต้ตอบ `[ ยืนยันการมา ]` และ `[ ขอเลื่อนนัด ]`
  4. การ์ดแจ้งเตือนเคสฉุกเฉิน (Emergency Alert Card)
- **เครื่องมือจำลองเสมือนจริง (Smartphone Simulator):**
  - หน้าพรีวิวบนหน้าจอมือถือจริง พร้อมตัวตรวจสอบ JSON Payload

---

## 🚀 วิธีการติดตั้งและรันระบบ (Setup & Running)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. เตรียมฐานข้อมูลและสร้างข้อมูลตั้งต้น
```bash
npx prisma db push
node prisma/seed.js
```

### 3. รันระบบสำหรับ Development
```bash
npm run dev
```

### 4. บิลด์และรันสำหรับ Production
```bash
npm run build
npm run start
```
เปิดบราวเซอร์ที่: `http://localhost:3000`

---

## 🔒 การตั้งค่า LINE Messaging API (Optional)
หากต้องการส่งข้อความเข้าแอป LINE จริง ให้สร้างไฟล์ `.env` ที่ root folder:
```env
LINE_CHANNEL_ACCESS_TOKEN="YOUR_LINE_CHANNEL_ACCESS_TOKEN"
LINE_CHANNEL_SECRET="YOUR_LINE_CHANNEL_SECRET"
```
*หมายเหตุ: หากไม่ได้ระบุ Token ระบบจะทำงานในโหมดจำลอง (Simulated Mode) และบันทึกลง NotificationLog พร้อมแสดงผลบนหน้า Flex Simulator อย่างสมบูรณ์*
