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
- `daily_price` มีสถานะฐานได้เพียงหนึ่งรายการต่อบ้านพักต่อวัน จาก `unique(property_id, date)` แต่ Hot Deal เป็น record แยกและสามารถ overlay บนสถานะฐานของวันเดียวกันได้
- `daily_price` รองรับเฉพาะสถานะฐาน `holiday` และ `promotion`; `net_price` เป็นจำนวนเงินบาทเต็มบวก และ `description` เป็นข้อความหมายเหตุของวันนั้น
- Hot Deal อยู่ในตาราง `hot_deals` แยกจาก Daily Price โดยมีราคา, จำนวนวันแสดงล่วงหน้า (`show_before_days`), หมายเหตุ และ `unique(property_id, date)` จึงมีได้หนึ่งดีลต่อบ้านพักต่อวัน
- ฟอร์ม Hot Deal เลือกระยะเวลาแสดงล่วงหน้าเป็นรายวัน (0–365 วัน) หรือรายเดือน (0–12 เดือน) ได้ โดย 1 เดือน = 30 วัน และส่ง API เป็นจำนวนวันตามเดิม; การสลับเป็นรายเดือนปัดขึ้นเป็นเดือนเต็มและจำกัดที่ 12 เดือน
- การตั้ง Daily Price เป็นช่วงวันจะคัดลอกสถานะ, ราคา และหมายเหตุเดียวกันไปยังแต่ละวัน
- การบันทึก Hot Deal แบบช่วงวันจะขยายและบันทึกค่าชุดเดียวกันลงทุกวันในช่วงที่เลือก โดยตรวจวันชนก่อนและต้องยืนยันเมื่อจะเขียนทับ
- ปัจจุบัน `/calendar-prices` ใช้กับหน้าจัดการเท่านั้น: ทุกวันที่มี Hot Deal จะแสดงราคา Hot Deal และ `is_hot_deal: true` เสมอ โดยไม่พิจารณา `show_before_days`; จำนวนวันแสดงล่วงหน้าเก็บไว้สำหรับ public booking flow ในอนาคต ซึ่งยังไม่มีในระบบ
- การลบ Daily Price ทำให้วันนั้นกลับไปใช้ราคาปกติ ฿1,500 ส่วนการลบ Hot Deal จะกลับไปใช้ Daily Price ของวันนั้นเมื่อมีอยู่ มิฉะนั้นจึงใช้ราคาปกติ

## Schema และ seed ของ Supabase

- หน้าเริ่มต้นเป็น `PropertyWorkspace`: ค้นหาบ้านและกรองทำเล ก่อนเปิดปฏิทินของบ้านที่เลือก มีตัวเลือกเปลี่ยนบ้านที่คงเดือนเดิม แต่ล้างช่วงวันและ draft ผ่านการ remount ตาม property id
- การกลับรายการ/เปลี่ยนบ้านตรวจ draft ที่ยังไม่บันทึก มีตัวเลือกกลับไปบันทึก ทิ้ง หรือยกเลิก และเตือนเมื่อปิด/รีเฟรชเว็บ
- ตาราง `properties` เพิ่ม `location` และ `image_url` (nullable, HTTPS) ผ่าน `20260909050702_add_property_display_metadata.sql` ซึ่ง apply แล้วบน remote; เมื่อไม่มีรูป/ทำเลจะแสดง placeholder โดยไม่สร้าง metadata สมมติ การกรอก metadata ยังทำผ่านระบบข้อมูลเดิม

- migration ที่เขียนไว้: `supabase/migrations/202609040001_create_pricing_tables.sql`
  - `properties`: บ้านพัก
  - `daily_price`: ราคาพิเศษรายวัน พร้อม foreign key ไป `properties`, check constraint ของสถานะ/ราคา และ unique ต่อบ้านพัก-วัน
  - `hot_deals`: ดีลรายวันแยกต่างหาก พร้อม foreign key ไป `properties`, check constraint ของราคา/วันแสดงล่วงหน้า และ unique ต่อบ้านพัก-วัน
- migration สิทธิ์ Data API: `supabase/migrations/20260904095533_grant_pricing_api_access.sql`
  - grant สิทธิ์อ่าน `properties` และสิทธิ์จัดการ `daily_price`/`hot_deals` ให้ `anon`, `authenticated`
  - เปิด RLS ทั้งสามตาราง แต่ policy ปัจจุบันยังเป็น demo policy ที่อนุญาตทุกแถว เพื่อให้ UI ที่ยังไม่มี login ใช้งานได้
- seed ที่เขียนไว้: `supabase/seed.sql` สร้าง “บ้านพักตัวอย่าง” เมื่อยังไม่มีบ้านพัก
- **สถานะ local: migration ทั้งสองและ seed ถูก apply แล้ว**; การ deploy/remote ต้อง apply ผ่าน workflow ของ Supabase ที่ต้องการ
- **สถานะ remote ณ 9 กันยายน 2026:** apply migration ทั้งสองและ seed แล้วบนโปรเจกต์ `phwcjavlwnamunakxeuq` ซึ่งตรงกับ `.env.local`; migration history ตรงกับไฟล์ใน repo, ตารางทั้งสามเปิด RLS และอ่านผ่าน Publishable Key ได้ (HTTP 200) มี “บ้านพักตัวอย่าง” 1 หลังพร้อมใช้งาน ส่วนราคาเฉพาะวันและ Hot Deal ยังว่าง
- ห้ามใส่ค่า environment variable หรือ credential ในเอกสารและ commit

## Architecture

```text
Calendar UI
→ fetch('/api/...')
→ Next.js Route Handler
→ Zod validation
→ pricing-service / hot-deal-service / calendar-pricing-service
→ repository
→ Supabase
```

- UI อยู่ใน `components/pricing/` และไม่ query ฐานข้อมูลโดยตรง
- business rule อยู่ใน `server/services/pricing-service.ts`, `server/services/hot-deal-service.ts` และ `server/services/calendar-pricing-service.ts`
- repository อ่าน/เขียน Supabase เท่านั้น อยู่ใน `server/repositories/`
- browser และ server ใช้ Supabase client จาก `lib/client.ts` และ `lib/server.ts` ตามลำดับ

## REST API

```text
GET    /api/properties
GET    /api/properties/:propertyId/daily-prices?from=&to=
POST   /api/properties/:propertyId/daily-prices/conflicts
PUT    /api/properties/:propertyId/daily-prices/range
DELETE /api/properties/:propertyId/daily-prices?from=&to=
GET    /api/properties/:propertyId/calendar-prices?from=&to=
POST   /api/properties/:propertyId/hot-deals/conflicts
PUT    /api/properties/:propertyId/hot-deals/range
DELETE /api/properties/:propertyId/hot-deals?from=&to=
```

- `POST /conflicts` ตรวจวันที่ชนโดยไม่เปลี่ยนข้อมูล
- `PUT /range` จะตอบ `CONFLICT` ก่อนเมื่อพบวันเดิม และเขียนทับหลัง client ส่ง `confirmOverwrite: true`
- `GET /calendar-prices` ส่งข้อมูลปฏิทินสำหรับหน้าจัดการ รวมสถานะ Daily Price, ราคาแสดงผล และ `is_hot_deal`; ทุก record ใน `hot_deals` ของช่วงที่ขอจะแสดงเป็น Hot Deal
- Hot Deal APIs มีสัญญาเช่นเดียวกับ Daily Price ตามชนิดงาน: `POST /hot-deals/conflicts` ตรวจวันชน, `PUT /hot-deals/range` บันทึกหรือเขียนทับทั้งช่วงหลังยืนยัน, และ `DELETE /hot-deals` ลบเฉพาะ Hot Deal ในช่วงวันที่ระบุ
- ทุก endpoint validate `propertyId`, ช่วงวัน, สถานะ และราคา; error code คือ `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `INTERNAL_ERROR`

## UI และการใช้งาน

- หน้าหลักคือ calendar รายเดือน พร้อม Cell Inspector บน desktop และ bottom sheet บน mobile โดยไม่มีการสร้างหน้าใหม่
- Cell Inspector มีตัวเลือกโหมด `ราคาพิเศษ` และ `🔥 Hot Deal`: โหมดราคาพิเศษตั้งได้เฉพาะ Holiday หรือ Promotion ส่วนโหมด Hot Deal ตั้งราคา, จำนวนวันแสดงล่วงหน้า และหมายเหตุแยกกัน
- เลือกวันหนึ่งครั้งเพื่อเริ่มช่วง แล้วเลือกวันถัดไปเพื่อขยายช่วง
- ปฏิทินจัดลำดับ visual ของสถานะดังนี้: `Holiday + Hot Deal` คงพื้นเหลืองและเพิ่ม `🔥`; `Promotion + Hot Deal` แสดงเป็น Hot Deal เท่านั้นโดยซ่อนพื้น/สัญลักษณ์ Promotion; Hot Deal ใช้ราคา Hot Deal เสมอ. ทุก Holiday ซ่อนราคาอ้างอิง ฿1,500 ใน cell
- UI ต้องยึด layout และ design system จาก Stitch project `Calendar Pricing Day Cell` เป็น reference ไม่ออกแบบ visual system ใหม่เอง
- การบันทึกซ้ำถูกป้องกันด้วย loading state; การลบถามยืนยันก่อนเสมอ

## ข้อจำกัดและงานต่อไป

1. แทนที่ demo RLS policy ด้วย authentication, tenant/data scope และ ownership predicate ก่อนเปิดให้ผู้ใช้จริงใช้งาน
2. Apply migration ทั้งสองกับ Supabase remote ผ่าน workflow ที่ต้องการก่อนใช้งานจริง
3. ตรวจ flow ของ `lib/middleware.ts` อีกครั้งเมื่อเริ่มทำ auth เพราะ demo ปัจจุบันไม่มี auth flow ใน UI
# หน้าสำหรับลูกค้า

- `/stay` แสดงรายชื่อบ้านพร้อมค้นหาและกรองทำเล; `/stay/[propertyId]?month=YYYY-MM` แสดงปฏิทินราคาแบบอ่านอย่างเดียวและรายละเอียดเมื่อเลือกวัน
- `public-pricing-service.ts` อ่านข้อมูลผ่าน repository และคำนวณวันปัจจุบันตาม Asia/Bangkok บน server
- โปรไฟลุกแสดงเมื่อวันปัจจุบันอยู่ระหว่าง `date - show_before_days` และ `date` (รวมทั้งสองวัน) ก่อนส่งข้อมูลเข้า client; นอกช่วงใช้ daily price หรือราคาปกติเดิม
- หน้าจัดการยังเห็นโปรที่ตั้งไว้ทั้งหมดตามเดิม; ระบบนี้ยังใช้สิทธิ์ demo เดิม หน้าลูกค้าไม่ใช่การเพิ่ม authentication หรือปิด management API
- ปฏิทินแสดงราคา ไม่ได้แสดงสถานะห้องว่างหรือรับจอง
