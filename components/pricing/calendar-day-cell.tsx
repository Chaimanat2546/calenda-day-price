import { Check, Sun, Tag } from "lucide-react";

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
  const statusLabel = status === "holiday" && isHotDeal ? ", โปรไฟลุกในวันหยุด" : `${visibleStatus ? `, ${statusLabels[visibleStatus]}` : ""}${isHotDeal ? ", โปรไฟลุก" : ""}`;
  const activePrice = hasSpecialPrice ? calendarPrice?.net_price ?? BASE_DAILY_PRICE : BASE_DAILY_PRICE;

  return (
    <button
      aria-label={`เลือกวันที่ ${label}${statusLabel}`}
      aria-describedby={`day-price-${date}`}
      aria-pressed={isSelected || isInRange}
      className={`pricing-day${baseModifier}${hotDealModifier}${hotDealRangeModifier}${selection}`}
      data-date={date}
      title={`${label}${statusLabel} · ${activePrice.toLocaleString("th-TH")} บาทต่อคืน`}
      onClick={() => onSelect(date)}
      type="button"
    >
      <span className="pricing-day__header">
        <span className="pricing-day__number">{day}</span>
        {isSelected ? <Check aria-hidden="true" className="pricing-day__check" size={13} /> : null}
      </span>
      <span className="pricing-day__statuses">
      {visibleStatus === "holiday" && !isHotDeal ? (
        <span className="pricing-day__badge pricing-day__badge--holiday"><Sun aria-label="วันหยุด" role="img" size={13} /><span aria-hidden="true">วันหยุด</span></span>
      ) : null}
      {visibleStatus === "promotion" ? (
        <span className="pricing-day__badge pricing-day__badge--promotion"><Tag aria-label="โปรโมชั่น" className="pricing-day__mark--tag" role="img" size={13} /><span aria-hidden="true">โปรโมชัน</span></span>
      ) : null}
      {isHotDeal ? (
        <span className={`pricing-day__badge pricing-day__badge--${status === "holiday" ? "holiday-hot-deal" : "hot-deal"}`}><span aria-label="โปรไฟลุก" className="hot-deal-flame" role="img">🔥</span><span aria-hidden="true">{status === "holiday" ? "โปรไฟลุกในวันหยุด" : "โปรไฟลุก"}</span></span>
      ) : null}
      </span>
      <span aria-hidden="true" className="pricing-day__price pricing-day__price--mobile">{activePrice.toLocaleString("th-TH")}</span>
      <span aria-hidden="true" className="pricing-day__price pricing-day__price--desktop">฿{activePrice.toLocaleString("th-TH")}</span>
      <span className="sr-only" id={`day-price-${date}`}>{activePrice.toLocaleString("th-TH")} บาทต่อคืน</span>
    </button>
  );
}
