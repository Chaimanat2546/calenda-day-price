"use client";

import { useState } from "react";
import { CalendarDayCell } from "./calendar-day-cell";
import { StatusLegend } from "./status-legend";
import type { PublicCalendarDayPrice } from "@/server/services/calendar-pricing-service";

export function CustomerCalendar({ days, today }: { days: PublicCalendarDayPrice[]; today: string }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = days.find(day => day.date === selectedDate);
  const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const format = (date: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${date}T12:00:00+07:00`));
  return <>
    <StatusLegend />
    <p className="calendar-card__hint">ราคาต่อคืน (บาท) · เลือกวันเพื่อดูรายละเอียดและเงื่อนไข</p>
    <div className="calendar-grid" aria-label="ปฏิทินราคาที่พัก">
      {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(day => <div className="calendar-grid__weekday" key={day}>{day}</div>)}
      {Array.from({ length: offset }, (_, i) => <div className="calendar-grid__blank" aria-hidden="true" key={`blank-${i}`} />)}
      {days.map(day => <CalendarDayCell key={day.date} date={day.date} day={Number(day.date.slice(-2))} label={format(day.date)} calendarPrice={day} isSelected={selectedDate === day.date} isInRange={false} onSelect={setSelectedDate} />)}
    </div>
    <section className="customer-price-detail" aria-live="polite" aria-label="รายละเอียดราคาวันที่เลือก">
      {selected ? <>
        <h2>{format(selected.date)}</h2><strong>{selected.net_price.toLocaleString("th-TH")} บาท / คืน</strong>
        <p>{selected.is_hot_deal ? (selected.status_type === "holiday" ? "🔥 โปรไฟลุกในวันหยุด" : "🔥 โปรไฟลุก") : selected.status_type === "holiday" ? "ราคาวันหยุด" : selected.status_type === "promotion" ? "ราคาโปรโมชัน" : "ราคาปกติ"}</p>
        {selected.description ? <p className="customer-conditions">{selected.description}</p> : null}
        {selected.date < today ? <p>วันที่นี้ผ่านไปแล้ว</p> : null}
      </> : <p>เลือกวันในปฏิทินเพื่อดูราคาและเงื่อนไข</p>}
    </section>
    <p className="customer-note">ปฏิทินนี้แสดงราคา ไม่ใช่สถานะห้องว่าง กรุณาตรวจสอบห้องว่างกับที่พักก่อนจอง</p>
  </>;
}
