"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  checkDailyPriceConflicts,
  checkHotDealConflicts,
  deleteDailyPriceRange,
  deleteHotDealRange,
  getCalendarPrices,
  getProperties,
  PricingApiError,
  updateDailyPriceRange,
  updateHotDealRange,
} from "@/components/pricing/api-client";
import { CalendarDayCell } from "@/components/pricing/calendar-day-cell";
import { PricingEditor, type PricingMode } from "@/components/pricing/pricing-editor";
import { StatusLegend } from "@/components/pricing/status-legend";
import type { CalendarDayPrice, Property, StatusType } from "@/server/types/pricing";

type DateRange = { startDate: string; endDate: string };
type PricingCalendarProps = { initialMonth?: string };

const thaiMonthFormatter = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const thaiDayFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const mobileMediaQuery = "(max-width: 1023px)";

function subscribeToMobileViewport(callback: () => void): () => void {
  const mediaQuery = window.matchMedia(mobileMediaQuery);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getMobileViewportSnapshot(): boolean {
  return window.matchMedia(mobileMediaQuery).matches;
}

function getServerViewportSnapshot(): boolean {
  return false;
}

function getFocusableDrawerElements(drawer: HTMLDivElement | null): HTMLElement[] {
  if (!drawer) return [];
  return Array.from(
    drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.classList.contains("mobile-drawer__backdrop"));
}

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
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerViewportSnapshot
  );
  const [month, setMonth] = useState(initialMonth);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [calendarPrices, setCalendarPrices] = useState<CalendarDayPrice[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [mode, setMode] = useState<PricingMode>("daily-price");
  const [statusType, setStatusType] = useState<StatusType>("promotion");
  const [dailyPrice, setDailyPrice] = useState("1500");
  const [dailyDescription, setDailyDescription] = useState("");
  const [hotDealPrice, setHotDealPrice] = useState("1200");
  const [showBeforeDays, setShowBeforeDays] = useState("7");
  const [hotDealDescription, setHotDealDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [conflictsByMode, setConflictsByMode] = useState<Record<PricingMode, string[]>>({
    "daily-price": [],
    "hot-deal": [],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const desktopInspectorRef = useRef<HTMLElement | null>(null);
  const calendarGridRef = useRef<HTMLDivElement | null>(null);
  const visibleRange = useMemo(() => monthRange(month), [month]);
  const visibleDays = useMemo(() => datesForMonth(month), [month]);
  const calendarPriceByDate = useMemo(
    () => new Map(calendarPrices.map((calendarPrice) => [calendarPrice.date, calendarPrice])),
    [calendarPrices]
  );

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
    setCalendarPrices(await getCalendarPrices(property.id, visibleRange));
  }

  useEffect(() => {
    if (!activeProperty) return;
    let mounted = true;
    void getCalendarPrices(activeProperty.id, visibleRange)
      .then((prices) => {
        if (mounted) setCalendarPrices(prices);
      })
      .catch(() => {
        if (mounted) setMessage("ไม่สามารถโหลดราคาพิเศษของเดือนนี้ได้");
      });
    return () => { mounted = false; };
  }, [activeProperty, visibleRange]);

  const closeMobileEditor = useCallback(() => {
    setIsMobileEditorOpen(false);
    drawerOpenerRef.current?.focus();
  }, []);

  const returnToCalendar = useCallback(() => {
    setIsMobileEditorOpen(false);
    requestAnimationFrame(() => {
      calendarGridRef.current?.querySelector<HTMLButtonElement>(".pricing-day")?.focus();
    });
  }, []);

  const openMobileEditor = useCallback((opener?: HTMLElement | null) => {
    if (!isMobileViewport) return;
    drawerOpenerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setIsMobileEditorOpen(true);
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileEditorOpen) return;
    const focusableElements = getFocusableDrawerElements(drawerRef.current);
    const firstFocusableElement = focusableElements[0];
    firstFocusableElement?.focus();

    const keepFocusInDrawer = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileEditor();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = getFocusableDrawerElements(drawerRef.current);
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !drawerRef.current?.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", keepFocusInDrawer);
    return () => window.removeEventListener("keydown", keepFocusInDrawer);
  }, [closeMobileEditor, isMobileEditorOpen]);

  function handleSelectDate(date: string): void {
    setMessage(null);
    setConflictsByMode({ "daily-price": [], "hot-deal": [] });
    openMobileEditor();
    if (!selectedRange || selectedRange.startDate !== selectedRange.endDate) {
      setSelectedRange({ startDate: date, endDate: date });
      return;
    }
    setSelectedRange(toRange(selectedRange.startDate, date));
  }

  function handleOpenBulkPricing(opener?: HTMLElement | null): void {
    setSelectedRange(null);
    setMessage(null);
    setConflictsByMode({ "daily-price": [], "hot-deal": [] });
    openMobileEditor(opener);
    if (!isMobileViewport) {
      requestAnimationFrame(() => desktopInspectorRef.current?.focus());
    }
  }

  async function saveRange(confirmOverwrite: boolean): Promise<void> {
    if (!activeProperty || !selectedRange) return;
    const activeMode = mode;
    const parsedPrice = Number(activeMode === "hot-deal" ? hotDealPrice : dailyPrice);
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setMessage(activeMode === "hot-deal" ? "กรุณาระบุราคา Hot Deal เป็นจำนวนเต็มที่มากกว่า 0" : "กรุณาระบุราคาสุทธิเป็นจำนวนเต็มที่มากกว่า 0");
      return;
    }
    const parsedShowBeforeDays = Number(showBeforeDays);
    if (activeMode === "hot-deal" && (!Number.isInteger(parsedShowBeforeDays) || parsedShowBeforeDays < 0 || parsedShowBeforeDays > 365)) {
      setMessage("กรุณาระบุวันเริ่มแสดงล่วงหน้าเป็นจำนวนเต็มระหว่าง 0 ถึง 365");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      if (!confirmOverwrite) {
        const dates = activeMode === "hot-deal"
          ? await checkHotDealConflicts(activeProperty.id, selectedRange)
          : await checkDailyPriceConflicts(activeProperty.id, selectedRange);
        if (dates.length > 0) {
          setConflictsByMode((current) => ({ ...current, [activeMode]: dates }));
          return;
        }
      }
      if (activeMode === "hot-deal") {
        await updateHotDealRange(activeProperty.id, {
          ...selectedRange,
          netPrice: parsedPrice,
          showBeforeDays: parsedShowBeforeDays,
          description: hotDealDescription.trim() || null,
          confirmOverwrite,
        });
      } else {
        await updateDailyPriceRange(activeProperty.id, {
          ...selectedRange,
          statusType,
          netPrice: parsedPrice,
          description: dailyDescription.trim() || null,
          confirmOverwrite,
        });
      }
      setConflictsByMode((current) => ({ ...current, [activeMode]: [] }));
      await refreshPrices();
      setMessage(activeMode === "hot-deal" ? "บันทึก Hot Deal แล้ว" : "บันทึกราคาพิเศษแล้ว");
    } catch (error) {
      if (error instanceof PricingApiError && error.conflicts.length > 0) {
        setConflictsByMode((current) => ({ ...current, [activeMode]: error.conflicts }));
      }
      else setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกราคาได้");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!activeProperty || !selectedRange) return;
    const activeMode = mode;
    const confirmed = window.confirm(activeMode === "hot-deal" ? "ลบ Hot Deal ในช่วงวันที่เลือกหรือไม่?" : "ลบสถานะราคาพิเศษในช่วงวันที่เลือกหรือไม่?");
    if (!confirmed) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const deleted = activeMode === "hot-deal"
        ? await deleteHotDealRange(activeProperty.id, selectedRange)
        : await deleteDailyPriceRange(activeProperty.id, selectedRange);
      await refreshPrices();
      setConflictsByMode((current) => ({ ...current, [activeMode]: [] }));
      setMessage(deleted > 0
        ? activeMode === "hot-deal" ? "ลบ Hot Deal แล้ว" : "ลบสถานะราคาพิเศษแล้ว"
        : activeMode === "hot-deal" ? "ไม่พบ Hot Deal ในช่วงวันที่เลือก" : "ไม่พบสถานะในช่วงวันที่เลือก");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถลบสถานะได้");
    } finally {
      setIsSaving(false);
    }
  }

  const editorProps = {
    conflicts: conflictsByMode[mode],
    description: mode === "hot-deal" ? hotDealDescription : dailyDescription,
    isSaving,
    message,
    mode,
    netPrice: mode === "hot-deal" ? hotDealPrice : dailyPrice,
    onConfirmOverwrite: () => void saveRange(true),
    onDelete: () => void handleDelete(),
    onDescriptionChange: mode === "hot-deal" ? setHotDealDescription : setDailyDescription,
    onModeChange: (nextMode: PricingMode) => {
      setMode(nextMode);
      setMessage(null);
    },
    onPriceChange: mode === "hot-deal" ? setHotDealPrice : setDailyPrice,
    onSave: () => void saveRange(false),
    onShowBeforeDaysChange: setShowBeforeDays,
    onStatusChange: setStatusType,
    selectedRange,
    showBeforeDays,
    statusType,
  };

  return (
    <div className="pricing-app-shell">
      <aside className="app-sidebar">
        <a className="app-brand" href="#calendar"><span className="app-brand__mark">V</span><span>VillaRate Studio</span></a>
        <nav aria-label="เมนูหลัก" className="app-nav"><a href="#calendar">▦ ภาพรวม</a><a className="app-nav__active" href="#calendar">▣ ราคาและปฏิทิน</a><a href="#calendar">⌂ บ้านพัก</a></nav>
        <div className="app-sidebar__footer"><span className="avatar">ภ</span><div><strong>ภู</strong><small>ผู้ดูแลระบบ</small></div></div>
      </aside>
      <div className="pricing-workspace">
        <header className="app-header">
          <button aria-controls="mobile-pricing-drawer" aria-expanded={isMobileViewport && isMobileEditorOpen} aria-label="เปิดการตั้งค่าราคา" className="mobile-menu" onClick={(event) => openMobileEditor(event.currentTarget)} type="button">☰</button>
          <div><p className="eyebrow">PRICING MANAGEMENT</p><h1>ราคาพิเศษรายวัน</h1></div>
          <div className="app-header__property">
            <span className="app-header__property-dot" />
            <div><small>ACTIVE VILLA</small><span>{activeProperty?.name ?? (isLoading ? "กำลังโหลด…" : "ยังไม่มีบ้านพัก")}</span></div>
          </div>
        </header>
        <main className="pricing-layout" id="calendar">
          <section aria-labelledby="calendar-heading" className="calendar-card">
            <div className="calendar-card__topline">
              <div><p className="eyebrow">DAILY RATE CALENDAR</p><h2 id="calendar-heading">{thaiMonthFormatter.format(dateForDisplay(`${month}-01`))}</h2></div>
              <div className="calendar-card__controls">
                <button className="bulk-pricing-trigger" onClick={(event) => handleOpenBulkPricing(event.currentTarget)} type="button"><span aria-hidden="true">⌘</span> Bulk Pricing</button>
                <div className="month-controls"><button aria-label="เดือนก่อนหน้า" onClick={() => setMonth(shiftMonth(month, -1))} type="button">‹</button><button onClick={() => setMonth(todayMonth())} type="button">วันนี้</button><button aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))} type="button">›</button></div>
              </div>
            </div>
            <StatusLegend />
            <div aria-busy={isLoading} className="calendar-grid" ref={calendarGridRef} role="grid">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => <div className="calendar-grid__weekday" key={day} role="columnheader">{day}</div>)}
              {Array.from({ length: visibleDays[0]?.weekday ?? 0 }, (_, index) => <div aria-hidden="true" className="calendar-grid__blank" key={`blank-${index}`} />)}
              {visibleDays.map((day) => {
                const isSelected = Boolean(selectedRange && (day.date === selectedRange.startDate || day.date === selectedRange.endDate));
                return <CalendarDayCell calendarPrice={calendarPriceByDate.get(day.date)} date={day.date} day={day.day} isInRange={isWithinRange(day.date, selectedRange)} isSelected={isSelected} key={day.date} label={thaiDayFormatter.format(dateForDisplay(day.date))} onSelect={handleSelectDate} />;
              })}
            </div>
          </section>
          {isMobileViewport ? (
            <div className="mobile-drawer" hidden={!isMobileEditorOpen} ref={drawerRef}>
              <button aria-label="ปิดการตั้งค่าราคา" className="mobile-drawer__backdrop" onClick={closeMobileEditor} type="button" />
              <PricingEditor {...editorProps} isDrawer onClose={closeMobileEditor} onReturnToCalendar={returnToCalendar} />
            </div>
          ) : (
            <PricingEditor {...editorProps} inspectorRef={desktopInspectorRef} />
          )}
        </main>
      </div>
    </div>
  );
}
