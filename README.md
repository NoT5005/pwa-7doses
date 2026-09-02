# 7Doses (ยาเจ็ดเม็ด) — บันทึกการปฏิบัติธรรม

**7Doses (ยา 7 เม็ด)** คือ Progressive Web App (PWA) สำหรับบันทึกและติดตามการปฏิบัติธรรม 7 ขั้นตอน ออกแบบโดยเน้นความสงบ เรียบง่าย และเป็นมิตรกับผู้สูงอายุ (Senior-Friendly)

![7Doses Logo](/logo.jpg)

---

## 🌸 คุณสมบัติเด่น (Key Features)

1. **โครงสร้าง 3 ระดับตาม Revision V2**:
   - **Level 1 (Master Steps)**: 7 ขั้นตอนหลักตามคำสอน
   - **Level 2 (Practice Summaries)**: `ผู้ปฏิบัติ + ขั้นตอน + รอบที่` (เช่น ขั้น 1 รอบ 2) พร้อมสถานะ (กำลังปฏิบัติ, พักไว้, เสร็จสิ้น) และเวลายกมา (Carried Duration)
   - **Level 3 (Practice Sessions)**: บันทึกการปฏิบัติ (Transactions) ผูกตรงกับ Practice Summary สามารถปฏิบัติได้หลายขั้นตอนในวันเดียวกัน
2. **ระบบค้นหาขั้นตอนปัจจุบัน (Current Practice)**:
   - กรองเฉพาะที่ `status = 'active'` และเลือก record ที่มี `id` สูงสุด
3. **ระบบตัวจับเวลาสติ (Mindful Timer)**:
   - **จับเวลาเดินหน้า (Count-Up)**: เสียงระฆัง "ติ๊ง" กังวานทุก 10 นาที (Web Audio API Synthesizer)
   - **นับเวลาถอยหลัง (Count-Down)**: ตั้งเวลาตามต้องการ พร้อมเสียงเตือนเมื่อครบเวลา
   - ทำงานบน Timestamp เสมอ ไม่หลุดเวลาแม้ล็อคหน้าจอ สลับแอป หรือปิด PWA
4. **Dashboard & สถิติความเพียร**:
   - Donut Chart แสดงจำนวนวันที่ปฏิบัติเทียบกับวันที่ไม่ได้ปฏิบัติ
   - 4 ตัวชี้วัดสำคัญ (วันที่ปฏิบัติ, เวลารวมช่วงนี้, เฉลี่ยต่อวันปฏิบัติ, รวมทั้งหมดพร้อมเวลายกมา)
   - การประเมินคะแนนความเพียร (จำนวนวัน 50% + ระยะเวลา 50%) พร้อมระดับดาว ★★★★
5. **Senior-Friendly UX/UI**:
   - ปุ่มและตัวอักษรขนาดใหญ่ ($\ge 48\text{px}$)
   - ธีมสีสงบ (Sage Green, Linen Warm White, Lotus Gold) สบายตา
   - รองรับการติดตั้งแบบ PWA บน iPhone (Add to Home Screen) และ Android

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security RLS, Supabase Auth)
- **Audio Engine**: Web Audio API Sound Synthesizer (No external audio file dependency)
- **Testing**: Vitest & Node.js Native Runner

---

## 🚀 การติดตั้งและเริ่มใช้งาน

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. รันทดสอบ Business Logic
npm run test

# 3. รัน Development Server
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## 🗄️ Database Setup (Supabase)

คัดลอกไฟล์ SQL ใน `supabase/migrations/01_schema.sql` ไปรันใน Supabase SQL Editor เพื่อสร้างตารางและ RLS Policies
