import { rangeDates } from "@/lib/dates";
import type {
  ConflictCheckInput,
  DeleteDailyPriceRangeInput,
  HotDealRangeInput,
} from "@/lib/validation/daily-price";
import {
  deleteHotDealsInRange,
  findHotDealConflicts,
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
  const { dates } = await checkHotDealConflicts(client, input);

  if (dates.length > 0 && !input.confirmed) {
    return { status: "CONFLICT", dates };
  }

  const rows: HotDealWrite[] = rangeDates(input.startDate, input.endDate).map(
    (date) => ({
      property_id: input.propertyId,
      date,
      net_price: input.netPrice,
      show_before_days: input.showBeforeDays,
      description: input.description ?? null,
    })
  );

  return { status: "OK", data: await upsertHotDeals(client, rows) };
}

export async function deleteHotDealRange(
  client: HotDealRepositoryClient,
  input: DeleteDailyPriceRangeInput
): Promise<HotDeal[]> {
  return deleteHotDealsInRange(client, input.propertyId, input.startDate, input.endDate);
}
