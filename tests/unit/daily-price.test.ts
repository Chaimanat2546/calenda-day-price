import { describe, expect, test } from "vitest";

import { rangeDates, resolveDailyPrice } from "@/lib/dates";
import { rangeInputSchema } from "@/lib/validation/daily-price";
import {
  applyDailyPriceRange,
  checkDailyPriceConflicts,
} from "@/server/services/pricing-service";
import type { DailyPrice } from "@/server/types/pricing";

const propertyId = "5f0cbf1d-5f78-4dca-a14c-d1fa66379070";

function createDailyPrice(id: string, date: string): DailyPrice {
  return {
    id,
    property_id: propertyId,
    date,
    status_type: "promotion",
    net_price: 2000,
    description: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };
}

describe("daily-price validation and dates", () => {
  test("rejects a non-positive daily price", () => {
    const result = rangeInputSchema.safeParse({
      startDate: "2026-04-15",
      endDate: "2026-04-17",
      statusType: "promotion",
      netPrice: 0,
    });

    expect(result.success).toBe(false);
  });

  test("rejects a reversed date range", () => {
    const result = rangeInputSchema.safeParse({
      startDate: "2026-04-17",
      endDate: "2026-04-15",
      statusType: "promotion",
      netPrice: 2000,
    });

    expect(result.success).toBe(false);
  });

  test("expands an ISO date range inclusively", () => {
    expect(rangeDates("2026-04-15", "2026-04-17")).toEqual([
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
    ]);
  });

  test("uses the base price when a day has no override", () => {
    expect(resolveDailyPrice(undefined)).toBe(1500);
  });
});

describe("pricing service", () => {
  test("returns existing dates without writing an unconfirmed conflicting range", async () => {
    const client = createClient([createDailyPrice("existing", "2026-04-16")]);

    const result = await applyDailyPriceRange(client, {
      propertyId,
      startDate: "2026-04-15",
      endDate: "2026-04-17",
      statusType: "promotion",
      netPrice: 2000,
      description: null,
      confirmed: false,
    });

    expect(result).toEqual({ status: "CONFLICT", dates: ["2026-04-16"] });
    expect(client.writes).toEqual([]);
  });

  test("reports conflicts for the selected range", async () => {
    const client = createClient([createDailyPrice("existing", "2026-04-16")]);

    await expect(
      checkDailyPriceConflicts(client, {
        propertyId,
        startDate: "2026-04-15",
        endDate: "2026-04-17",
      })
    ).resolves.toEqual({ dates: ["2026-04-16"] });
  });

  test("writes a complete daily row for every confirmed date", async () => {
    const client = createClient();

    const result = await applyDailyPriceRange(client, {
      propertyId,
      startDate: "2026-04-15",
      endDate: "2026-04-17",
      statusType: "hot_deal",
      netPrice: 2400,
      description: "สงกรานต์",
      confirmed: true,
    });

    expect(client.writes).toEqual([
      { property_id: propertyId, date: "2026-04-15", status_type: "hot_deal", net_price: 2400, description: "สงกรานต์" },
      { property_id: propertyId, date: "2026-04-16", status_type: "hot_deal", net_price: 2400, description: "สงกรานต์" },
      { property_id: propertyId, date: "2026-04-17", status_type: "hot_deal", net_price: 2400, description: "สงกรานต์" },
    ]);
    expect(result).toMatchObject({ status: "OK" });
  });
});

type PriceRow = Pick<
  DailyPrice,
  "property_id" | "date" | "status_type" | "net_price" | "description"
>;

function createClient(existing: DailyPrice[] = []) {
  const writes: PriceRow[] = [];
  const selectedDates = existing.map(({ date }) => ({ date }));

  const query = {
    eq: () => query,
    gte: () => query,
    lte: () => query,
    lt: () => query,
    order: () => Promise.resolve({ data: selectedDates, error: null }),
    then: (onfulfilled: (result: { data: { date: string }[]; error: null }) => unknown) =>
      Promise.resolve({ data: selectedDates, error: null }).then(onfulfilled),
  };

  return {
    writes,
    from: () => ({
      select: () => query,
      upsert: (rows: PriceRow[]) => {
        writes.push(...rows);
        return {
          select: () => Promise.resolve({ data: rows, error: null }),
        };
      },
      delete: () => query,
    }),
  };
}
