import { beforeEach, describe, expect, test, vi } from "vitest";

const propertyId = "5f0cbf1d-5f78-4dca-a14c-d1fa66379070";
const property = {
  id: propertyId,
  name: "บ้านพักตัวอย่าง",
  description: null,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};
const dailyPrice = {
  id: "7f0cbf1d-5f78-4dca-a14c-d1fa66379070",
  property_id: propertyId,
  date: "2026-04-15",
  status_type: "promotion" as const,
  net_price: 2000,
  description: "สงกรานต์",
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock("@/server/repositories/property-repository", () => ({
  getProperties: vi.fn(),
  getPropertyById: vi.fn(),
}));
vi.mock("@/server/repositories/daily-price-repository", () => ({
  getDailyPricesInRange: vi.fn(),
}));
vi.mock("@/server/services/pricing-service", () => ({
  applyDailyPriceRange: vi.fn(),
  checkDailyPriceConflicts: vi.fn(),
  deleteDailyPriceRange: vi.fn(),
}));

import { GET as getProperties } from "@/app/api/properties/route";
import {
  DELETE as deleteRange,
  GET as getDailyPrices,
} from "@/app/api/properties/[propertyId]/daily-prices/route";
import { POST as checkConflicts } from "@/app/api/properties/[propertyId]/daily-prices/conflicts/route";
import { PUT as updateRange } from "@/app/api/properties/[propertyId]/daily-prices/range/route";
import { getDailyPricesInRange } from "@/server/repositories/daily-price-repository";
import {
  getProperties as getPropertiesFromRepository,
  getPropertyById,
} from "@/server/repositories/property-repository";
import {
  applyDailyPriceRange,
  checkDailyPriceConflicts,
  deleteDailyPriceRange,
} from "@/server/services/pricing-service";

const context = (id = propertyId) => ({ params: Promise.resolve({ propertyId: id }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPropertyById).mockResolvedValue(property);
});

describe("pricing REST API", () => {
  test("lists properties in the approved response envelope", async () => {
    vi.mocked(getPropertiesFromRepository).mockResolvedValue([property]);

    const response = await getProperties();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [property] });
  });

  test("gets daily prices in a valid inclusive range", async () => {
    vi.mocked(getDailyPricesInRange).mockResolvedValue([dailyPrice]);

    const response = await getDailyPrices(
      new Request(
        `http://localhost/api/properties/${propertyId}/daily-prices?from=2026-04-15&to=2026-04-15`
      ),
      context()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [dailyPrice] });
  });

  test("rejects a malformed date range before accessing the database", async () => {
    const response = await getDailyPrices(
      new Request(
        `http://localhost/api/properties/${propertyId}/daily-prices?from=not-a-date&to=2026-04-15`
      ),
      context()
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(getPropertyById).not.toHaveBeenCalled();
  });

  test("checks conflicts without changing prices", async () => {
    vi.mocked(checkDailyPriceConflicts).mockResolvedValue({
      dates: ["2026-04-16"],
    });

    const response = await checkConflicts(
      new Request(
        `http://localhost/api/properties/${propertyId}/daily-prices/conflicts`,
        {
          method: "POST",
          body: JSON.stringify({ startDate: "2026-04-15", endDate: "2026-04-17" }),
        }
      ),
      context()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { dates: ["2026-04-16"] },
    });
  });

  test("returns conflict dates when an overwrite has not been confirmed", async () => {
    vi.mocked(applyDailyPriceRange).mockResolvedValue({
      status: "CONFLICT",
      dates: ["2026-04-16"],
    });

    const response = await updateRange(
      new Request(`http://localhost/api/properties/${propertyId}/daily-prices/range`, {
        method: "PUT",
        body: JSON.stringify({
          startDate: "2026-04-15",
          endDate: "2026-04-17",
          statusType: "promotion",
          netPrice: 2000,
        }),
      }),
      context()
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONFLICT",
        message: "มีข้อมูลราคาพิเศษในช่วงวันที่เลือกอยู่แล้ว",
        details: { dates: ["2026-04-16"] },
      },
    });
    expect(applyDailyPriceRange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ confirmed: false })
    );
  });

  test("upserts an explicitly confirmed range", async () => {
    vi.mocked(applyDailyPriceRange).mockResolvedValue({
      status: "OK",
      data: [dailyPrice],
    });

    const response = await updateRange(
      new Request(`http://localhost/api/properties/${propertyId}/daily-prices/range`, {
        method: "PUT",
        body: JSON.stringify({
          startDate: "2026-04-15",
          endDate: "2026-04-15",
          statusType: "promotion",
          netPrice: 2000,
          description: "สงกรานต์",
          confirmOverwrite: true,
        }),
      }),
      context()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [dailyPrice] });
    expect(applyDailyPriceRange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ confirmed: true })
    );
  });

  test("deletes overrides and returns the deleted count", async () => {
    vi.mocked(deleteDailyPriceRange).mockResolvedValue([dailyPrice]);

    const response = await deleteRange(
      new Request(
        `http://localhost/api/properties/${propertyId}/daily-prices?from=2026-04-15&to=2026-04-15`,
        { method: "DELETE" }
      ),
      context()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { deleted: 1 } });
  });
});
