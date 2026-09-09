import { useState, type Ref } from "react";
import { RotateCcw, Save, Sparkles, Sun, Tag } from "lucide-react";

import type { CalendarDayPrice, StatusType } from "@/server/types/pricing";

export type PricingMode = "daily-price" | "hot-deal";

type PricingEditorProps = {
  selectedRange: { startDate: string; endDate: string } | null;
  mode: PricingMode;
  statusType: StatusType;
  netPrice: string;
  showBeforeDays: string;
  description: string;
  isSaving: boolean;
  conflicts: string[];
  message: string | null;
  onModeChange: (value: PricingMode) => void;
  onStatusChange: (value: StatusType) => void;
  onPriceChange: (value: string) => void;
  onShowBeforeDaysChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onConfirmOverwrite: () => void;
  onDelete: () => void;
  isDrawer?: boolean;
  onClose?: () => void;
  onReturnToCalendar?: () => void;
  inspectorRef?: Ref<HTMLElement>;
  propertyName?: string;
  selectedCalendarPrice?: CalendarDayPrice;
};

const statusOptions: Array<{ value: StatusType; label: string }> = [
  { value: "promotion", label: "โปรโมชั่น" },
  { value: "holiday", label: "วันหยุด" },
];

function calendarPriceStatusLabel(calendarPrice: CalendarDayPrice): string {
  if (calendarPrice.is_hot_deal) return calendarPrice.status_type === "holiday" ? "โปรไฟลุกในวันหยุด" : "โปรไฟลุก";
  const labels: string[] = [];
  const statusLabel = statusOptions.find((option) => option.value === calendarPrice.status_type)?.label;
  if (statusLabel) labels.push(statusLabel);
  if (calendarPrice.is_hot_deal) labels.push("โปรไฟลุก");
  return labels.join(" · ") || "วันปกติ";
}

const thaiConflictDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

const thaiMobileDateFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

function formatConflictDate(date: string): string {
  return thaiConflictDateFormatter.format(new Date(`${date}T12:00:00+07:00`));
}

function mobileSelectionLabel(range: PricingEditorProps["selectedRange"]): string {
  if (!range) return "เลือกวันในปฏิทิน";
  const formatDate = (date: string) => thaiMobileDateFormatter.format(new Date(`${date}T12:00:00+07:00`));
  if (range.startDate === range.endDate) return formatDate(range.startDate);
  return `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`;
}

export function PricingEditor({
  selectedRange,
  mode,
  statusType,
  netPrice,
  showBeforeDays,
  description,
  isSaving,
  conflicts,
  message,
  onModeChange,
  onStatusChange,
  onPriceChange,
  onShowBeforeDaysChange,
  onDescriptionChange,
  onSave,
  onConfirmOverwrite,
  onDelete,
  isDrawer = false,
  onClose,
  onReturnToCalendar,
  inspectorRef,
  propertyName,
  selectedCalendarPrice,
}: PricingEditorProps) {
  const [leadTimeUnit, setLeadTimeUnit] = useState<"days" | "months">("days");
  const monthMode = leadTimeUnit === "months" && (showBeforeDays === "" || Number(showBeforeDays) % 30 === 0);
  const leadTimeFactor = monthMode ? 30 : 1;
  const leadTimeValue = showBeforeDays === "" ? "" : String(Number(showBeforeDays) / leadTimeFactor);
  const leadTimeMax = monthMode ? 12 : 365;
  function changeLeadTime(value: string): void {
    onShowBeforeDaysChange(value === "" ? "" : String(Number(value) * leadTimeFactor));
  }
  function selectLeadTimeUnit(unit: "days" | "months"): void {
    if (unit === "months" && !monthMode) {
      onShowBeforeDaysChange(String(Math.min(12, Math.ceil(Number(showBeforeDays) / 30)) * 30));
    }
    setLeadTimeUnit(unit);
  }
  const disabled = !selectedRange || isSaving;
  const isHotDeal = mode === "hot-deal";
  const selectionStatus = selectedCalendarPrice
    ? calendarPriceStatusLabel(selectedCalendarPrice)
    : "วันปกติ";
  const hasPromotion = selectedCalendarPrice?.status_type === "promotion";
  const hasHotDeal = selectedCalendarPrice?.is_hot_deal === true;
  const drawerSelectionLabel = mobileSelectionLabel(selectedRange);

  function changePrice(delta: number): void {
    const currentPrice = Number(netPrice);
    const nextPrice = Math.max(1, (Number.isFinite(currentPrice) ? currentPrice : 0) + delta);
    onPriceChange(String(nextPrice));
  }

  return (
    <aside
      aria-label="ตั้งค่าราคาพิเศษ"
      aria-modal={isDrawer || undefined}
      className="pricing-editor"
      data-mode={mode}
      id={isDrawer ? "mobile-pricing-drawer" : undefined}
      ref={inspectorRef}
      role={isDrawer ? "dialog" : undefined}
      tabIndex={isDrawer ? undefined : -1}
    >
      {isDrawer ? <div aria-hidden="true" className="mobile-drawer__handle" /> : null}
      <div className="pricing-editor__heading">
        <div className="pricing-editor__identity">
          <span aria-hidden="true" className="pricing-editor__identity-icon"><Tag size={16} strokeWidth={2.3} /></span>
          <div>
            <p className="eyebrow">CELL INSPECTOR</p>
            <h2>ปรับแต่งราคาพิเศษ</h2>
          </div>
        </div>
        {isDrawer && onClose ? (
          <button aria-label="ปิดการตั้งค่าราคา" autoFocus className="drawer-close" onClick={onClose} type="button">×</button>
        ) : null}
      </div>

      <div aria-label="โหมดตั้งราคา" className="pricing-editor__mode-switcher" role="group">
        <button aria-pressed={!isHotDeal} disabled={isSaving} onClick={() => onModeChange("daily-price")} type="button"><Tag aria-hidden="true" size={15} />ราคาพิเศษ</button>
        <button aria-pressed={isHotDeal} disabled={isSaving} onClick={() => onModeChange("hot-deal")} type="button"><span aria-hidden="true" className="hot-deal-flame">🔥</span>โปรไฟลุก</button>
      </div>

      {selectedRange ? (
        <section aria-label="วันที่ที่เลือก" className="pricing-editor__selection-card">
          <div className="pricing-editor__selection-card-header">
            <span>วันที่กำลังเลือก</span>
            <span className="pricing-editor__status-pill" data-status={hasHotDeal ? (selectedCalendarPrice?.status_type === "holiday" ? "holiday-hot-deal" : "hot-deal") : selectedCalendarPrice?.status_type ?? "normal"}>
              {hasPromotion && !hasHotDeal ? <Tag aria-label="โปรโมชั่น" role="img" size={12} /> : null}
              {hasHotDeal ? <span aria-label="โปรไฟลุก" className="hot-deal-flame" role="img">🔥</span> : null}
              {selectionStatus}
            </span>
          </div>
          <strong>{drawerSelectionLabel}</strong>
          <p>{propertyName ?? "บ้านพัก"} · จัดการราคา</p>
        </section>
      ) : null}

      {isDrawer && onReturnToCalendar && !selectedRange ? <button className="pricing-editor__return-to-calendar" onClick={onReturnToCalendar} type="button">เลือกวันในปฏิทิน</button> : null}

      <div className="pricing-editor__fields">
        {isHotDeal ? (
          <>
            <div className="pricing-field">
              <div className="pricing-field__label-row"><label htmlFor="hot-deal-price">ราคา Hot Deal</label><span>ราคาปกติ: ฿1,500</span></div>
              <div className="price-input"><span>THB</span><input aria-label="ราคา Hot Deal" disabled={disabled} id="hot-deal-price" inputMode="numeric" min="1" onChange={(event) => onPriceChange(event.target.value)} type="number" value={netPrice} /></div>
              <div aria-label="ปรับราคา Hot Deal ครั้งละ 200 บาท" className="price-stepper"><button aria-label="-฿200" disabled={disabled} onClick={() => changePrice(-200)} type="button">− ฿200</button><button aria-label="+฿200" disabled={disabled} onClick={() => changePrice(200)} type="button">+ ฿200</button></div>
            </div>
            <div className="pricing-field">
              <div className="pricing-field__label-row">
                <label htmlFor="hot-deal-show-before-days">เริ่มแสดงล่วงหน้า</label>
                <div aria-label="หน่วยระยะเวลา" className="lead-time-units" role="group">
                  <button aria-pressed={!monthMode} disabled={disabled} onClick={() => selectLeadTimeUnit("days")} type="button">รายวัน</button>
                  <button aria-pressed={monthMode} disabled={disabled} onClick={() => selectLeadTimeUnit("months")} type="button">รายเดือน</button>
                </div>
              </div>
              <div className="lead-time-stepper">
                <button aria-label="ลดระยะเวลา" disabled={disabled || Number(leadTimeValue) <= 0} onClick={() => changeLeadTime(String(Math.max(0, Number(leadTimeValue) - 1)))} type="button">−</button>
                <input aria-label="เริ่มแสดงล่วงหน้า" aria-describedby="lead-time-help" disabled={disabled} id="hot-deal-show-before-days" inputMode="numeric" max={leadTimeMax} min="0" step="1" onChange={(event) => changeLeadTime(event.target.value)} type="number" value={leadTimeValue} />
                <span>{monthMode ? "เดือน" : "วัน"}</span>
                <button aria-label="เพิ่มระยะเวลา" disabled={disabled || Number(leadTimeValue) >= leadTimeMax} onClick={() => changeLeadTime(String(Math.min(leadTimeMax, Number(leadTimeValue) + 1)))} type="button">+</button>
              </div>
            </div>
              <div aria-label="ตัวเลือกระยะเวลาแสดง Hot Deal" className="lead-time-presets" role="group">
                {(monthMode ? [1, 3, 6, 12] : [3, 7, 14, 30]).map((days) => (
                  <button
                    aria-pressed={Number(leadTimeValue) === days}
                    disabled={disabled}
                    key={days}
                    onClick={() => changeLeadTime(String(days))}
                    type="button"
                  >
                    {monthMode ? `${days} เดือน` : days === 7 ? "7 วัน (แนะนำ)" : `${days} วัน`}
                  </button>
                ))}
              </div>
            <p className="lead-time-help" id="lead-time-help">กำหนดว่าลูกค้าจะเริ่มเห็นโปรไฟลุกในตารางก่อนวันเข้าพักกี่วัน เช่น ตั้ง 7 วัน ลูกค้าจะเห็นโปรตั้งแต่ 7 วันก่อนวันเข้าพักจนถึงวันเข้าพัก ก่อนช่วงนี้จะยังไม่เห็นโปร{monthMode ? " · 1 เดือน = 30 วัน (เมื่อเปลี่ยนเป็นรายเดือนจะปัดขึ้นเป็นเดือนเต็ม สูงสุด 12 เดือน)" : ""}</p>
          </>
        ) : (
          <>
            <div aria-label="ประเภทราคาพิเศษ" className="pricing-status-picker" role="group">
              <div className="pricing-field__label-row"><span>ประเภทราคาพิเศษ</span><span>เลือก 1 รายการ</span></div>
              <div className="pricing-status-picker__choices">
                <button aria-pressed={statusType === "holiday"} disabled={disabled} onClick={() => onStatusChange("holiday")} type="button"><Sun aria-hidden="true" size={15} />วันหยุด</button>
                <button aria-pressed={statusType === "promotion"} disabled={disabled} onClick={() => onStatusChange("promotion")} type="button"><Tag aria-hidden="true" size={15} />โปรโมชั่น</button>
              </div>
            </div>
            <div className="pricing-editor__base-price"><span><Sparkles aria-hidden="true" size={15} />ราคาสุทธิต่อคืน</span><strong>ราคาปกติ: 1,500 THB</strong></div>
            <div className="pricing-field">
              <div className="price-input"><span>THB</span><input aria-label="ราคาสุทธิ" disabled={disabled} id="pricing-net-price" inputMode="numeric" min="1" onChange={(event) => onPriceChange(event.target.value)} type="number" value={netPrice} /></div>
              <div aria-label="ปรับราคาครั้งละ 200 บาท" className="price-stepper"><button aria-label="-฿200" disabled={disabled} onClick={() => changePrice(-200)} type="button">− ฿200</button><button aria-label="+฿200" disabled={disabled} onClick={() => changePrice(200)} type="button">+ ฿200</button></div>
            </div>
          </>
        )}
        <label className="pricing-editor__description" htmlFor={`${mode}-description`}>
          <span>{isHotDeal ? "รายละเอียด Hot Deal" : "รายละเอียด / เงื่อนไข"}</span>
          <textarea disabled={disabled} id={`${mode}-description`} onChange={(event) => onDescriptionChange(event.target.value)} placeholder={isHotDeal ? "เช่น เงื่อนไขการจองห้อง" : "เช่น เงื่อนไขการจองห้อง"} rows={4} value={description} />
        </label>
      </div>

      {conflicts.length > 0 ? (
        <div className="overwrite-notice" role="status">
          <strong>พบ{isHotDeal ? " Hot Deal" : "ราคาพิเศษ"} {conflicts.length} วันในช่วงที่เลือก</strong>
          <span>ยืนยันเพื่อแทนที่{isHotDeal ? " Hot Deal" : "สถานะเดิม"}ของทุกวันในช่วงนี้</span>
          <ul aria-label={isHotDeal ? "วันที่มี Hot Deal เดิม" : "วันที่มีราคาพิเศษเดิม"} className="overwrite-notice__dates">
            {conflicts.map((date) => <li key={date}>{formatConflictDate(date)}</li>)}
          </ul>
          <button disabled={isSaving} onClick={onConfirmOverwrite} type="button">{isHotDeal ? "ยืนยันการทับ Hot Deal" : "ยืนยันการทับราคา"}</button>
        </div>
      ) : null}
      {message ? <p className="pricing-editor__message" role="status">{message}</p> : null}

      <div className="pricing-editor__actions">
        <button className="button button--primary" disabled={disabled} onClick={onSave} type="button"><Save aria-hidden="true" size={16} />{isSaving ? "กำลังบันทึก…" : isHotDeal ? "บันทึก Hot Deal" : "บันทึกราคาพิเศษ"}</button>
        <button className="button button--secondary" disabled={disabled} onClick={onDelete} type="button"><RotateCcw aria-hidden="true" size={15} />รีเซ็ตเป็นราคาปกติ (฿1,500)</button>
      </div>
    </aside>
  );
}
