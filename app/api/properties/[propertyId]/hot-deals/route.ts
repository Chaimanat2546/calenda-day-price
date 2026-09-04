import { z } from "zod";

import { createClient } from "@/lib/server";
import { dateRangeSchema } from "@/lib/validation/daily-price";
import { apiError } from "@/server/http/api-error";
import type { HotDealRepositoryClient } from "@/server/repositories/hot-deal-repository";
import {
  getPropertyById,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";
import { deleteHotDealRange } from "@/server/services/hot-deal-service";

const propertyIdSchema = z.uuid();

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/hot-deals">
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

    const deleted = await deleteHotDealRange(
      client as unknown as HotDealRepositoryClient,
      { propertyId: propertyId.data, ...range.data }
    );
    return Response.json({ data: { deleted: deleted.length } });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}
