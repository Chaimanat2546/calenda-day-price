import { z } from "zod";

import { createClient } from "@/lib/server";
import { rangeInputSchema } from "@/lib/validation/daily-price";
import { apiError } from "@/server/http/api-error";
import type { DailyPriceRepositoryClient } from "@/server/repositories/daily-price-repository";
import {
  getPropertyById,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";
import { applyDailyPriceRange } from "@/server/services/pricing-service";

const propertyIdSchema = z.uuid();
const requestSchema = rangeInputSchema.extend({
  confirmOverwrite: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/daily-prices/range">
): Promise<Response> {
  const { propertyId: rawPropertyId } = await context.params;
  const propertyId = propertyIdSchema.safeParse(rawPropertyId);
  const body = await request.json().catch(() => null);
  const input = requestSchema.safeParse(body);

  if (!propertyId.success || !input.success) {
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

    const result = await applyDailyPriceRange(
      client as unknown as DailyPriceRepositoryClient,
      {
        propertyId: propertyId.data,
        ...input.data,
        confirmed: input.data.confirmOverwrite ?? false,
      }
    );

    if (result.status === "CONFLICT") {
      return apiError("CONFLICT", 409, { dates: result.dates });
    }

    return Response.json({ data: result.data });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}
