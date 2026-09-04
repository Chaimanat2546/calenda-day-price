# Daily Pricing Calendar — Design

## เป้าหมาย

ระบบตั้งราคาบ้านพักรายวันสำหรับหลายบ้านพักในอนาคต โดยเวอร์ชันแรก seed บ้านพักตัวอย่างเพียง 1 หลังผ่าน Supabase SQL

หน้าตาอ้างอิงจาก Stitch project `Calendar Pricing Day Cell` โดยใช้ layout และ design system เดิม ทั้ง desktop calendar + Cell Inspector และ mobile calendar + bottom sheet

## ขอบเขตเวอร์ชันแรก

- ไม่มี login, role, permission หรือ audit ว่าใครแก้ราคา จึงเหมาะกับ demo/local เท่านั้น
- ราคาปกติเป็น constant `฿1,500` ในโค้ด
- เก็บเฉพาะวันที่มีสถานะพิเศษ; วันที่ไม่มี record ใช้ราคาปกติ
- หนึ่งบ้านพักมีได้หนึ่ง record ต่อหนึ่งวัน
- สถานะมี 4 ประเภท: `holiday`, `promotion`, `hot_deal`, `holiday_hot_deal`
- ผู้ใช้ตั้งข้อมูลเป็นช่วงวันได้ และระบบเขียนข้อมูลรายวัน
- หากช่วงใหม่ทับข้อมูลเดิม ระบบแสดงวันชนก่อน; เขียนทับเมื่อผู้ใช้ยืนยันเท่านั้น

## Data model

```text
properties
  id
  name
  description (text)
  created_at
  updated_at

daily_price
  id
  property_id -> properties.id
  date
  status_type
  net_price (integer, Thai baht)
  description (text)
  created_at
  updated_at

unique(property_id, date)
```

`daily_price.description` คือหมายเหตุของสถานะในวันนั้น และเมื่อสร้างช่วงวัน ระบบคัดลอกข้อความเดียวกันให้ทุก row ในช่วง

## Architecture

ใช้ REST API:

```text
Calendar UI
→ fetch('/api/...')
→ Next.js Route Handler
→ request validation
→ Pricing service
→ repository
→ Supabase
```

แยก UI, service และ repository ออกจากกัน; Route Handler ไม่มี business logic หรือ database query โดยตรง

## REST API

```text
GET    /api/properties
GET    /api/properties/:propertyId/daily-prices?from=&to=
POST   /api/properties/:propertyId/daily-prices/conflicts
PUT    /api/properties/:propertyId/daily-prices/range
DELETE /api/properties/:propertyId/daily-prices?from=&to=
```

- `POST /conflicts` ตรวจวันซ้ำโดยไม่เปลี่ยนข้อมูล
- `PUT /range` รับช่วงวัน, สถานะ, ราคาสุทธิ, รายละเอียด และ `confirmed: true` เมื่อมี conflict; ทำ upsert รายวัน
- `DELETE` ลบ override ของช่วงวัน ทำให้วันนั้นกลับไปใช้ราคาปกติ

## UI flow

- Desktop ใช้ monthly calendar และ Cell Inspector ตาม Stitch
- Mobile ใช้ monthly calendar และ bottom sheet ตาม Stitch
- เลือกวันเพื่อแก้ไขรายวัน
- `Bulk Pricing` ใช้ตั้งสถานะเป็นช่วงวัน
- เมื่อ API ส่ง conflict กลับมา UI แสดง dialog ยืนยันก่อนเรียก `PUT /range` ซ้ำด้วย `confirmed: true`

## Validation และ error handling

- ราคาเป็นจำนวนเต็มบวก
- `start_date` ต้องไม่หลัง `end_date`
- รับ `status_type` ได้เพียง 4 ค่า
- ทุก endpoint validate `propertyId` และ payload
- ใช้ error code: `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `INTERNAL_ERROR`
- UI ต้องมี loading state, error state และป้องกันส่ง request ซ้ำ
- การลบต้องมี confirmation ใน UI

## Testing ขั้นต่ำ

- validation ของ range, ราคา และ status type
- API conflict check
- API upsert รายวันหลังยืนยัน
- delete override และ fallback เป็น ฿1,500
- repository query สำหรับเดือนที่เลือกและหลายบ้านพัก

## ข้อจำกัดที่ยอมรับ

ไม่มี authentication ทำให้ห้ามนำไป deploy เปิดสาธารณะกับข้อมูลจริงโดยไม่มีมาตรการเพิ่ม
