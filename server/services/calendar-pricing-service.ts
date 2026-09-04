import { addDays, rangeDates, resolveDailyPrice } from "@/lib/dates";
import type {
  CalendarDayPrice,
  DailyPrice,
  HotDeal,
} from "@/server/types/pricing";

type BuildCalendarDayPricesInput = {
  startDate: string;
  endDate: string;
  today: string;
  dailyPrices: DailyPrice[];
  hotDeals: HotDeal[];
};

export function buildCalendarDayPrices({
  startDate,
  endDate,
  today,
  dailyPrices,
  hotDeals,
}: BuildCalendarDayPricesInput): CalendarDayPrice[] {
  const dailyPricesByDate = new Map(dailyPrices.map((price) => [price.date, price]));
  const hotDealsByDate = new Map(hotDeals.map((deal) => [deal.date, deal]));

  return rangeDates(startDate, endDate).map((date) => {
    const dailyPrice = dailyPricesByDate.get(date);
    const hotDeal = hotDealsByDate.get(date);
    const isHotDealActive =
      hotDeal !== undefined &&
      today <= date &&
      date <= addDays(today, hotDeal.show_before_days);

    return {
      date,
      status_type: dailyPrice?.status_type ?? null,
      net_price: isHotDealActive ? hotDeal.net_price : resolveDailyPrice(dailyPrice),
      is_hot_deal: isHotDealActive,
    };
  });
}
