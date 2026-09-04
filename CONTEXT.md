# Project Context — calenda-day-price

อัปเดตล่าสุด: 2026-09-04

## สถานะปัจจุบัน

โปรเจกต์เป็น demo สำหรับจัดการราคาสุทธิรายวันของบ้านพัก โดยเวอร์ชันแรกมี UI สำหรับบ้านพักหนึ่งหลังจาก seed แต่ data model รองรับหลายบ้านพักตั้งแต่ต้น ไม่มี login, role, permission หรือ audit log จึงห้าม deploy เปิดสาธารณะหรือใช้กับข้อมูลจริงก่อนเพิ่มมาตรการความปลอดภัย

## เทคโนโลยีที่ใช้

| ส่วน | รายละเอียด |
| --- | --- |
| Web framework | Next.js 16.3.4, App Router และ Route Handler |
| UI | React 19.2.8, Tailwind CSS 4, Base UI, shadcn และ Lucide |
| ภาษา | TypeScript (strict) |
| Validation / test | Zod, Vitest, Testing Library และ jsdom |
| Backend platform | Supabase ผ่าน `@supabase/ssr` และ `@supabase/supabase-js` |
| Timezone สำหรับผู้ใช้ | `Asia/Bangkok` |

## Daily pricing model

- ราคาปกติเป็น constant `BASE_DAILY_PRICE = 1500` (฿1,500) ใน `server/types/pricing.ts` และไม่มีหน้าให้ตั้งค่า
- ตาราง `daily_price` เป็น sparse model: บันทึกเฉพาะวันที่มีสถานะพิเศษ; วันที่ไม่มี row ใช้ราคาปกติ
- หนึ่งวันต่อหนึ่งบ้านพักมีได้เพียงหนึ่งสถานะ จาก `unique(property_id, date)` จึงไม่มีสถานะซ้อนกัน
- สถานะที่รองรับ: `holiday`, `promotion`, `hot_deal`, `holiday_hot_deal`
- `net_price` เป็นจำนวนเงินบาทเต็มบวก และ `description` เป็นข้อความหมายเหตุของวันนั้น; การตั้งช่วงวันจะคัดลอกข้อมูลเดียวกันไปยังแต่ละวัน
- การลบ override ทำให้วันนั้นกลับไปใช้ราคาปกติ ฿1,500

## Schema และ seed ของ Supabase

- migration ที่เขียนไว้: `supabase/migrations/202609040001_create_pricing_tables.sql`
  - `properties`: บ้านพัก
  - `daily_price`: ราคาพิเศษรายวัน พร้อม foreign key ไป `properties`, check constraint ของสถานะ/ราคา และ unique ต่อบ้านพัก-วัน
- seed ที่เขียนไว้: `supabase/seed.sql` สร้าง “บ้านพักตัวอย่าง” เมื่อยังไม่มีบ้านพัก
- **สถานะ: migration และ seed ยังไม่ได้ apply กับ Supabase** ตามขอบเขตงานนี้ ต้องให้ผู้ใช้รันผ่าน workflow ของ Supabase ที่ต้องการก่อนใช้งานจริง
- ห้ามใส่ค่า environment variable หรือ credential ในเอกสารและ commit

## Architecture

```text
Calendar UI
→ fetch('/api/...')
→ Next.js Route Handler
→ Zod validation
→ pricing service
→ repository
→ Supabase
```

- UI อยู่ใน `components/pricing/` และไม่ query ฐานข้อมูลโดยตรง
- business rule อยู่ใน `server/services/pricing-service.ts`
- repository อ่าน/เขียน Supabase เท่านั้น อยู่ใน `server/repositories/`
- browser และ server ใช้ Supabase client จาก `lib/client.ts` และ `lib/server.ts` ตามลำดับ

## REST API

```text
GET    /api/properties
GET    /api/properties/:propertyId/daily-prices?from=&to=
POST   /api/properties/:propertyId/daily-prices/conflicts
PUT    /api/properties/:propertyId/daily-prices/range
DELETE /api/properties/:propertyId/daily-prices?from=&to=
```

- `POST /conflicts` ตรวจวันที่ชนโดยไม่เปลี่ยนข้อมูล
- `PUT /range` จะตอบ `CONFLICT` ก่อนเมื่อพบวันเดิม และเขียนทับหลัง client ส่ง `confirmOverwrite: true`
- ทุก endpoint validate `propertyId`, ช่วงวัน, สถานะ และราคา; error code คือ `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `INTERNAL_ERROR`

## UI และการใช้งาน

- หน้าหลักคือ calendar รายเดือน พร้อม Cell Inspector บน desktop และ bottom sheet บน mobile
- เลือกวันหนึ่งครั้งเพื่อเริ่มช่วง แล้วเลือกวันถัดไปเพื่อขยายช่วง
- ปฏิทินใช้สีและ icon ตามสถานะ: วันหยุดพื้นเหลือง, โปรไฟลุกใช้ไฟ, โปรไฟลุกในวันหยุดมีทั้งพื้นเหลืองและไฟ, โปรโมชั่นใช้สัญลักษณ์แท็ก
- UI ต้องยึด layout และ design system จาก Stitch project `Calendar Pricing Day Cell` เป็น reference ไม่ออกแบบ visual system ใหม่เอง
- การบันทึกซ้ำถูกป้องกันด้วย loading state; การลบถามยืนยันก่อนเสมอ

## ข้อจำกัดและงานต่อไป

1. Apply migration และ seed ใน Supabase ก่อนทดสอบกับข้อมูลจริง
2. เพิ่ม RLS, authentication และ authorization ฝั่ง server ก่อนเปิดให้ผู้ใช้จริงใช้งาน
3. เมื่อมีหลายผู้ใช้หรือหลายองค์กร ให้เพิ่ม tenant/data scope และ policy ที่ชัดเจน
4. ตรวจ flow ของ `lib/middleware.ts` อีกครั้งเมื่อเริ่มทำ auth เพราะ demo ปัจจุบันไม่มี auth flow ใน UI
