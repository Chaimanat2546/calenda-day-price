import type { DailyPrice, Property, StatusType } from "@/server/types/pricing";

type ApiEnvelope<T> = { data: T };

type ErrorPayload = {
  error: { code: string; message: string };
  conflicts?: string[];
};

export class PricingApiError extends Error {
  readonly conflicts: string[];

  constructor(message: string, conflicts: string[] = []) {
    super(message);
    this.name = "PricingApiError";
    this.conflicts = conflicts;
  }
}

type RangeInput = { startDate: string; endDate: string };

export type UpdateRangeInput = RangeInput & {
  statusType: StatusType;
  netPrice: number;
  description: string | null;
  confirmOverwrite: boolean;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload as ErrorPayload | null;
    throw new PricingApiError(
      error?.error?.message ?? "ไม่สามารถเชื่อมต่อข้อมูลราคาได้",
      error?.conflicts ?? []
    );
  }

  return payload as T;
}

export async function getProperties(): Promise<Property[]> {
  return (await request<ApiEnvelope<Property[]>>("/api/properties")).data;
}

export async function getDailyPrices(
  propertyId: string,
  range: RangeInput
): Promise<DailyPrice[]> {
  const query = new URLSearchParams({ from: range.startDate, to: range.endDate });
  return (
    await request<ApiEnvelope<DailyPrice[]>>(
      `/api/properties/${propertyId}/daily-prices?${query.toString()}`
    )
  ).data;
}

export async function checkConflicts(propertyId: string, range: RangeInput): Promise<string[]> {
  return (
    await request<ApiEnvelope<{ conflicts: string[] }>>(
      `/api/properties/${propertyId}/daily-prices/conflicts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(range),
      }
    )
  ).data.conflicts;
}

export async function updateDailyPriceRange(
  propertyId: string,
  input: UpdateRangeInput
): Promise<DailyPrice[]> {
  return (
    await request<ApiEnvelope<DailyPrice[]>>(
      `/api/properties/${propertyId}/daily-prices/range`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    )
  ).data;
}

export async function deleteDailyPriceRange(
  propertyId: string,
  range: RangeInput
): Promise<number> {
  const query = new URLSearchParams({ from: range.startDate, to: range.endDate });
  return (
    await request<ApiEnvelope<{ deleted: number }>>(
      `/api/properties/${propertyId}/daily-prices?${query.toString()}`,
      { method: "DELETE" }
    )
  ).data.deleted;
}
