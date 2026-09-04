import type { Ref } from "react";

import type { StatusType } from "@/server/types/pricing";

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
  inspectorRef?: Ref<HTMLElement>;
};

const statusOptions: Array<{ value: StatusType; label: string }> = [
  { value: "promotion", label: "✦ โปรโมชั่น" },
  { value: "holiday", label: "วันหยุด" },
];

function selectionLabel(range: PricingEditorProps["selectedRange"]): string {
  if (!range) return "เลือกวันในปฏิทิน";
  if (range.startDate === range.endDate) return range.startDate;
  return `${range.startDate} — ${range.endDate}`;
}

const thaiConflictDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

function formatConflictDate(date: string): string {
  return thaiConflictDateFormatter.format(new Date(`${date}T12:00:00+07:00`));
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
  inspectorRef,
}: PricingEditorProps) {
  const disabled = !selectedRange || isSaving;
  const isHotDeal = mode === "hot-deal";
  const selectionStatus = isHotDeal ? "โปรไฟลุก" : statusOptions.find((option) => option.value === statusType)?.label ?? "ราคาพิเศษ";

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
      id={isDrawer ? "mobile-pricing-drawer" : undefined}
      ref={inspectorRef}
      role={isDrawer ? "dialog" : undefined}
      tabIndex={isDrawer ? undefined : -1}
    >
      <div className="pricing-editor__heading">
        <div>
          <p className="eyebrow">CELL INSPECTOR</p>
          <h2>ตั้งค่าราคาพิเศษ</h2>
        </div>
        {isDrawer && onClose ? (
          <button aria-label="ปิดการตั้งค่าราคา" autoFocus className="drawer-close" onClick={onClose} type="button">×</button>
        ) : null}
        <p className="pricing-editor__range">{selectionLabel(selectedRange)}</p>
        {selectedRange ? <span className="pricing-editor__status-pill">{selectionStatus}</span> : null}
      </div>

      <div aria-label="โหมดตั้งราคา" className="pricing-editor__mode-switcher" role="group">
        <button aria-pressed={!isHotDeal} disabled={isSaving} onClick={() => onModeChange("daily-price")} type="button">ราคาพิเศษ</button>
        <button aria-pressed={isHotDeal} disabled={isSaving} onClick={() => onModeChange("hot-deal")} type="button">🔥 โปรไฟลุก</button>
      </div>

      <div className="pricing-editor__base-price"><span>ราคาปกติ</span><strong>฿1,500</strong></div>

      <div className="pricing-editor__fields">
        {isHotDeal ? (
          <>
            <label htmlFor="hot-deal-price">
              <span>ราคา Hot Deal</span>
              <div className="price-input"><span>฿</span><input aria-label="ราคา Hot Deal" disabled={disabled} id="hot-deal-price" inputMode="numeric" min="1" onChange={(event) => onPriceChange(event.target.value)} type="number" value={netPrice} /></div>
              <div aria-label="ปรับราคา Hot Deal ครั้งละ 200 บาท" className="price-stepper"><button aria-label="-฿200" disabled={disabled} onClick={() => changePrice(-200)} type="button">− ฿200</button><button aria-label="+฿200" disabled={disabled} onClick={() => changePrice(200)} type="button">+ ฿200</button></div>
            </label>
            <label htmlFor="hot-deal-show-before-days">
              <span>เริ่มแสดงล่วงหน้า</span>
              <input aria-label="เริ่มแสดงล่วงหน้า" disabled={disabled} id="hot-deal-show-before-days" inputMode="numeric" max="365" min="0" onChange={(event) => onShowBeforeDaysChange(event.target.value)} type="number" value={showBeforeDays} />
            </label>
          </>
        ) : (
          <>
            <label htmlFor="pricing-status">
              <span>สถานะ</span>
              <select disabled={disabled} id="pricing-status" onChange={(event) => onStatusChange(event.target.value as StatusType)} value={statusType}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor="pricing-net-price">
              <span>ราคาสุทธิ</span>
              <div className="price-input"><span>฿</span><input aria-label="ราคาสุทธิ" disabled={disabled} id="pricing-net-price" inputMode="numeric" min="1" onChange={(event) => onPriceChange(event.target.value)} type="number" value={netPrice} /></div>
              <div aria-label="ปรับราคาครั้งละ 200 บาท" className="price-stepper"><button aria-label="-฿200" disabled={disabled} onClick={() => changePrice(-200)} type="button">− ฿200</button><button aria-label="+฿200" disabled={disabled} onClick={() => changePrice(200)} type="button">+ ฿200</button></div>
            </label>
          </>
        )}
        <label htmlFor={`${mode}-description`}>
          <span>{isHotDeal ? "รายละเอียด Hot Deal" : "รายละเอียด"}</span>
          <textarea disabled={disabled} id={`${mode}-description`} onChange={(event) => onDescriptionChange(event.target.value)} placeholder={isHotDeal ? "เช่น ดีลจองด่วน" : "เช่น โปรสงกรานต์"} rows={4} value={description} />
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
        <button className="button button--primary" disabled={disabled} onClick={onSave} type="button">{isSaving ? "กำลังบันทึก…" : isHotDeal ? "บันทึก Hot Deal" : "บันทึกราคาพิเศษ"}</button>
        <button className="button button--danger" disabled={disabled} onClick={onDelete} type="button">รีเซ็ตเป็นราคาปกติ</button>
      </div>
    </aside>
  );
}
