# Hot Deal แบบแยกจากราคาพิเศษ — Design Spec

## เป้าหมาย

แยก Hot Deal ออกจากสถานะของ `daily_price` เพื่อให้ Hot Deal มีราคาของตัวเอง ตั้งค่าเป็นช่วงวันได้ และทับราคาปกติหรือราคาพิเศษเดิมได้เมื่อถึงช่วงเวลาแสดงที่กำหนดรายวัน

## ขอบเขตที่อนุมัติ

- แก้ migration `202609040001_create_pricing_tables.sql` ได้ เพราะยังไม่เคย apply กับ Supabase
- ตัด `hot_deal` และ `holiday_hot_deal` ออกจาก `daily_price.status_type` เหลือ `holiday` และ `promotion`
- Hot Deal มี `net_price` ของตัวเอง และชนะราคาจาก `daily_price` หรือราคาปกติเมื่อเข้าเงื่อนไขแสดง
- ตั้ง Hot Deal เป็นช่วงวันได้ แต่เก็บหนึ่งแถวต่อหนึ่งวันเพื่อให้ตรวจวันชนและการลบแบบช่วงทำได้ชัดเจน
- หนึ่งบ้านพักมี Hot Deal ได้สูงสุดหนึ่งรายการต่อวัน การบันทึกช่วงที่ชนต้องแจ้งวันชนและให้ยืนยันก่อนเขียนทับ
- Hot Deal ไม่ถือว่าชนกับ `daily_price` เพราะออกแบบมาให้ซ้อนทับกันได้
- ไม่สร้างหน้าใหม่ ใช้ Calendar และ Cell Inspector เดิม

## โมเดลข้อมูล

### `daily_price`

คงหน้าที่เป็นราคา/สถานะพื้นฐานรายวัน:

```text
status_type ∈ { holiday, promotion }
```

ยังเป็น sparse model: วันที่ไม่มีแถวใช้ `BASE_DAILY_PRICE`

### `hot_deals`

```sql
create table public.hot_deals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  date date not null,
  net_price integer not null check (net_price > 0),
  show_before_days integer not null check (show_before_days >= 0 and show_before_days <= 365),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, date)
);
```

ข้อจำกัด `unique(property_id, date)` ใช้เป็น index สำหรับทั้งการค้นหา Hot Deal ของบ้านพักในช่วงวันและรองรับ foreign key cascade ที่ `property_id`.

การเลือกช่วงวันใน UI จะขยายเป็นแถวต่อวัน เช่น 20–25 ธ.ค. สร้าง 6 แถวโดยใช้ราคา, จำนวนวันล่วงหน้า และรายละเอียดเดียวกัน. การแก้ภายหลังทำผ่านช่วงที่ผู้ใช้เลือก ไม่เพิ่ม entity ระดับ campaign ที่ยังไม่มีความต้องการ.

## กฎแสดงผล

ปัจจุบันระบบมีเฉพาะหน้าจัดการราคา ดังนั้นทุกวันที่มี record ใน `hot_deals` ต้องแสดงเป็น Hot Deal ทันที โดยไม่พิจารณา `show_before_days`.

เมื่อมี Hot Deal:

- ราคาในปฏิทินเป็น `hot_deals.net_price`
- แสดงเครื่องหมาย `🔥`
- คงภาพของสถานะเดิม: Holiday ยังคงพื้นเหลือง; Promotion ยังคงเครื่องหมาย `✦`
- ถ้าไม่มี Holiday หรือ Promotion ให้แสดงรูปแบบ Hot Deal เดี่ยว

`show_before_days` ยังคงบันทึกไว้ในข้อมูล เพื่อใช้กำหนดช่วงเผยแพร่เมื่อมี public booking flow ในอนาคต; flow นั้นยังไม่อยู่ในขอบเขตของระบบปัจจุบัน.

## API และชั้นระบบ

เพิ่ม API Hot Deal แยกจาก Daily Price โดยใช้รูปแบบเดียวกับของเดิม:

```text
GET    /api/properties/:propertyId/calendar-prices?from=&to=
POST   /api/properties/:propertyId/hot-deals/conflicts
PUT    /api/properties/:propertyId/hot-deals/range
DELETE /api/properties/:propertyId/hot-deals?from=&to=
```

`GET /calendar-prices` ทำงานใน service ฝั่ง server: อ่าน `daily_price` กับ `hot_deals` แล้วคืน display model สำหรับหน้าจัดการต่อวัน ซึ่งมีราคาที่ใช้แสดง, สถานะพื้นฐาน และ flag Hot Deal. UI จึงไม่ต้องมี business rule การตัดสินราคา.

`POST /hot-deals/conflicts` และ `PUT /hot-deals/range` ตรวจเฉพาะ `hot_deals`. `PUT` จะตอบ `CONFLICT` พร้อมรายการวันที่เมื่อยังไม่ได้ยืนยัน และจะ upsert เฉพาะหลัง `confirmOverwrite: true`.

ทุก mutation validate `propertyId`, ISO date range, ราคาเต็มบวก, `showBeforeDays` เป็นจำนวนเต็มช่วง 0–365 และ `description` ความยาวไม่เกิน 1,000 ตัวอักษร. API ไม่รับหรือเชื่อขอบเขตข้อมูลจาก client นอกจาก `propertyId` ใน path ที่ตรวจซ้ำฝั่ง server.

## UI

ใน Cell Inspector เดิมเพิ่มตัวสลับโหมด:

- `ราคาพิเศษ`: ใช้กับ Holiday และ Promotion เท่านั้น
- `🔥 Hot Deal`: ใช้กับ Hot Deal และมีฟิลด์ ราคา Hot Deal, แสดงล่วงหน้ากี่วัน, รายละเอียด

ทั้งสองโหมดใช้การเลือกวัน/ช่วงวันเดียวกัน. ปุ่มบันทึกและลบใน Hot Deal mode เรียก API ของ Hot Deal เท่านั้น จึงไม่กระทบ Holiday หรือ Promotion ที่อยู่บนวันเดียวกัน.

## ข้อผิดพลาดและความปลอดภัย

- ส่งเฉพาะ error code ที่มีอยู่ (`VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `INTERNAL_ERROR`) ไม่เปิดเผย SQL error หรือ stack trace
- รักษา confirmation ก่อนเขียนทับ และ confirmation ก่อนลบ
- สถานะปัจจุบันของโปรเจกต์ยังไม่มี authentication/RLS policy ที่ใช้งานจริง; ห้ามเปิดใช้กับผู้ใช้จริงจนกว่า auth และ RLS ที่ระบุใน `CONTEXT.md` จะพร้อม. ไม่เพิ่ม anonymous policy เพื่อให้การใช้งาน demo สะดวก เพราะจะทำให้ข้อมูลเปิดกว้าง

## การทดสอบ

- unit test: วันที่ Hot Deal active แยกทีละวันตาม `show_before_days`, วันที่ยังไม่ถึงเวลา และวันหมดอายุ
- unit test: ราคา Hot Deal ชนะราคาปกติ, Holiday และ Promotion โดยยังส่ง visual state พื้นฐานเดิม
- service/route test: validate input, conflict, confirm overwrite, delete เฉพาะ Hot Deal
- component test: mode selector, ฟิลด์ Hot Deal, และ cell ที่เป็น Holiday + Hot Deal แสดงพื้นเหลืองกับ `🔥`
- verification ก่อนส่งงาน: test ที่เกี่ยวข้อง, `npm run lint`, `npm run build`, ตรวจ diff และอัปเดต `CONTEXT.md`
