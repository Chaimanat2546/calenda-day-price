import { Sun, Tag } from "lucide-react";

const statuses = [
  { type: "normal", label: "วันปกติ", mark: "" },
  { type: "holiday", label: "วันหยุด", mark: <Sun aria-hidden="true" size={13} /> },
  { type: "promotion", label: "ราคาพิเศษ", mark: <Tag aria-hidden="true" size={13} /> },
  { type: "hot-deal", label: "โปรไฟลุก", mark: "🔥" },
  { type: "holiday-hot-deal", label: "โปรไฟลุกในวันหยุด", mark: "🔥" },
] as const;

export function StatusLegend() {
  return (
    <section aria-label="คำอธิบายสถานะ" className="status-legend">
      {statuses.map((status) => (
        <div className={`status-legend__item status-legend__item--${status.type}`} key={status.type}>
          <span aria-hidden="true" className="status-legend__swatch">{status.mark}</span>
          <span>{status.label}</span>
        </div>
      ))}
    </section>
  );
}
