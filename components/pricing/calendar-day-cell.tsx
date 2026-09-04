import type { DailyPrice } from "@/server/types/pricing";

type CalendarDayCellProps = {
  date: string;
  day: number;
  label: string;
  dailyPrice?: DailyPrice;
  isSelected: boolean;
  isInRange: boolean;
  onSelect: (date: string) => void;
};

export function CalendarDayCell({
  date,
  day,
  label,
  dailyPrice,
  isSelected,
  isInRange,
  onSelect,
}: CalendarDayCellProps) {
  const status = dailyPrice?.status_type;
  const modifier = status ? ` pricing-day--${status}` : "";
  const selection = isSelected
    ? " pricing-day--selected"
    : isInRange
      ? " pricing-day--in-range"
      : "";
  const statusLabel = status ? `, ${status}` : "";

  return (
    <button
      aria-label={`เลือกวันที่ ${label}${statusLabel}`}
      className={`pricing-day${modifier}${selection}`}
      data-date={date}
      onClick={() => onSelect(date)}
      type="button"
    >
      <span className="pricing-day__number">{day}</span>
      {status === "holiday_hot_deal" || status === "hot_deal" ? (
        <span aria-label={status === "holiday_hot_deal" ? "โปรไฟลุกในวันหยุด" : "โปรไฟลุก"} className="pricing-day__mark" role="img">🔥</span>
      ) : null}
      {status === "promotion" ? (
        <span aria-label="โปรโมชั่น" className="pricing-day__mark pricing-day__mark--tag" role="img">✦</span>
      ) : null}
      {dailyPrice ? <span className="pricing-day__price">฿{dailyPrice.net_price.toLocaleString("th-TH")}</span> : null}
    </button>
  );
}
