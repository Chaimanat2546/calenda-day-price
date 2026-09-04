import type {
  CalendarDayPrice,
  DailyPrice,
  HotDeal,
  Property,
  StatusType,
} from "@/server/types/pricing";

type ApiEnvelope<T> = { data: T };

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: { dates?: string[] };
  };
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

export type UpdateHotDealRangeInput = RangeInput & {
  netPrice: number;
  showBeforeDays: number;
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
      error?.error?.details?.dates ?? []
    );
  }

  return payload as T;
}

export async function getProperties(): Promise<Property[]> {
  return (await request<ApiEnvelope<Property[]>>("/api/properties")).data;
}

export async function getCalendarPrices(
  propertyId: string,
  range: RangeInput
): Promise<CalendarDayPrice[]> {
  const query = new URLSearchParams({ from: range.startDate, to: range.endDate });
  return (
    await request<ApiEnvelope<CalendarDayPrice[]>>(
      `/api/properties/${propertyId}/calendar-prices?${query.toString()}`
    )
  ).data;
}

export async function checkDailyPriceConflicts(
  propertyId: string,
  range: RangeInput
): Promise<string[]> {
  return (
    await request<ApiEnvelope<{ dates: string[] }>>(
      `/api/properties/${propertyId}/daily-prices/conflicts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(range),
      }
    )
  ).data.dates;
}

export async function checkHotDealConflicts(
  propertyId: string,
  range: RangeInput
): Promise<string[]> {
  return (
    await request<ApiEnvelope<{ dates: string[] }>>(
      `/api/properties/${propertyId}/hot-deals/conflicts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(range),
      }
    )
  ).data.dates;
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

export async function updateHotDealRange(
  propertyId: string,
  input: UpdateHotDealRangeInput
): Promise<HotDeal[]> {
  return (
    await request<ApiEnvelope<HotDeal[]>>(
      `/api/properties/${propertyId}/hot-deals/range`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    )
  ).data;
}

export async function deleteHotDealRange(
  propertyId: string,
  range: RangeInput
): Promise<number> {
  const query = new URLSearchParams({ from: range.startDate, to: range.endDate });
  return (
    await request<ApiEnvelope<{ deleted: number }>>(
      `/api/properties/${propertyId}/hot-deals?${query.toString()}`,
      { method: "DELETE" }
    )
  ).data.deleted;
}
