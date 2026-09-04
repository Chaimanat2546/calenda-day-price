import type { StatusType } from "@/server/types/pricing";

type PricingEditorProps = {
  selectedRange: { startDate: string; endDate: string } | null;
  statusType: StatusType;
  netPrice: string;
  description: string;
  isSaving: boolean;
  conflicts: string[];
  message: string | null;
  onStatusChange: (value: StatusType) => void;
  onPriceChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onConfirmOverwrite: () => void;
  onDelete: () => void;
  isDrawer?: boolean;
  onClose?: () => void;
};

const statusOptions: Array<{ value: StatusType; label: string }> = [
  { value: "promotion", label: "✦ โปรโมชั่น" },
  { value: "hot_deal", label: "🔥 โปรไฟลุก" },
  { value: "holiday", label: "วันหยุด" },
  { value: "holiday_hot_deal", label: "🔥 โปรไฟลุกในวันหยุด" },
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
  statusType,
  netPrice,
  description,
  isSaving,
  conflicts,
  message,
  onStatusChange,
  onPriceChange,
  onDescriptionChange,
  onSave,
  onConfirmOverwrite,
  onDelete,
  isDrawer = false,
  onClose,
}: PricingEditorProps) {
  const disabled = !selectedRange || isSaving;

  return (
    <aside
      aria-label="ตั้งค่าราคาพิเศษ"
      aria-modal={isDrawer || undefined}
      className="pricing-editor"
      id={isDrawer ? "mobile-pricing-drawer" : undefined}
      role={isDrawer ? "dialog" : undefined}
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
      </div>

      <div className="pricing-editor__base-price"><span>ราคาปกติ</span><strong>฿1,500</strong></div>

      <div className="pricing-editor__fields">
        <label htmlFor="pricing-status">
          <span>สถานะ</span>
          <select disabled={disabled} id="pricing-status" onChange={(event) => onStatusChange(event.target.value as StatusType)} value={statusType}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label htmlFor="pricing-net-price">
          <span>ราคาสุทธิ</span>
          <div className="price-input"><span>฿</span><input aria-label="ราคาสุทธิ" disabled={disabled} id="pricing-net-price" inputMode="numeric" min="1" onChange={(event) => onPriceChange(event.target.value)} type="number" value={netPrice} /></div>
        </label>
        <label htmlFor="pricing-description">
          <span>รายละเอียด</span>
          <textarea disabled={disabled} id="pricing-description" onChange={(event) => onDescriptionChange(event.target.value)} placeholder="เช่น โปรสงกรานต์" rows={4} value={description} />
        </label>
      </div>

      {conflicts.length > 0 ? (
        <div className="overwrite-notice" role="status">
          <strong>พบราคาพิเศษ {conflicts.length} วันในช่วงที่เลือก</strong>
          <span>ยืนยันเพื่อแทนที่สถานะเดิมของทุกวันในช่วงนี้</span>
          <ul aria-label="วันที่มีราคาพิเศษเดิม" className="overwrite-notice__dates">
            {conflicts.map((date) => <li key={date}>{formatConflictDate(date)}</li>)}
          </ul>
          <button disabled={isSaving} onClick={onConfirmOverwrite} type="button">ยืนยันการทับราคา</button>
        </div>
      ) : null}
      {message ? <p className="pricing-editor__message" role="status">{message}</p> : null}

      <div className="pricing-editor__actions">
        <button className="button button--primary" disabled={disabled} onClick={onSave} type="button">{isSaving ? "กำลังบันทึก…" : "บันทึกราคาพิเศษ"}</button>
        <button className="button button--danger" disabled={disabled} onClick={onDelete} type="button">ลบสถานะในช่วงนี้</button>
      </div>
    </aside>
  );
}
