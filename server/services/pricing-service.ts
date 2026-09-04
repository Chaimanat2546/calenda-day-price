import { rangeDates } from "@/lib/dates";
import type {
  ConflictCheckInput,
  DailyPriceRangeInput,
  DeleteDailyPriceRangeInput,
} from "@/lib/validation/daily-price";
import {
  createDailyPriceWrite,
  deleteDailyPricesInRange,
  findDailyPriceConflicts,
  type DailyPriceRepositoryClient,
  upsertDailyPrices,
} from "@/server/repositories/daily-price-repository";
import type { DailyPrice } from "@/server/types/pricing";

export async function checkDailyPriceConflicts(
  client: DailyPriceRepositoryClient,
  input: ConflictCheckInput
): Promise<{ dates: string[] }> {
  return {
    dates: await findDailyPriceConflicts(
      client,
      input.propertyId,
      input.startDate,
      input.endDate
    ),
  };
}

export async function applyDailyPriceRange(
  client: DailyPriceRepositoryClient,
  input: DailyPriceRangeInput
): Promise<{ status: "CONFLICT"; dates: string[] } | { status: "OK"; data: DailyPrice[] }> {
  const { dates } = await checkDailyPriceConflicts(client, input);

  if (dates.length > 0 && !input.confirmed) {
    return { status: "CONFLICT", dates };
  }

  const rows = rangeDates(input.startDate, input.endDate).map((date) =>
    createDailyPriceWrite(
      input.propertyId,
      date,
      input.statusType,
      input.netPrice,
      input.description ?? null
    )
  );

  return { status: "OK", data: await upsertDailyPrices(client, rows) };
}

export async function deleteDailyPriceRange(
  client: DailyPriceRepositoryClient,
  input: DeleteDailyPriceRangeInput
): Promise<DailyPrice[]> {
  return deleteDailyPricesInRange(client, input.propertyId, input.startDate, input.endDate);
}
