import { expect, test } from "vitest";
import { buildPublicCalendarDayPrices } from "@/server/services/calendar-pricing-service";
import type { DailyPrice, HotDeal } from "@/server/types/pricing";

const deal: HotDeal = { id: "deal", property_id: "house", date: "2026-09-20", net_price: 990, show_before_days: 7, description: "จองขั้นต่ำ 2 คืน", created_at: "", updated_at: "" };
const daily: DailyPrice = { id: "daily", property_id: "house", date: "2026-09-20", net_price: 1900, status_type: "holiday", description: "ราคาวันหยุด", created_at: "", updated_at: "" };
const input = { startDate: deal.date, endDate: deal.date, dailyPrices: [daily], hotDeals: [deal] };
test.each([['2026-09-12', false, 1900], ['2026-09-13', true, 990], ['2026-09-20', true, 990], ['2026-09-21', false, 1900]])("applies the visibility window on %s", (today, visible, price) => {
  const result = buildPublicCalendarDayPrices({ ...input, today });
  expect(result[0]).toMatchObject({ is_hot_deal: visible, net_price: price, status_type: "holiday", description: visible ? deal.description : daily.description });
  if (!visible) expect(JSON.stringify(result)).not.toContain(deal.description);
});
test("uses the base price when a future deal has no daily override", () => {
  expect(buildPublicCalendarDayPrices({ ...input, dailyPrices: [], today: "2026-09-12" })[0]).toMatchObject({ net_price: 1500, is_hot_deal: false, description: null });
});
test("zero days shows a deal only on its stay date", () => {
  const zero = { ...input, hotDeals: [{ ...deal, show_before_days: 0 }] };
  expect(buildPublicCalendarDayPrices({ ...zero, today: "2026-09-19" })[0].is_hot_deal).toBe(false);
  expect(buildPublicCalendarDayPrices({ ...zero, today: "2026-09-20" })[0].is_hot_deal).toBe(true);
});
