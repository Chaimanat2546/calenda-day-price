"use client";

import { useEffect, useMemo, useState } from "react";

import { checkConflicts, deleteDailyPriceRange, getDailyPrices, getProperties, PricingApiError, updateDailyPriceRange } from "@/components/pricing/api-client";
import { CalendarDayCell } from "@/components/pricing/calendar-day-cell";
import { PricingEditor } from "@/components/pricing/pricing-editor";
import { StatusLegend } from "@/components/pricing/status-legend";
import type { DailyPrice, Property, StatusType } from "@/server/types/pricing";

type DateRange = { startDate: string; endDate: string };
type PricingCalendarProps = { initialMonth?: string };

const thaiMonthFormatter = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const thaiDayFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

function todayMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Bangkok" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : "2026-09";
}

function dateForDisplay(date: string): Date {
  return new Date(`${date}T12:00:00+07:00`);
}

function monthRange(month: string): DateRange {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function shiftMonth(month: string, difference: number): string {
  const [yearText, monthText] = month.split("-");
  const shifted = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + difference, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function datesForMonth(month: string): Array<{ date: string; day: number; weekday: number }> {
  const range = monthRange(month);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const days = Number(range.endDate.slice(-2));
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return { date: `${month}-${String(day).padStart(2, "0")}`, day, weekday: new Date(Date.UTC(year, monthIndex, day)).getUTCDay() };
  });
}

function isWithinRange(date: string, range: DateRange | null): boolean {
  return Boolean(range && date >= range.startDate && date <= range.endDate);
}

function toRange(startDate: string, endDate: string): DateRange {
  return startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };
}

export function PricingCalendar({ initialMonth = todayMonth() }: PricingCalendarProps) {
  const [month, setMonth] = useState(initialMonth);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [dailyPrices, setDailyPrices] = useState<DailyPrice[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [statusType, setStatusType] = useState<StatusType>("promotion");
  const [netPrice, setNetPrice] = useState("1500");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const visibleRange = useMemo(() => monthRange(month), [month]);
  const visibleDays = useMemo(() => datesForMonth(month), [month]);
  const dailyPriceByDate = useMemo(() => new Map(dailyPrices.map((dailyPrice) => [dailyPrice.date, dailyPrice])), [dailyPrices]);

  useEffect(() => {
    let mounted = true;
    void getProperties().then((properties) => {
      if (!mounted) return;
      setActiveProperty(properties[0] ?? null);
      if (properties.length === 0) setMessage("ยังไม่มีบ้านพักสำหรับตั้งราคา");
    }).catch(() => mounted && setMessage("ไม่สามารถโหลดข้อมูลบ้านพักได้")).finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  async function refreshPrices(property: Property | null = activeProperty): Promise<void> {
    if (!property) return;
    setDailyPrices(await getDailyPrices(property.id, visibleRange));
  }

  useEffect(() => {
    if (!activeProperty) return;
    let mounted = true;
    void getDailyPrices(activeProperty.id, visibleRange)
      .then((prices) => {
        if (mounted) setDailyPrices(prices);
      })
      .catch(() => {
        if (mounted) setMessage("ไม่สามารถโหลดราคาพิเศษของเดือนนี้ได้");
      });
    return () => { mounted = false; };
  }, [activeProperty, visibleRange]);

  function handleSelectDate(date: string): void {
    setMessage(null);
    setConflicts([]);
    if (!selectedRange || selectedRange.startDate !== selectedRange.endDate) {
      setSelectedRange({ startDate: date, endDate: date });
      return;
    }
    setSelectedRange(toRange(selectedRange.startDate, date));
  }

  async function saveRange(confirmOverwrite: boolean): Promise<void> {
    if (!activeProperty || !selectedRange) return;
    const parsedPrice = Number(netPrice);
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setMessage("กรุณาระบุราคาสุทธิเป็นจำนวนเต็มที่มากกว่า 0");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      if (!confirmOverwrite) {
        const dates = await checkConflicts(activeProperty.id, selectedRange);
        if (dates.length > 0) {
          setConflicts(dates);
          return;
        }
      }
      await updateDailyPriceRange(activeProperty.id, { ...selectedRange, statusType, netPrice: parsedPrice, description: description.trim() || null, confirmOverwrite });
      setConflicts([]);
      await refreshPrices();
      setMessage("บันทึกราคาพิเศษแล้ว");
    } catch (error) {
      if (error instanceof PricingApiError && error.conflicts.length > 0) setConflicts(error.conflicts);
      else setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกราคาได้");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!activeProperty || !selectedRange || !window.confirm("ลบสถานะราคาพิเศษในช่วงวันที่เลือกหรือไม่?")) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const deleted = await deleteDailyPriceRange(activeProperty.id, selectedRange);
      await refreshPrices();
      setConflicts([]);
      setMessage(deleted > 0 ? "ลบสถานะราคาพิเศษแล้ว" : "ไม่พบสถานะในช่วงวันที่เลือก");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถลบสถานะได้");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="pricing-app-shell">
      <aside className="app-sidebar">
        <a className="app-brand" href="#calendar"><span className="app-brand__mark">P</span><span>Primo Stay</span></a>
        <nav aria-label="เมนูหลัก" className="app-nav"><a href="#calendar">▦ ภาพรวม</a><a className="app-nav__active" href="#calendar">▣ ราคาและปฏิทิน</a><a href="#calendar">⌂ บ้านพัก</a></nav>
        <div className="app-sidebar__footer"><span className="avatar">ภ</span><div><strong>ภู</strong><small>ผู้ดูแลระบบ</small></div></div>
      </aside>
      <div className="pricing-workspace">
        <header className="app-header">
          <button aria-label="เปิดเมนู" className="mobile-menu" type="button">☰</button>
          <div><p className="eyebrow">PRICING MANAGEMENT</p><h1>ราคาพิเศษรายวัน</h1></div>
          <div className="app-header__property"><span className="app-header__property-dot" /><span>{activeProperty?.name ?? (isLoading ? "กำลังโหลด…" : "ยังไม่มีบ้านพัก")}</span></div>
        </header>
        <main className="pricing-layout" id="calendar">
          <section aria-labelledby="calendar-heading" className="calendar-card">
            <div className="calendar-card__topline">
              <div><p className="eyebrow">DAILY RATE CALENDAR</p><h2 id="calendar-heading">{thaiMonthFormatter.format(dateForDisplay(`${month}-01`))}</h2></div>
              <div className="month-controls"><button aria-label="เดือนก่อนหน้า" onClick={() => setMonth(shiftMonth(month, -1))} type="button">‹</button><button onClick={() => setMonth(todayMonth())} type="button">วันนี้</button><button aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))} type="button">›</button></div>
            </div>
            <StatusLegend />
            <div aria-busy={isLoading} className="calendar-grid" role="grid">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => <div className="calendar-grid__weekday" key={day} role="columnheader">{day}</div>)}
              {Array.from({ length: visibleDays[0]?.weekday ?? 0 }, (_, index) => <div aria-hidden="true" className="calendar-grid__blank" key={`blank-${index}`} />)}
              {visibleDays.map((day) => {
                const isSelected = Boolean(selectedRange && (day.date === selectedRange.startDate || day.date === selectedRange.endDate));
                return <CalendarDayCell dailyPrice={dailyPriceByDate.get(day.date)} date={day.date} day={day.day} isInRange={isWithinRange(day.date, selectedRange)} isSelected={isSelected} key={day.date} label={thaiDayFormatter.format(dateForDisplay(day.date))} onSelect={handleSelectDate} />;
              })}
            </div>
          </section>
          <PricingEditor conflicts={conflicts} description={description} isSaving={isSaving} message={message} netPrice={netPrice} onConfirmOverwrite={() => void saveRange(true)} onDelete={() => void handleDelete()} onDescriptionChange={setDescription} onPriceChange={setNetPrice} onSave={() => void saveRange(false)} onStatusChange={setStatusType} selectedRange={selectedRange} statusType={statusType} />
        </main>
      </div>
    </div>
  );
}
