import { rangeDates, resolveDailyPrice } from "@/lib/dates";
import type {
  CalendarDayPrice,
  DailyPrice,
  HotDeal,
} from "@/server/types/pricing";

type BuildCalendarDayPricesInput = {
  startDate: string;
  endDate: string;
  dailyPrices: DailyPrice[];
  hotDeals: HotDeal[];
};

export function buildCalendarDayPrices({
  startDate,
  endDate,
  dailyPrices,
  hotDeals,
}: BuildCalendarDayPricesInput): CalendarDayPrice[] {
  const dailyPricesByDate = new Map(dailyPrices.map((price) => [price.date, price]));
  const hotDealsByDate = new Map(hotDeals.map((deal) => [deal.date, deal]));

  return rangeDates(startDate, endDate).map((date) => {
    const dailyPrice = dailyPricesByDate.get(date);
    const hotDeal = hotDealsByDate.get(date);
    const isHotDealConfigured = hotDeal !== undefined;

    return {
      date,
      status_type: dailyPrice?.status_type ?? null,
      net_price: isHotDealConfigured ? hotDeal.net_price : resolveDailyPrice(dailyPrice),
      is_hot_deal: isHotDealConfigured,
    };
  });
}
