# คู่มือการรันและทดสอบระบบ DentQ

## 1. วิธีการรันเว็บ
รันเซิร์ฟเวอร์ใน Development mode:
```bash
npm run dev
```
เข้าใช้งานผ่านเบราว์เซอร์ที่: `http://localhost:3000`

### หน้าระบบสำหรับทดสอบ UX/UI (Final Mockup Mode):
- **หน้าหลัก (Home):** `http://localhost:3000/`
- **หน้าจองคิว (Booking):** `http://localhost:3000/book` (ทดลองเลือกบริการ/วันเวลา/ข้อมูลสมมติ พร้อมปุ่มเชื่อมต่อ LINE)
- **หน้าติดตามสถานะคิว (Tracking):** `http://localhost:3000/tracking?q=DEN-004` (ดูตัวอย่างบัตรคิว Digital Ticket และสถานะจริง)
- **หน้าเข้าสู่ระบบ Admin (Login):** `http://localhost:3000/login` (โหมด Demo กด "เข้าสู่ระบบ" ได้ทันที)
- **หน้าแดชบอร์ดเจ้าหน้าที่ (Admin):** `http://localhost:3000/admin` (ดู KPIs และรายการคิวประจำวัน)

---

## 2. วิธีทดสอบ Google Sheets เชื่อมต่อโดยตรง
รันสคริปต์ทดสอบการอ่านข้อมูลจาก Google Sheets ผ่าน Node.js:
```powershell
node --env-file=.env .\test-sheets-read.cjs
```

รันสคริปต์ทดสอบการบันทึกข้อมูล (Append) ลง Google Sheets ผ่าน Node.js:
```powershell
node --env-file=.env .\test-sheets-append.cjs
```

รันสคริปต์อัปเดตและตรวจสอบหัวคอลัมน์ A–J (Step 6.18):
```powershell
node --env-file=.env .\update-sheets-headers.cjs
```

รันสคริปต์ทดสอบฟังก์ชันอ่านและคำนวณคิว Google Sheets Booking Service (Step 6.23):
```powershell
node --env-file=.env .\test-sheets-service.cjs
```

รันสคริปต์ทดสอบความปลอดภัยและการยืนยันสิทธิ์ LINE Webhook (Step 6.30):
```powershell
node --env-file=.env .\test-line-webhook-auth.cjs
```

รันสคริปต์ทดสอบ Admin LINE Notification ในโหมด Google Sheets (Step 6.31):
```powershell
node --env-file=.env .\test-admin-line-notification.cjs
```

รันสคริปต์ทดสอบ LINE Reminder Cron ในโหมด Google Sheets (Step 6.32):
```powershell
node --env-file=.env .\test-cron-reminder-sheets.cjs
```

รันสคริปต์ทดสอบความปลอดภัยการยืนยันตัวตน LIFF ID Token (Step 7.2):
```powershell
node .\test-liff-booking-auth.cjs
```

รันสคริปต์ทดสอบ Google Sheets Medical Rights Col L (Step 2.1):
```powershell
node --env-file=.env .\test-sheets-medical-rights.cjs
```

รันสคริปต์ทดสอบโควตารอบเช้า Morning Quota 6 คิว (Step 2.2):
```powershell
node .\test-morning-quota.cjs
```

รันสคริปต์ทดสอบ Booking API โหมด LINE-First (Step 2.3):
```powershell
node .\test-booking-api-step23.cjs
```

รันสคริปต์ทดสอบหน้าจองคิว Booking Frontend LINE-First (Step 2.4):
```powershell
node .\test-booking-frontend-step24.cjs
```

รันสคริปต์ทดสอบระบบติดตามคิว LINE-First Tracking (Step 2.5):
```powershell
node .\test-tracking-step25.cjs
```

รันสคริปต์ทดสอบความปลอดภัย Tracking Token (Step 2.5.1):
```powershell
node .\test-tracking-auth-step251.cjs
```

รันสคริปต์ทดสอบระบบแจ้งเตือนอัตโนมัติผ่าน LINE 4 เหตุการณ์ (Step 2.6):
```powershell
node .\test-line-notifications-step26.cjs
```

รันสคริปต์ทดสอบ Rejection Reason Backend Col M (Step 2.7.1):
```powershell
node .\test-rejection-reason-step271.cjs
```

รันสคริปต์ทดสอบ Admin Dashboard & Tracking Frontend (Step 2.7.2):
```powershell
node .\test-admin-tracking-step272.cjs
```

รันสคริปต์ทดสอบ Synthetic Demo Data (Step V1.1):
```powershell
node .\test-demo-data-stepv11.cjs
```

รันสคริปต์ทดสอบ Safe Demo API Isolation (Step V1.2):
```powershell
node .\test-safe-demo-isolation-stepv12.cjs
```

รันสคริปต์ทดสอบ Safe Demo Frontend UX (Step V1.3):
```powershell
node .\test-demo-frontend-stepv13.cjs
```

รันสคริปต์ทดสอบ Vercel Build & Security Readiness (Step V1.4):
```powershell
node .\test-vercel-readiness-stepv14.cjs
```

รันสคริปต์ทดสอบการแก้ไข Styling และ Font (Step UI 1):
```powershell
node .\test-styling-stepui1.cjs
```

---

## 3. วิธีทดสอบ API Endpoint
เปิดเบราว์เซอร์หรือส่งคำขอทดสอบ API:
```bash
http://localhost:3000/api/test-sheets
```
หรือผ่านคำสั่ง PowerShell:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/test-sheets
```

---

## 4. ผลการทดสอบล่าสุด
- **Step 6.12:** PASS
- **Step 6.13:** PASS
- **Step 6.15:** PASS
- **Step 6.18:** PASS
- **Step 6.19:** PASS
- **Step 6.20:** PASS
- **Step 6.21:** PASS
- **Step 6.22:** PASS
- **Step 6.23:** PASS
- **Step 6.24:** PASS
- **Step 6.25:** PASS
- **Step 6.26:** PASS
- **Step 6.27:** PASS
- **Step 6.27.2:** PASS
- **Step 6.28:** PASS
- **Step 6.29:** PASS
- **Step 6.30:** PASS
- **Step 6.31:** PASS
- **Step 6.32:** PASS
- **Step 6.33:** PASS (เปิด Google Sheets Demo Mode)
- **Step 6.34 (DEN-004 LINE Notification Test):** PASS (SENT: LINE Messaging API ตอบกลับ 200 OK สำเร็จ)
- **Step 7.2 (LIFF Booking Integration):** PASS
- **FINAL MOCKUP MODE:** PASS (Home, Booking, Tracking, Admin/Login เปิดและทำงานได้ปกติ)
- **Step 2.1 (Google Sheets Medical Rights - Col L):** PASS (รองรับสิทธิการรักษา บัตรทอง, ประกันสังคม, ข้าราชการ, ชำระเอง, ไม่แน่ใจ โดยไม่กระทบแถวเดิม A-K)
- **Step 2.2 (Morning Quota - Max 6 Bookings):** PASS (จำกัดคิวรอบเช้ารวมทุกบริการสูงสุด 6 คิว รอบบ่ายคงเดิม CANCELLED/REJECTED ไม่นับ Active)
- **Step 2.3 (Booking API LINE-First & Quota Guard):** PASS (บังคับ LINE ID Token, Zero-Trust, เบอร์โทร Optional, สิทธิการรักษา Col L, ปฏิเสธเคสฉุกเฉินออนไลน์, โควตารอบเช้า 6 คิวใน Mutex)
- **Step 2.4 (LINE-First Booking Frontend):** PASS (บังคับ LINE Login/LIFF ไม่มี Guest Mode, แสดงโปรไฟล์ LINE อัตโนมัติ, เลือกสิทธิการรักษา 5 แบบ, เบอร์โทร Optional, ตัดช่องบัตรประชาชน/HN, ตัดตัวเลือกปิดแจ้งเตือน LINE, ตัดตัวเลือกจองฉุกเฉิน, แสดงคำแนะนำปวดฟัน Walk-in และ Red-Flag อาการวิกฤต 1669, แสดง Digital Ticket สถานะ PENDING)
- **Step 2.5 (LINE-First Tracking):** PASS (เข้าสู่ระบบ LINE ดึงคิวของตนเองอัตโนมัติไม่ต้องกรอกเบอร์/รหัสคิว, ตรวจสอบ ID Token ฝั่ง Server, ค้นหา Google Sheets ด้วย verified lineUserId, แยกความเป็นส่วนตัว User A ไม่เห็นคิว User B, รองรับสถานะ PENDING/CONFIRMED/REJECTED/CANCELLED, REJECTED แสดง 'ไม่อนุมัติการจอง' พร้อมเหตุผล, แสดง Empty State เมื่อไม่มีคิว)
- **Step 2.5.1 (Tracking Auth Security Fix):** PASS (ยกเลิกการรับ Token ผ่าน URL Query Parameter, บังคับ Authorization: Bearer <token> ผ่าน Header, ทุก Action ตรวจสอบความเป็นเจ้าของคิวผ่าน LINE ID Token, ป้องกัน User A เข้าถึงหรือแก้ไขคิวของ User B, 401 เมื่อไม่มี Token หรือ Token ไม่ถูกต้อง)
- **Step 2.6 (Automatic LINE Notifications):** PASS (รองรับการแจ้งเตือนอัตโนมัติครบ 4 เหตุการณ์: 1. สร้างคำขอสำเร็จ PENDING ระบุรอเจ้าหน้าที่ตรวจสอบ, 2. Admin อนุมัติ CONFIRMED, 3. Admin ปฏิเสธ REJECTED ไม่สร้างเหตุผลสมมติ, 4. เตือนก่อนวันนัด Advance Reminder, ป้องกันส่งซ้ำ DUPLICATE_STATUS, ไม่ใส่ข้อมูลสุขภาพในข้อความ, LINE API ล้มเหลวไม่ทำให้การบันทึกคิวล้มเหลว)
- **Step 2.7.1 (Rejection Reason Backend):** PASS (รองรับ Col M rejection_reason ใน Google Sheets A:M โดยไม่กระทบข้อมูลเดิม A-L, แถวเก่าไม่มี Col M อ่านได้ค่าว่างตามปกติ, Status API บังคับ rejectReason เมื่อ status == REJECTED [400 Bad Request หากว่าง], บันทึกเหตุผลจริงลง Sheets/DB ก่อนส่ง LINE Notification, LINE Flex แสดงเหตุผลจริงของเจ้าหน้าที่โดยไม่คิดเหตุผลสมมติ, Tracking API คืนค่า rejectReason จริงแก่เจ้าของคิว Zero-Trust, Prisma SQLite schema รองรับ rejectReason อยู่แล้วไม่ต้อง migration ซ้ำซ้อน, โควตารอบเช้า 6 คิวและการคืนโควตาเมื่อ REJECTED ทำงานถูกต้อง)
- **Step 2.7.2 (Admin & Tracking Frontend):** PASS (Admin Dashboard แสดงรายการจองทั้งหมด date=ALL หรือเลือกวันที่, ค้นหาตามรหัสคิว ชื่อโปรไฟล์ LINE และเบอร์โทร, กรองสถานะ รอบเช้า/บ่าย สาเหตุการมา และสิทธิการรักษา, แสดงคอลัมน์สิทธิการรักษาในตาราง, แสดงสถานะ REJECTED พร้อมเหตุผลจริง, Admin Reject Flow มีปุ่มไม่อนุมัติ เปิด Dialog มีเหตุผลสำเร็จรูปและพิมพ์เอง บังคับเหตุผลไม่ว่างและไม่เกิน 500 ตัวอักษร ป้องกันกดส่งซ้ำ isSubmittingReject ไม่แสดงสำเร็จก่อน Backend ยืนยัน, Tracking UI แสดงเหตุผลจริงเมื่อ REJECTED หากไม่มีเหตุผลแสดงเพียงไม่อนุมัติการจองไม่สร้างข้อความสมมติ มีปุ่มจองคิวใหม่เชื่อมไป /book แสดงเฉพาะบัญชี LINE ที่ยืนยันตัวตน, ตรวจสิทธิ์ Admin ฝั่ง Server)
- **Step V1.1 (Synthetic Demo Data for Vercel Mockup):** PASS (สร้างโมดูล src/lib/demo-data.ts แยกจากข้อมูลผู้ป่วยจริง 100%, มีคิวจำลอง 8 รายการครบทุกสถานะ PENDING/CONFIRMED/CHECKED_IN/IN_PROGRESS/COMPLETED/REJECTED, ครบ 5 สิทธิการรักษา บัตรทอง/ประกันสังคม/ข้าราชการ/ชำระเอง/ไม่แน่ใจ, ปฏิบัติตามกฎโควตารอบเช้า Active <= 6 คิว [จริง 4 คิว], คิว REJECTED DEN-005 มีเหตุผลจริงของเจ้าหน้าที่, ผูกบัญชีจำลอง DEMO_MOCK_USER สำหรับทดสอบ Tracking UI, มีฟังก์ชัน getDemoSlots และ getDemoKPIs คำนวณถูกต้องตาม Interface เดิม ไม่ใช้ In-memory State ข้ามเซิร์ฟเวอร์เลส)
- **Step V1.2 (Safe Demo API Isolation):** PASS (เปิด/ปิดผ่าน DEMO_MODE=true Server-side Feature Flag, ทุกเส้นทาง API [Booking, Slots, Services, Tracking, Admin, Status, KPIs, Tracking Action, LINE Webhook, Cron] ใช้เฉพาะ Synthetic Data หรือถูกปิดการทำงานอย่างปลอดภัย ไม่เรียก Google Sheets/Prisma/SQLite จริง, ปิดการส่ง LINE Push/Reply API จริงใน Demo Mode, ปิดการเขียนฐานข้อมูลและ Google Sheets จริง 100%, Status API ไม่บันทึกถาวร, ปฏิเสธเคส Emergency และ API ทดสอบด้วย 403 Forbidden, เมื่อ DEMO_MODE=false พฤติกรรมเดิมทำงานได้ 100% ตามปกติ Regression Suites ผ่านทั้งหมด)
- **Step V1.3 (Safe Demo Frontend UX):** PASS (แสดง Top Banner โหมดสาธิตผ่าน NEXT_PUBLIC_DEMO_MODE=true ใน Root Layout, หน้า /book และ /tracking มีปุ่ม 'ทดลองใช้งานด้วยบัญชีจำลอง' สำหรับ Browser โดยใช้ DEMO_MOCK_USER ไม่ปะปนกับ LINE Login จริง, แสดง Digital Ticket สถานะ PENDING พร้อมป้ายคิวจำลองไม่บันทึกถาวร, หน้า Tracking แสดง 3 สถานะตัวอย่าง PENDING/CONFIRMED/REJECTED พร้อมเหตุผลจริงและปุ่มจองคิวใหม่, หน้า Login มีปุ่ม 'เข้าชมแดชบอร์ดสาธิต' 1-Click สำหรับผู้ตรวจงาน, หน้า Admin แสดงป้ายเตือนการสาธิตอย่างชัดเจน ไม่ส่งข้อความ LINE จริงและไม่บันทึกข้อมูลถาวร, ฟอนต์ Noto Sans Thai และ UX/UI เดิมคงเดิม 100%)
- **Step V1.4 (Vercel Build & Security Readiness):** PASS (Next.js Production Build สำเร็จครบ 16 หน้า, TypeScript 0 errors, ตรวจสอบ Git Status และ .gitignore ปลอดภัย 100% ไม่มี .env, Service Account JSON หรือไฟล์ Database ถูกติดตามใน Git, แยกระบบ Demo Mode สมบูรณ์ [Air-Gapped], หน้าและ API ทุกเส้นทางพร้อมสำหรับ Vercel Serverless Statelessness)
- **Step UI 1 (Fix Broken Styling & Noto Sans Thai Font):** PASS (แก้ไขการเชื่อมโยงฟอนต์ Noto Sans Thai และ Sarabun ใน src/app/layout.tsx, src/app/globals.css และ tailwind.config.ts, เพิ่ม Google Fonts preconnect และ stylesheet link ใน RootLayout, ตั้งค่า body font-sans และ fallback font stack ครบถ้วน, Next.js build ผ่าน 100% สร้าง CSS bundle ขนาด ~48.9 KB พร้อมคลาส Tailwind utility ครบถ้วน, หน้า Home, Booking, Tracking และ Admin แสดงผลถูกต้องตามดีไซน์เดิม 0 TypeScript errors)

---

## 5. ตัวแปร Environment Variables (`.env`) ที่จำเป็น
*(ระบุเฉพาะชื่อตัวแปร ห้ามบันทึกค่าหรือ Secret)*
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_DUAL_WRITE_ENABLED` (ค่าเริ่มต้น: ปิดใช้งาน)
- `BOOKING_STORAGE` (ค่าเริ่มต้น: `sqlite`, ตัวเลือก: `sqlite` | `sheets`)
- `DATABASE_URL`
- `NODE_ENV`
- `NEXT_PUBLIC_LIFF_ID` (สำหรับระบบ LIFF หน้าจองคิว)
- `LINE_LOGIN_CHANNEL_ID` (ตัวเลือกเพิ่มเติม: สำหรับระบุ Channel ID แยกจาก LIFF ID)

### สำหรับการ Deploy บน Vercel ในโหมดสาธิต (Demo Mockup):
- `DEMO_MODE=true`
- `NEXT_PUBLIC_DEMO_MODE=true`
*(ไม่ต้องใส่ Credential หรือ Secret ของ Google Sheets และ LINE บน Vercel ในโหมดนี้)*
- `LINE_LOGIN_CHANNEL_ID` (ตัวเลือกเพิ่มเติม: สำหรับระบุ Channel ID แยกจาก LIFF ID)

---

## 6. ข้อควรระวังด้านความปลอดภัย
1. **ห้ามนำไฟล์ Service Account JSON ขึ้น GitHub โดยเด็ดขาด** (ต้องตรวจสอบว่าอยู่ใน `.gitignore`)
2. **API ทดสอบ (`/api/test-sheets`) เปิดให้ใช้งานเฉพาะ Development mode เท่านั้น** (ระบบจะปฏิเสธการเข้าถึงใน Production mode)

---

## 7. วิธีการเปิด/ปิด Feature Flag (Google Sheets Dual-Write)
ควบคุมผ่านตัวแปร `GOOGLE_SHEETS_DUAL_WRITE_ENABLED`:
- **ปิดการทำงาน (Default):** ไม่ระบุ หรือตั้งเป็น `GOOGLE_SHEETS_DUAL_WRITE_ENABLED=false` (Booking API ทำงานผ่าน Prisma/SQLite ตามเดิม 100%)
- **เปิดการทำงาน:** ตั้งเป็น `GOOGLE_SHEETS_DUAL_WRITE_ENABLED=true` (Booking API จะบันทึกลง Prisma สำเร็จแล้วจึงสำเนาข้อมูล A–J ลง Google Sheets)

---

## 8. วิธีการเปิด/ปิดโหมดแหล่งข้อมูลการจอง (BOOKING_STORAGE)
ควบคุมผ่านตัวแปร `BOOKING_STORAGE` ในไฟล์ `.env`:
- **โหมด SQLite (Default / Rollback):**
  ตั้งค่า `BOOKING_STORAGE=sqlite` หรือไม่ต้องระบุตัวแปรนี้
  ระบบจะบันทึกและจัดการการจองผ่าน SQLite (Prisma) 100%
- **โหมด Google Sheets (Demo Mode):**
  ตั้งค่า `BOOKING_STORAGE=sheets`
  ระบบจะใช้ Google Sheets เป็นแหล่งข้อมูลหลักเพียงแหล่งเดียวสำหรับ:
  - การนับโควตาและแสดงสล็อตว่าง (`/api/slots`)
  - การจองคิวใหม่ (`POST /api/bookings`)
  - การติดตามสถานะคิว (`/api/tracking`, `/api/bookings`)
  - การยืนยันตัวตนและการเปลี่ยนสถานะของคนไข้ (`/api/tracking/action`)
  - การจัดการคิวของผู้ดูแลระบบ (`/api/bookings/[id]/status`, `/api/admin/kpis`)
  - การยืนยันนัดผ่าน LINE Webhook (`/api/line/webhook`)
  - การแจ้งเตือนนัดหมายล่วงหน้าผ่าน Cron (`/api/cron/reminders`)

*หมายเหตุ:* หลังเปลี่ยนค่าใน `.env` ต้องรีสตาร์ต Next.js Dev Server เสมอ (`npm run dev`)
