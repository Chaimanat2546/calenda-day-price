import type { CalendarDayPrice, StatusType } from "@/server/types/pricing";

type CalendarDayCellProps = {
  date: string;
  day: number;
  label: string;
  calendarPrice?: CalendarDayPrice;
  isSelected: boolean;
  isInRange: boolean;
  onSelect: (date: string) => void;
};

const statusLabels: Record<StatusType, string> = {
  holiday: "วันหยุด",
  promotion: "โปรโมชั่น",
};

export function CalendarDayCell({
  date,
  day,
  label,
  calendarPrice,
  isSelected,
  isInRange,
  onSelect,
}: CalendarDayCellProps) {
  const status = calendarPrice?.status_type;
  const baseModifier = status ? ` pricing-day--${status}` : "";
  const hotDealModifier = calendarPrice?.is_hot_deal ? " pricing-day--hot-deal" : "";
  const selection = isSelected
    ? " pricing-day--selected"
    : isInRange
      ? " pricing-day--in-range"
      : "";
  const statusLabel = `${status ? `, ${statusLabels[status]}` : ""}${calendarPrice?.is_hot_deal ? ", Hot Deal" : ""}`;

  return (
    <button
      aria-label={`เลือกวันที่ ${label}${statusLabel}`}
      className={`pricing-day${baseModifier}${hotDealModifier}${selection}`}
      data-date={date}
      onClick={() => onSelect(date)}
      type="button"
    >
      <span className="pricing-day__number">{day}</span>
      {status === "promotion" ? (
        <span aria-label="โปรโมชั่น" className="pricing-day__mark pricing-day__mark--tag" role="img">✦</span>
      ) : null}
      {calendarPrice?.is_hot_deal ? (
        <span aria-label="Hot Deal" className="pricing-day__mark" role="img">🔥</span>
      ) : null}
      {calendarPrice ? <span className="pricing-day__price">฿{calendarPrice.net_price.toLocaleString("th-TH")}</span> : null}
    </button>
  );
}
