# Calenda Day Price

Demo สำหรับจัดการราคาสุทธิรายวันของบ้านพักผ่านปฏิทินรายเดือน รองรับการเลือกช่วงวัน ตรวจวันซ้ำก่อนเขียนทับ และลบราคาเฉพาะวันเพื่อกลับไปใช้ราคาปกติ

> ข้อควรระวัง: เวอร์ชันนี้ไม่มี authentication, role, permission หรือ audit log จึงใช้เพื่อ demo/local development เท่านั้น ห้ามเปิดใช้งานกับข้อมูลจริงหรือ deploy สาธารณะก่อนเพิ่มมาตรการความปลอดภัย เช่น Supabase RLS และ authorization ฝั่ง server

## หลักการราคา

- ราคาปกติถูกกำหนดคงที่เป็น **฿1,500** ในโค้ด
- `daily_price` เก็บเฉพาะวันที่มีสถานะพิเศษ (sparse override) วันที่ไม่มี record จะใช้ราคาปกติ
- หนึ่งบ้านพักมี override ได้หนึ่งรายการต่อวัน
- สถานะ Daily Price: `holiday`, `promotion`
- `hot_deals` เก็บราคา Hot Deal แยกจาก Daily Price และแสดงทับราคาเดิมเฉพาะช่วงที่ดีล active

## เริ่มต้นใช้งาน

ต้องมี Node.js และ npm ก่อน จากนั้นติดตั้ง dependencies:

```bash
npm install
```

คัดลอก `.env.example` เป็น `.env.local` ใน project root แล้วแทนค่าตัวอย่างด้วยค่าของโปรเจกต์คุณ หากมี `.env.local` อยู่แล้ว ให้แก้ไฟล์เดิมโดยไม่คัดลอกทับ:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

ดู Project URL และ Publishable key ได้ที่ Supabase Dashboard → โปรเจกต์ของคุณ → **Connect** ตาม [คู่มือ API keys](https://supabase.com/docs/guides/getting-started/api-keys) ใช้ค่าจากโปรเจกต์เดียวกัน และห้ามใช้ secret key หรือ service_role key ในตัวแปร `NEXT_PUBLIC_` หลังเปลี่ยนค่าให้ restart development server

`.env.example` เก็บเฉพาะตัวอย่างและ commit ได้ ส่วน `.env.local` ถูก Git ignore

รัน development server:

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Supabase schema และ seed

ตรวจเมื่อ 9 กันยายน 2026: migration ทั้งสองและ seed ถูก apply แล้วบน Supabase remote ที่เชื่อมกับโปรเจกต์นี้; API อ่านตารางทั้งสามได้ และมี “บ้านพักตัวอย่าง” พร้อมใช้งาน:

- migration: `supabase/migrations/202609040001_create_pricing_tables.sql`
- migration สิทธิ์และ RLS: `supabase/migrations/20260904095533_grant_pricing_api_access.sql`
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
| GET | `/api/properties/:propertyId/calendar-prices?from=&to=` | อ่านราคาที่ resolve แล้วสำหรับแสดงในปฏิทิน รวม Hot Deal ที่ active |
| POST | `/api/properties/:propertyId/hot-deals/conflicts` | ตรวจวัน Hot Deal ซ้ำโดยไม่เขียนข้อมูล |
| PUT | `/api/properties/:propertyId/hot-deals/range` | ตั้ง Hot Deal เป็นช่วงวัน; ส่ง `confirmOverwrite: true` เมื่อต้องการยืนยันเขียนทับ |
| DELETE | `/api/properties/:propertyId/hot-deals?from=&to=` | ลบ Hot Deal เพื่อกลับไปใช้ Daily Price ของวันนั้น หรือราคาปกติเมื่อไม่มี Daily Price |

รายละเอียด architecture, data model และข้อจำกัดเพิ่มเติมอยู่ใน [CONTEXT.md](./CONTEXT.md)
# หน้าดูราคาสำหรับลูกค้า

เปิด `/stay` เพื่อเลือกบ้านและดูปฏิทินราคา ลูกค้าสามารถเปลี่ยนเดือนและเลือกวันเพื่ออ่านเงื่อนไขได้ โดยไม่มีตัวแก้ไขราคา โปรไฟลุกแสดงเฉพาะช่วงล่วงหน้าที่ตั้งไว้จนถึงวันเข้าพัก ตามวันที่ประเทศไทยที่คำนวณบนเซิร์ฟเวอร์ นอกช่วงดังกล่าวใช้ราคาพิเศษรายวันหรือราคาปกติ

มีปุ่ม “ดูหน้าลูกค้า” ในหน้ารายการบ้านฝั่งจัดการ และสามารถแชร์ URL `/stay/[propertyId]` ของบ้านแต่ละหลังได้ ระบบยังไม่ได้เพิ่มการจองห้องหรือการล็อกอินผู้ดูแล
