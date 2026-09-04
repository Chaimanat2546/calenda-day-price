import { z } from "zod";

import { createClient } from "@/lib/server";
import { dateRangeSchema } from "@/lib/validation/daily-price";
import { apiError } from "@/server/http/api-error";
import {
  getPropertyById,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";
import {
  checkDailyPriceConflicts,
} from "@/server/services/pricing-service";
import type { DailyPriceRepositoryClient } from "@/server/repositories/daily-price-repository";

const propertyIdSchema = z.uuid();

export async function POST(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/daily-prices/conflicts">
): Promise<Response> {
  const { propertyId: rawPropertyId } = await context.params;
  const propertyId = propertyIdSchema.safeParse(rawPropertyId);
  const body = await request.json().catch(() => null);
  const range = dateRangeSchema.safeParse(body);

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

    const { dates } = await checkDailyPriceConflicts(
      client as unknown as DailyPriceRepositoryClient,
      { propertyId: propertyId.data, ...range.data }
    );
    return Response.json({ data: { conflicts: dates } });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}
