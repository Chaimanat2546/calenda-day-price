import { describe, expect, test } from "vitest";

import { rangeDates, resolveDailyPrice } from "@/lib/dates";
import * as dailyPriceValidation from "@/lib/validation/daily-price";
import {
  applyDailyPriceRange,
  checkDailyPriceConflicts,
  deleteDailyPriceRange,
} from "@/server/services/pricing-service";
import {
  applyHotDealRange,
  checkHotDealConflicts,
  deleteHotDealRange,
} from "@/server/services/hot-deal-service";
import { buildCalendarDayPrices } from "@/server/services/calendar-pricing-service";
import type { DailyPriceRepositoryClient } from "@/server/repositories/daily-price-repository";
import type { HotDealRepositoryClient } from "@/server/repositories/hot-deal-repository";
import type { DailyPrice, HotDeal } from "@/server/types/pricing";

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

function createHotDeal(id: string, date: string, showBeforeDays = 7): HotDeal {
  return {
    id,
    property_id: propertyId,
    date,
    net_price: 1990,
    show_before_days: showBeforeDays,
    description: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };
}

describe("daily-price validation and dates", () => {
  const hotDealRangeSchema = Reflect.get(
    dailyPriceValidation,
    "hotDealRangeSchema"
  ) as
    | {
        safeParse: (input: unknown) => { success: boolean };
      }
    | undefined;

  test("accepts a valid seven-day hot deal range", () => {
    expect(
      hotDealRangeSchema?.safeParse({
        startDate: "2026-12-20",
        endDate: "2026-12-26",
        netPrice: 1990,
        showBeforeDays: 7,
        description: "ปลายปี",
      }).success
    ).toBe(true);
  });

  test("rejects a hot deal lead time greater than 365 days", () => {
    expect(
      hotDealRangeSchema?.safeParse({
        startDate: "2026-12-20",
        endDate: "2026-12-26",
        netPrice: 1990,
        showBeforeDays: 366,
      }).success
    ).toBe(false);
  });

  test("rejects removed hot_deal as a daily price status", () => {
    const result = dailyPriceValidation.rangeInputSchema.safeParse({
      startDate: "2026-12-20",
      endDate: "2026-12-20",
      statusType: "hot_deal",
      netPrice: 1990,
    });

    expect(result.success).toBe(false);
  });

  test("rejects a non-positive daily price", () => {
    const result = dailyPriceValidation.rangeInputSchema.safeParse({
      startDate: "2026-04-15",
      endDate: "2026-04-17",
      statusType: "promotion",
      netPrice: 0,
    });

    expect(result.success).toBe(false);
  });

  test("rejects a reversed date range", () => {
    const result = dailyPriceValidation.rangeInputSchema.safeParse({
      startDate: "2026-04-17",
      endDate: "2026-04-15",
      statusType: "promotion",
      netPrice: 2000,
    });

    expect(result.success).toBe(false);
  });

  test("limits an inclusive date range to 366 days", () => {
    expect(
      dailyPriceValidation.dateRangeSchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2027-01-01",
      }).success
    ).toBe(true);
    expect(
      dailyPriceValidation.dateRangeSchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2027-01-02",
      }).success
    ).toBe(false);
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
      statusType: "promotion",
      netPrice: 2400,
      description: "สงกรานต์",
      confirmed: true,
    });

    expect(client.writes).toEqual([
      { property_id: propertyId, date: "2026-04-15", status_type: "promotion", net_price: 2400, description: "สงกรานต์" },
      { property_id: propertyId, date: "2026-04-16", status_type: "promotion", net_price: 2400, description: "สงกรานต์" },
      { property_id: propertyId, date: "2026-04-17", status_type: "promotion", net_price: 2400, description: "สงกรานต์" },
    ]);
    expect(result).toMatchObject({ status: "OK" });
  });

  test("returns every row deleted from an inclusive date range", async () => {
    const first = createDailyPrice("first", "2026-04-15");
    const last = createDailyPrice("last", "2026-04-17");
    const client = createClient([first, last]);

    await expect(
      deleteDailyPriceRange(client, {
        propertyId,
        startDate: "2026-04-15",
        endDate: "2026-04-17",
      })
    ).resolves.toEqual([first, last]);
  });
});

describe("hot deal pricing", () => {
  test("returns a conflict without writing an unconfirmed overlapping hot deal", async () => {
    const client = createHotDealClient([createHotDeal("existing", "2026-12-21")]);

    const result = await applyHotDealRange(client, {
      propertyId,
      startDate: "2026-12-20",
      endDate: "2026-12-22",
      netPrice: 1990,
      showBeforeDays: 7,
      description: null,
      confirmed: false,
    });

    expect(result).toEqual({ status: "CONFLICT", dates: ["2026-12-21"] });
    expect(client.writes).toEqual([]);
  });

  test("returns the current conflict after an unconfirmed insert loses a race", async () => {
    const concurrentDeal = createHotDeal("concurrent", "2026-12-21");
    const client = createHotDealClient([], {
      concurrentDeal,
      insertError: { code: "23505", message: "duplicate key value" },
    });

    const result = await applyHotDealRange(client, {
      propertyId,
      startDate: "2026-12-20",
      endDate: "2026-12-22",
      netPrice: 1990,
      showBeforeDays: 7,
      description: null,
      confirmed: false,
    });

    expect(result).toEqual({ status: "CONFLICT", dates: ["2026-12-21"] });
    expect(client.upserts).toEqual([]);
  });

  test("preserves an ordinary unconfirmed insert error", async () => {
    const client = createHotDealClient([], {
      insertError: { code: "42501", message: "permission denied" },
    });

    await expect(
      applyHotDealRange(client, {
        propertyId,
        startDate: "2026-12-20",
        endDate: "2026-12-22",
        netPrice: 1990,
        showBeforeDays: 7,
        description: null,
        confirmed: false,
      })
    ).rejects.toThrow("Unable to access hot deals");
    expect(client.upserts).toEqual([]);
  });

  test("reports conflicts for the selected hot deal range", async () => {
    const client = createHotDealClient([createHotDeal("existing", "2026-12-21")]);

    await expect(
      checkHotDealConflicts(client, {
        propertyId,
        startDate: "2026-12-20",
        endDate: "2026-12-22",
      })
    ).resolves.toEqual({ dates: ["2026-12-21"] });
  });

  test("writes a complete hot deal row for every confirmed date", async () => {
    const client = createHotDealClient();

    const result = await applyHotDealRange(client, {
      propertyId,
      startDate: "2026-12-20",
      endDate: "2026-12-22",
      netPrice: 1990,
      showBeforeDays: 7,
      description: "ปลายปี",
      confirmed: true,
    });

    expect(client.writes).toEqual([
      { property_id: propertyId, date: "2026-12-20", net_price: 1990, show_before_days: 7, description: "ปลายปี" },
      { property_id: propertyId, date: "2026-12-21", net_price: 1990, show_before_days: 7, description: "ปลายปี" },
      { property_id: propertyId, date: "2026-12-22", net_price: 1990, show_before_days: 7, description: "ปลายปี" },
    ]);
    expect(result).toMatchObject({ status: "OK" });
  });

  test("returns every hot deal row deleted from an inclusive date range", async () => {
    const first = createHotDeal("first", "2026-12-20");
    const last = createHotDeal("last", "2026-12-22");
    const client = createHotDealClient([first, last]);

    await expect(
      deleteHotDealRange(client, {
        propertyId,
        startDate: "2026-12-20",
        endDate: "2026-12-22",
      })
    ).resolves.toEqual([first, last]);
  });

  test("activates each date independently from its lead time", () => {
    expect(
      buildCalendarDayPrices({
        startDate: "2026-12-20",
        endDate: "2026-12-21",
        today: "2026-12-13",
        dailyPrices: [],
        hotDeals: [
          createHotDeal("first", "2026-12-20", 7),
          createHotDeal("second", "2026-12-21", 7),
        ],
      }).map((day) => day.is_hot_deal)
    ).toEqual([true, false]);
  });

  test("uses active hot deal price while keeping the holiday status", () => {
    expect(
      buildCalendarDayPrices({
        startDate: "2026-12-20",
        endDate: "2026-12-20",
        today: "2026-12-13",
        dailyPrices: [{ ...createDailyPrice("holiday", "2026-12-20"), status_type: "holiday" }],
        hotDeals: [createHotDeal("deal", "2026-12-20", 7)],
      })[0]
    ).toMatchObject({
      status_type: "holiday",
      net_price: 1990,
      is_hot_deal: true,
    });
  });

  test("leaves the ordinary price when a hot deal is inactive", () => {
    expect(
      buildCalendarDayPrices({
        startDate: "2026-12-21",
        endDate: "2026-12-21",
        today: "2026-12-13",
        dailyPrices: [createDailyPrice("promotion", "2026-12-21")],
        hotDeals: [createHotDeal("deal", "2026-12-21", 7)],
      })[0]
    ).toMatchObject({
      status_type: "promotion",
      net_price: 2000,
      is_hot_deal: false,
    });
  });

  test("treats a hot deal as inactive after its deal date", () => {
    expect(
      buildCalendarDayPrices({
        startDate: "2026-12-20",
        endDate: "2026-12-20",
        today: "2026-12-21",
        dailyPrices: [createDailyPrice("promotion", "2026-12-20")],
        hotDeals: [createHotDeal("expired", "2026-12-20", 7)],
      })[0]
    ).toMatchObject({
      status_type: "promotion",
      net_price: 2000,
      is_hot_deal: false,
    });
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
    order: () => query,
    then: (onfulfilled: (result: { data: { date: string }[]; error: null }) => unknown) =>
      Promise.resolve({ data: selectedDates, error: null }).then(onfulfilled),
  };

  const deleteQuery = {
    eq: () => deleteQuery,
    gte: () => deleteQuery,
    lte: () => deleteQuery,
    lt: () => deleteQuery,
    order: () => deleteQuery,
    select: () => Promise.resolve({ data: existing, error: null }),
    then: (onfulfilled: (result: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onfulfilled),
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
      delete: () => deleteQuery,
    }),
  } as unknown as DailyPriceRepositoryClient & { writes: PriceRow[] };
}

type HotDealRow = Pick<
  HotDeal,
  "property_id" | "date" | "net_price" | "show_before_days" | "description"
>;

type HotDealClientOptions = {
  concurrentDeal?: HotDeal;
  insertError?: { code: string; message: string };
};

function createHotDealClient(
  existing: HotDeal[] = [],
  options: HotDealClientOptions = {}
) {
  const writes: HotDealRow[] = [];
  const upserts: HotDealRow[] = [];
  let insertAttempted = false;

  const query = {
    eq: () => query,
    gte: () => query,
    lte: () => query,
    order: () => query,
    then: (onfulfilled: (result: { data: { date: string }[]; error: null }) => unknown) => {
      const visibleDeals = [
        ...existing,
        ...(insertAttempted && options.concurrentDeal
          ? [options.concurrentDeal]
          : []),
      ];
      return Promise.resolve({
        data: visibleDeals.map(({ date }) => ({ date })),
        error: null,
      }).then(onfulfilled);
    },
  };

  const deleteQuery = {
    eq: () => deleteQuery,
    gte: () => deleteQuery,
    lte: () => deleteQuery,
    select: () => Promise.resolve({ data: existing, error: null }),
    then: (onfulfilled: (result: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onfulfilled),
  };

  return {
    writes,
    upserts,
    from: () => ({
      select: () => query,
      insert: (rows: HotDealRow[]) => {
        insertAttempted = true;
        const insertError =
          options.insertError ??
          (existing.some((deal) => rows.some((row) => row.date === deal.date))
            ? { code: "23505", message: "duplicate key value" }
            : undefined);
        if (insertError) {
          return {
            select: () =>
              Promise.resolve({ data: null, error: insertError }),
          };
        }

        writes.push(...rows);
        return {
          select: () => Promise.resolve({ data: rows, error: null }),
        };
      },
      upsert: (rows: HotDealRow[]) => {
        writes.push(...rows);
        upserts.push(...rows);
        return {
          select: () => Promise.resolve({ data: rows, error: null }),
        };
      },
      delete: () => deleteQuery,
    }),
  } as unknown as HotDealRepositoryClient & {
    writes: HotDealRow[];
    upserts: HotDealRow[];
  };
}
