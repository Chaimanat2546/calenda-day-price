import type { StatusType } from "@/server/types/pricing";

const statuses: Array<{ type: StatusType; label: string; mark: string }> = [
  { type: "holiday_hot_deal", label: "โปรไฟลุกในวันหยุด", mark: "🔥" },
  { type: "holiday", label: "วันหยุด", mark: "" },
  { type: "hot_deal", label: "โปรไฟลุก", mark: "🔥" },
  { type: "promotion", label: "โปรโมชั่น", mark: "✦" },
];

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
