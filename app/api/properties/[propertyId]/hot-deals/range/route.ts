import { z } from "zod";

import { createClient } from "@/lib/server";
import { hotDealRangeSchema } from "@/lib/validation/daily-price";
import { apiError } from "@/server/http/api-error";
import type { HotDealRepositoryClient } from "@/server/repositories/hot-deal-repository";
import {
  getPropertyById,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";
import { applyHotDealRange } from "@/server/services/hot-deal-service";

const propertyIdSchema = z.uuid();
const requestSchema = hotDealRangeSchema.extend({
  confirmOverwrite: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/hot-deals/range">
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

    const result = await applyHotDealRange(
      client as unknown as HotDealRepositoryClient,
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
