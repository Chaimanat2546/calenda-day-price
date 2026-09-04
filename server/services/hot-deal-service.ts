import { rangeDates } from "@/lib/dates";
import type {
  ConflictCheckInput,
  DeleteDailyPriceRangeInput,
  HotDealRangeInput,
} from "@/lib/validation/daily-price";
import {
  deleteHotDealsInRange,
  findHotDealConflicts,
  insertHotDeals,
  type HotDealRepositoryClient,
  type HotDealWrite,
  upsertHotDeals,
} from "@/server/repositories/hot-deal-repository";
import type { HotDeal } from "@/server/types/pricing";

export async function checkHotDealConflicts(
  client: HotDealRepositoryClient,
  input: ConflictCheckInput
): Promise<{ dates: string[] }> {
  return {
    dates: await findHotDealConflicts(
      client,
      input.propertyId,
      input.startDate,
      input.endDate
    ),
  };
}

export async function applyHotDealRange(
  client: HotDealRepositoryClient,
  input: HotDealRangeInput
): Promise<{ status: "CONFLICT"; dates: string[] } | { status: "OK"; data: HotDeal[] }> {
  const rows: HotDealWrite[] = rangeDates(input.startDate, input.endDate).map(
    (date) => ({
      property_id: input.propertyId,
      date,
      net_price: input.netPrice,
      show_before_days: input.showBeforeDays,
      description: input.description ?? null,
    })
  );

  if (input.confirmed) {
    return { status: "OK", data: await upsertHotDeals(client, rows) };
  }

  const inserted = await insertHotDeals(client, rows);
  if (inserted.status === "UNIQUE_VIOLATION") {
    const { dates } = await checkHotDealConflicts(client, input);
    return { status: "CONFLICT", dates };
  }

  return { status: "OK", data: inserted.data };
}

export async function deleteHotDealRange(
  client: HotDealRepositoryClient,
  input: DeleteDailyPriceRangeInput
): Promise<HotDeal[]> {
  return deleteHotDealsInRange(client, input.propertyId, input.startDate, input.endDate);
}
