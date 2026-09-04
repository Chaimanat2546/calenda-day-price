# Calenda Day Price

Demo สำหรับจัดการราคาสุทธิรายวันของบ้านพักผ่านปฏิทินรายเดือน รองรับการเลือกช่วงวัน ตรวจวันซ้ำก่อนเขียนทับ และลบราคาเฉพาะวันเพื่อกลับไปใช้ราคาปกติ

> ข้อควรระวัง: เวอร์ชันนี้ไม่มี authentication, role, permission หรือ audit log จึงใช้เพื่อ demo/local development เท่านั้น ห้ามเปิดใช้งานกับข้อมูลจริงหรือ deploy สาธารณะก่อนเพิ่มมาตรการความปลอดภัย เช่น Supabase RLS และ authorization ฝั่ง server

## หลักการราคา

- ราคาปกติถูกกำหนดคงที่เป็น **฿1,500** ในโค้ด
- `daily_price` เก็บเฉพาะวันที่มีสถานะพิเศษ (sparse override) วันที่ไม่มี record จะใช้ราคาปกติ
- หนึ่งบ้านพักมี override ได้หนึ่งรายการต่อวัน
- สถานะ: `holiday`, `promotion`, `hot_deal`, `holiday_hot_deal`

## เริ่มต้นใช้งาน

ต้องมี Node.js และ npm ก่อน จากนั้นติดตั้ง dependencies:

```bash
npm install
```

สร้าง `.env` ใน project root และใส่ชื่อ environment variable ต่อไปนี้ (ห้าม commit ค่า):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

รัน development server:

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Supabase schema และ seed

ไฟล์ schema และ seed ถูกเขียนไว้แล้ว แต่ **ยังไม่ได้ apply**:

- migration: `supabase/migrations/202609040001_create_pricing_tables.sql`
- seed: `supabase/seed.sql`

วิธี apply ด้วยตนเองอย่างปลอดภัย:

1. ตรวจว่า project Supabase ที่เลือกถูกต้อง และใช้ environment ของ local/development ก่อน
2. เปิด SQL Editor หรือ migration workflow ของ Supabase ที่ทีมใช้
3. review เนื้อหา migration แล้วรัน migration ก่อน
4. review และรัน seed หลัง migration เพื่อสร้าง “บ้านพักตัวอย่าง” หากยังไม่มีบ้านพัก
5. เปิดหน้าเว็บและตรวจว่าบ้านพักตัวอย่างโหลดได้

อย่ารัน SQL เหล่านี้กับ production โดยไม่มี RLS, authentication และแผนสำรองข้อมูล

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # development server
npm test         # Vitest test suite
npx tsc --noEmit # ตรวจ TypeScript
npm run lint     # ตรวจ ESLint
npm run build    # production build
```

## REST API

| Method | Endpoint | หน้าที่ |
| --- | --- | --- |
| GET | `/api/properties` | อ่านบ้านพัก |
| GET | `/api/properties/:propertyId/daily-prices?from=&to=` | อ่านราคา override ในช่วงวัน |
| POST | `/api/properties/:propertyId/daily-prices/conflicts` | ตรวจวันซ้ำโดยไม่เขียนข้อมูล |
| PUT | `/api/properties/:propertyId/daily-prices/range` | ตั้งราคาและสถานะเป็นช่วงวัน; ส่ง `confirmOverwrite: true` เมื่อต้องการยืนยันเขียนทับ |
| DELETE | `/api/properties/:propertyId/daily-prices?from=&to=` | ลบ override เพื่อกลับสู่ราคาปกติ |

รายละเอียด architecture, data model และข้อจำกัดเพิ่มเติมอยู่ใน [CONTEXT.md](./CONTEXT.md)
