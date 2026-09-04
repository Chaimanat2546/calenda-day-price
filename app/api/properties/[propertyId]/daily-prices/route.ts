import { z } from "zod";

import { createClient } from "@/lib/server";
import { dateRangeSchema } from "@/lib/validation/daily-price";
import { apiError } from "@/server/http/api-error";
import {
  getDailyPricesInRange,
  type DailyPriceRepositoryClient,
} from "@/server/repositories/daily-price-repository";
import {
  getPropertyById,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";
import { deleteDailyPriceRange } from "@/server/services/pricing-service";

const propertyIdSchema = z.uuid();

async function getValidatedPropertyId(
  context: RouteContext<"/api/properties/[propertyId]/daily-prices">
): Promise<string | null> {
  const { propertyId } = await context.params;
  const result = propertyIdSchema.safeParse(propertyId);
  return result.success ? result.data : null;
}

async function propertyExists(
  client: PropertyRepositoryClient,
  propertyId: string
): Promise<boolean> {
  return (await getPropertyById(client, propertyId)) !== null;
}

function getRangeFromSearchParams(request: Request) {
  const url = new URL(request.url);
  return dateRangeSchema.safeParse({
    startDate: url.searchParams.get("from"),
    endDate: url.searchParams.get("to"),
  });
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/daily-prices">
): Promise<Response> {
  const propertyId = await getValidatedPropertyId(context);
  const range = getRangeFromSearchParams(request);

  if (!propertyId || !range.success) {
    return apiError("VALIDATION_ERROR", 400);
  }

  try {
    const client = await createClient();
    if (!(await propertyExists(client as unknown as PropertyRepositoryClient, propertyId))) {
      return apiError("NOT_FOUND", 404);
    }

    const data = await getDailyPricesInRange(
      client as unknown as DailyPriceRepositoryClient,
      propertyId,
      range.data.startDate,
      range.data.endDate
    );
    return Response.json({ data });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/properties/[propertyId]/daily-prices">
): Promise<Response> {
  const propertyId = await getValidatedPropertyId(context);
  const range = getRangeFromSearchParams(request);

  if (!propertyId || !range.success) {
    return apiError("VALIDATION_ERROR", 400);
  }

  try {
    const client = await createClient();
    if (!(await propertyExists(client as unknown as PropertyRepositoryClient, propertyId))) {
      return apiError("NOT_FOUND", 404);
    }

    const deleted = await deleteDailyPriceRange(
      client as unknown as DailyPriceRepositoryClient,
      { propertyId, ...range.data }
    );
    return Response.json({ data: { deleted: deleted.length } });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}
