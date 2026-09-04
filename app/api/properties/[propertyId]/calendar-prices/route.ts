import { z } from "zod";

import { createClient } from "@/lib/server";
import { dateRangeSchema } from "@/lib/validation/daily-price";
import { apiError } from "@/server/http/api-error";
import {
  getDailyPricesInRange,
  type DailyPriceRepositoryClient,
} from "@/server/repositories/daily-price-repository";
import {
  getHotDealsInRange,
  type HotDealRepositoryClient,
} from "@/server/repositories/hot-deal-repository";
import {
  getPropertyById,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";
import { buildCalendarDayPrices } from "@/server/services/calendar-pricing-service";

const propertyIdSchema = z.uuid();

function getBangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/calendar-prices">
): Promise<Response> {
  const { propertyId: rawPropertyId } = await context.params;
  const propertyId = propertyIdSchema.safeParse(rawPropertyId);
  const url = new URL(request.url);
  const range = dateRangeSchema.safeParse({
    startDate: url.searchParams.get("from"),
    endDate: url.searchParams.get("to"),
  });

  if (!propertyId.success || !range.success) {
    return apiError("VALIDATION_ERROR", 400);
  }

  try {
    const client = await createClient();
    const property = await getPropertyById(
      client as unknown as PropertyRepositoryClient,
      propertyId.data
    );
    if (!property) {
      return apiError("NOT_FOUND", 404);
    }

    const today = getBangkokToday();
    const [dailyPrices, hotDeals] = await Promise.all([
      getDailyPricesInRange(
        client as unknown as DailyPriceRepositoryClient,
        propertyId.data,
        range.data.startDate,
        range.data.endDate
      ),
      getHotDealsInRange(
        client as unknown as HotDealRepositoryClient,
        propertyId.data,
        range.data.startDate,
        range.data.endDate
      ),
    ]);

    return Response.json({
      data: buildCalendarDayPrices({
        ...range.data,
        today,
        dailyPrices,
        hotDeals,
      }),
    });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}
