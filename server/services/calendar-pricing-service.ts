import { addDays, rangeDates, resolveDailyPrice } from "@/lib/dates";
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

export type PublicCalendarDayPrice = CalendarDayPrice & { description: string | null };

export function buildPublicCalendarDayPrices(input: BuildCalendarDayPricesInput & { today: string }): PublicCalendarDayPrice[] {
  const visibleDeals = input.hotDeals.filter(deal => input.today <= deal.date && input.today >= addDays(deal.date, -deal.show_before_days));
  const descriptions = new Map(input.dailyPrices.map(day => [day.date, day.description]));
  for (const deal of visibleDeals) descriptions.set(deal.date, deal.description);
  return buildCalendarDayPrices({ ...input, hotDeals: visibleDeals }).map(day => ({ ...day, description: descriptions.get(day.date) ?? null }));
}

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
