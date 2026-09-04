# Stitch UI Alignment — Design

## เป้าหมาย

ปรับหน้าปฏิทินราคาให้ยึดภาพและการจัดวางจาก Stitch project `Calendar Pricing Day Cell` โดยใช้สี่หน้าจอเป็น source of truth:

1. Daily Pricing Calendar & Cell System
2. Daily Pricing Calendar - Special Price Mode
3. Mobile Daily Pricing Calendar - Special Price Mode
4. Mobile Daily Pricing Calendar & Hot Deal Inspector

งานนี้เปลี่ยนเฉพาะ presentation และ interaction layer ไม่เปลี่ยน schema, REST contract, หรือ business rule ที่ใช้งานอยู่

## ขอบเขตที่คงเดิม

- ราคาปกติยังเป็น constant ฿1,500; ไม่เพิ่มระบบราคาปกติรายวันตามตัวอย่างใน mockup
- special price รองรับ `holiday` และ `promotion`; Hot Deal เป็น overlay แยกตาม API ที่มีอยู่
- การตั้งราคาแบบช่วงวัน, conflict check, overwrite confirmation, delete confirmation และ lead time ของ Hot Deal คงเดิม
- ไม่มี authentication, role, audit, AI recommendation หรือ dynamic inventory logic

## Desktop

- ใช้ app shell แนว VillaRate Studio: dark sidebar, top header ที่มีชื่อบ้านพัก/สถานะ, เนื้อหาพื้นหลังอ่อน และ card หลัก
- calendar header มีชื่อเดือน, ปุ่มเดือนก่อน/ถัดไป/วันนี้, cue legend และปุ่ม Bulk Pricing
- day cell ใช้ลำดับข้อมูลแบบ mockup: วันที่, cue icon, ราคาพิเศษหรือราคา base และ active/focus ring
- holiday ใช้พื้นเหลือง, promotion ใช้ rose/pink tag, Hot Deal ใช้ fire cue และราคาเด่น, holiday + Hot Deal ใช้ทั้งพื้นเหลืองและ fire cue
- Cell Inspector ด้านขวาใช้ tabs ราคาพิเศษ/โปรไฟลุก, label วันที่, status pill, price input พร้อมปุ่ม ±฿200, รายละเอียด, action primary และ reset/delete ที่สอดคล้องกับ action เดิม

## Mobile

- ใช้ header compact, month controls, cue legend และ 7-column calendar แบบ Stitch
- day cell แสดงราคาย่อเป็น `฿1.5k` ในพื้นที่จำกัด; icon ต้องคง semantic label
- Cell Inspector เป็น bottom sheet ที่เปิดเมื่อเลือกวันหรือกดปุ่มตั้งค่า และยังต้อง focus-trap/restore focus ตาม implementation ปัจจุบัน
- เลือกโหมด special price หรือ Hot Deal แล้วแสดง field เฉพาะโหมด โดยไม่สร้าง endpoint ใหม่

## Data mapping

| Stitch visual concept | ระบบจริง |
|---|---|
| ราคาปกติใน cell | `BASE_DAILY_PRICE` = ฿1,500 |
| ราคาพิเศษ | `daily_price.net_price` |
| วันหยุด / โปรโมชั่น | `daily_price.status_type` |
| Hot Deal | calendar-price API overlay (`is_hot_deal`, price และ lead time) |
| ราคาเดิมแบบขีดฆ่า | ฿1,500 เมื่อมี special price หรือ Hot Deal |

## Accessibility และ responsive

- ทุก cue ใช้ icon พร้อมชื่อสถานะภาษาไทยใน `aria-label`; ห้ามอาศัยสีอย่างเดียว
- Day cell เป็น native button และ focus-visible ต้องชัด
- mobile touch target ไม่น้อยกว่า 44px เท่าที่ layout รองรับ
- drawer ต้องรองรับ Escape, backdrop, close button, Tab/Shift+Tab loop และคืน focus กลับ opener

## การทดสอบ

- ปรับ component tests ให้ยืนยัน visual state mapping: holiday, promotion, Hot Deal และ holiday + Hot Deal
- คง test flow สำหรับ range, conflict/overwrite, pending save และ drawer accessibility
- ตรวจ responsive ผ่าน browser ที่ desktop และ mobile breakpoint
- รัน `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, และ `git diff --check`
