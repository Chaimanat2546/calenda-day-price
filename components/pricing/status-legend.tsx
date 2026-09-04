const statuses = [
  { type: "normal", label: "วันปกติ", mark: "" },
  { type: "holiday", label: "วันหยุด", mark: "" },
  { type: "promotion", label: "ราคาพิเศษ", mark: "✦" },
  { type: "hot-deal", label: "โปรไฟลุก", mark: "🔥" },
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
