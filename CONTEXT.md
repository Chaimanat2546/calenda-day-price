# Project Context — calenda-day-price

อัปเดตล่าสุด: 2026-09-04

## สถานะปัจจุบัน

โปรเจกต์อยู่ในระยะเริ่มต้นจาก Create Next App และยังไม่มีการกำหนด business domain, data model หรือ user flow หลักไว้ใน repository อย่างชัดเจน

## เทคโนโลยีที่ยืนยันแล้ว

| ส่วน | รายละเอียด |
| --- | --- |
| Web framework | Next.js 16.3.4, App Router |
| UI | React 19.2.8, Tailwind CSS 4, Base UI, shadcn และ Lucide |
| ภาษา | TypeScript (strict) |
| Backend platform | Supabase ผ่าน `@supabase/ssr` และ `@supabase/supabase-js` |
| Timezone สำหรับผู้ใช้หลัก | `Asia/Bangkok` |

## การตั้งค่า Supabase ที่มีแล้ว

- `.env` เก็บ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ห้ามเปิดเผยค่าในเอกสารหรือ commit)
- `lib/client.ts` สร้าง browser client
- `lib/server.ts` สร้าง server client ที่อ่าน/เขียน session cookie
- `lib/middleware.ts` มี `updateSession(request)` เพื่อ refresh session และ redirect ผู้ใช้ที่ยังไม่ยืนยันตัวตนไป `/auth/login`

ข้อควรระวัง: ปัจจุบันยังไม่พบหน้า auth ใน `app/` หรือ entry point ของ Next.js ที่เรียก `updateSession()` โดยตรง จึงต้องตรวจและทำ auth flow ให้ครบก่อนถือว่า protected route ใช้งานได้จริง

## หลักการตัดสินใจสำหรับงานถัดไป

1. เริ่มจากกำหนด requirement, ผู้ใช้เป้าหมาย และ flow หลัก ก่อนออกแบบตารางหรือหน้า UI จำนวนมาก
2. ใช้ Server Action สำหรับ mutation ภายในเว็บ; เปิด Route Handler เฉพาะเมื่อมี external consumer ที่ชัดเจน
3. วาง authorization และ Supabase RLS พร้อม schema ของข้อมูลตั้งแต่ feature แรกที่มีข้อมูลผู้ใช้
4. แยก business rule ออกจาก component และ query โดยใช้ service/repository เมื่อ data flow เริ่มซับซ้อน
5. ใช้ UTC ในข้อมูลที่เก็บ และแปลงเป็น `Asia/Bangkok` ตอนแสดงผลเป็นค่าเริ่มต้น

## สิ่งที่ยังไม่ยืนยัน

- รูปแบบการยืนยันตัวตนและ roles/permissions
- Supabase schema, migrations, RLS policies และ Storage buckets
- ผู้ใช้หลายองค์กร (multi-tenant) หรือขอบเขตข้อมูลที่ต้องแยก
- รูปแบบ deployment: local, staging และ production
- monitoring, audit log และ test suite

เมื่อข้อใดตัดสินใจแล้ว ให้บันทึกผลและเหตุผลสั้น ๆ เพิ่มในไฟล์นี้ เพื่อให้การพัฒนาครั้งถัดไปต่อเนื่องกัน.
