import { BASE_DAILY_PRICE, type DailyPrice } from "@/server/types/pricing";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function rangeDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  for (let current = start; current <= end; current = new Date(current.getTime() + MS_PER_DAY)) {
    dates.push(current.toISOString().slice(0, 10));
  }

  return dates;
}

export function resolveDailyPrice(override: DailyPrice | undefined): number {
  return override?.net_price ?? BASE_DAILY_PRICE;
}
