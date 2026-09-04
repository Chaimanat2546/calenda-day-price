import type { CalendarDayPrice, StatusType } from "@/server/types/pricing";
import { BASE_DAILY_PRICE } from "@/server/types/pricing";

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

function formatCompactPrice(price: number): string {
  const thousands = price / 1000;
  return `฿${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
}

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
  const isHotDeal = calendarPrice?.is_hot_deal === true;
  const visibleStatus = status === "promotion" && isHotDeal ? null : status;
  const baseModifier = visibleStatus ? ` pricing-day--${visibleStatus}` : "";
  const hotDealModifier = isHotDeal ? " pricing-day--hot-deal" : "";
  const hotDealRangeModifier = isHotDeal && isInRange ? " pricing-day--hot-deal-in-range" : "";
  const hasSpecialPrice = Boolean(status || calendarPrice?.is_hot_deal);
  const selection = isSelected
    ? " pricing-day--selected"
    : isInRange
      ? " pricing-day--in-range"
      : "";
  const statusLabel = `${visibleStatus ? `, ${statusLabels[visibleStatus]}` : ""}${isHotDeal ? ", โปรไฟลุก" : ""}`;
  const activePrice = hasSpecialPrice ? calendarPrice?.net_price ?? BASE_DAILY_PRICE : BASE_DAILY_PRICE;

  return (
    <button
      aria-label={`เลือกวันที่ ${label}${statusLabel}`}
      className={`pricing-day${baseModifier}${hotDealModifier}${hotDealRangeModifier}${selection}`}
      data-date={date}
      onClick={() => onSelect(date)}
      type="button"
    >
      <span className="pricing-day__number">{day}</span>
      {visibleStatus === "promotion" ? (
        <span aria-label="โปรโมชั่น" className="pricing-day__mark pricing-day__mark--tag" role="img">✦</span>
      ) : null}
      {isHotDeal ? (
        <span aria-label="โปรไฟลุก" className="pricing-day__mark" role="img">🔥</span>
      ) : null}
      <span aria-hidden="true" className="pricing-day__price pricing-day__price--mobile">{formatCompactPrice(activePrice)}</span>
      <span className="pricing-day__price pricing-day__price--desktop">฿{activePrice.toLocaleString("th-TH")}</span>
      {hasSpecialPrice ? <span className="pricing-day__base-price">฿{BASE_DAILY_PRICE.toLocaleString("th-TH")}</span> : null}
    </button>
  );
}
