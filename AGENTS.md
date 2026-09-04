<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# แนวทางสำหรับผู้ร่วมพัฒนาและ AI agent

## ภาษาและการสื่อสาร

- ใช้ภาษาไทยเป็นหลักในการสื่อสารและเขียนเอกสาร; ใช้ศัพท์เทคนิคภาษาอังกฤษได้เมื่อเป็นคำทั่วไป หรืออธิบายความหมายเมื่อจำเป็น
- เวลาและวันที่ที่ผู้ใช้เห็น ให้ใช้เขตเวลา `Asia/Bangkok` เป็นค่าเริ่มต้น; เก็บเวลาในฐานข้อมูลเป็น UTC แล้วแปลงตอนแสดงผล
- อธิบายการตัดสินใจและความเสี่ยงด้านความปลอดภัยให้กระชับ โดยเฉพาะเมื่อมีผลต่อข้อมูลผู้ใช้หรือการรองรับหลายผู้ใช้

## หลักการพัฒนา

- ใช้ TypeScript แบบ strict และหลีกเลี่ยง `any` เว้นแต่มีเหตุผลชัดเจน
- ใช้ Next.js App Router และ React ตามรูปแบบของโปรเจกต์นี้ ก่อนแก้โค้ดที่พึ่ง Next.js ให้เปิดอ่านเอกสารเวอร์ชันที่ติดตั้งใน `node_modules/next/dist/docs/` ก่อนเสมอ
- ออกแบบ mobile-first, semantic HTML, keyboard navigation, label และ focus state ให้ครบ
- ค้นหา component ที่ใช้ซ้ำได้ก่อนสร้างใหม่; component ที่ซ้ำกันควรแยกเป็น shared UI หรือ feature component ตามความเหมาะสม
- UI ต้องไม่ query ฐานข้อมูลหรือบรรจุ business logic ที่ซับซ้อนโดยตรง

## ขอบเขต Server และข้อมูล

- ใช้ Server Action สำหรับ mutation ที่มาจากหน้าเว็บเดียวกันเป็นค่าเริ่มต้น; ใช้ Route Handler เมื่อเป็น API สำหรับ external consumer, webhook, cron หรือ mobile client จริง ๆ
- ทุก mutation ต้อง validate input ฝั่ง server, ตรวจตัวตนและสิทธิ์ฝั่ง server, และไม่เชื่อ `userId`, role, tenant หรือ storage path ที่ส่งจาก browser
- เมื่อระบบเริ่มมี data access จริง ให้แยกความรับผิดชอบเป็น UI → service/use case → repository หรือ adapter: repository อ่าน/เขียนข้อมูลเท่านั้น ส่วน business rule อยู่ใน service
- ห้ามส่ง stack trace, SQL error, secret หรือข้อมูลของผู้ใช้อื่นกลับไป client หรือ log
- อย่า commit secret; ใช้ environment variable ใน local และ secret manager ของ platform ใน staging/production

## Supabase

- ใช้ `createClient` จาก `lib/client.ts` สำหรับ browser และ `lib/server.ts` สำหรับ server; อย่าสร้าง Supabase client ซ้ำใน component หรือ global variable
- การจัดการ session อาศัย cookie-aware SSR client และ `updateSession` ใน `lib/middleware.ts`; หากเพิ่มหรือแก้ auth flow ต้องตรวจว่ามี entry point ที่เรียก session refresh ตาม convention ของ Next.js เวอร์ชันที่ใช้อยู่
- ห้ามนำ service-role key หรือ privileged credential ไปใช้ฝั่ง browser
- ทุกตารางหรือ Storage ที่ผู้ใช้เข้าถึงโดยตรงต้องออกแบบ Row Level Security (RLS) และ policy แบบ explicit ก่อนเปิดใช้งานจริง

## Database, ไฟล์ และความปลอดภัย

- ทุก schema change ใช้ migration ใหม่; ห้ามแก้ migration ที่ deploy แล้ว
- ใช้ foreign key, unique/check constraint, index และ transaction เมื่อ data flow ต้องพึ่งกัน
- หากระบบรองรับหลายองค์กร/ผู้ใช้ ให้กำหนดขอบเขตข้อมูล (เช่น `tenant_id`) ใน schema และทุก query ตั้งแต่ต้น
- Server ต้องเป็นผู้กำหนด storage object key; validate ชนิด ขนาด และจำนวนไฟล์ก่อน upload
- action ที่ลบหรือเปลี่ยนข้อมูลสำคัญต้องมี confirmation และ audit log ตามระดับความเสี่ยง

## คุณภาพและการตรวจสอบ

- เพิ่ม test ให้เหมาะกับความเสี่ยง: utility/validation, service authorization และ critical user flow เป็นลำดับแรก
- ก่อนส่งงาน ให้รันคำสั่งที่มีในโปรเจกต์และเกี่ยวข้องกับการเปลี่ยนแปลง เช่น `npm run lint` และ `npm run build`; เพิ่ม `typecheck` หรือ `test` เมื่อ script ถูกตั้งค่าแล้ว
- ตรวจ diff เสมอ และอย่าแก้หรือย้อนการเปลี่ยนแปลงของผู้ใช้อื่นที่ไม่เกี่ยวกับงาน
- อัปเดต `CONTEXT.md` เมื่อ stack, architecture, data model, integration หรือข้อจำกัดสำคัญเปลี่ยนไป
