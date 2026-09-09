import { z } from "zod";
import { createClient } from "@/lib/server";
import { getProperties, getPropertyById, type PropertyRepositoryClient } from "@/server/repositories/property-repository";
import { getDailyPricesInRange, type DailyPriceRepositoryClient } from "@/server/repositories/daily-price-repository";
import { getHotDealsInRange, type HotDealRepositoryClient } from "@/server/repositories/hot-deal-repository";
import { buildPublicCalendarDayPrices } from "./calendar-pricing-service";

export function bangkokToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function getPublicProperties() {
  return getProperties(await createClient() as unknown as PropertyRepositoryClient);
}

export async function getPublicPropertyCalendar(propertyId: string, requestedMonth?: string) {
  if (!z.uuid().safeParse(propertyId).success) return null;
  const today = bangkokToday();
  const month = requestedMonth && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = `${month}-${new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()}`;
  const client = await createClient();
  const property = await getPropertyById(client as unknown as PropertyRepositoryClient, propertyId);
  if (!property) return null;
  const [dailyPrices, hotDeals] = await Promise.all([
    getDailyPricesInRange(client as unknown as DailyPriceRepositoryClient, propertyId, startDate, endDate),
    getHotDealsInRange(client as unknown as HotDealRepositoryClient, propertyId, startDate, endDate),
  ]);
  return { property, today, month, days: buildPublicCalendarDayPrices({ startDate, endDate, dailyPrices, hotDeals, today }) };
}
