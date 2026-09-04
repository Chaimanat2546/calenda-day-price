import type { DailyPrice, StatusType } from "@/server/types/pricing";

export type DailyPriceWrite = Pick<
  DailyPrice,
  "property_id" | "date" | "status_type" | "net_price" | "description"
>;

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

interface DailyPriceQuery {
  eq(column: string, value: string): DailyPriceQuery;
  gte(column: string, value: string): DailyPriceQuery;
  lte(column: string, value: string): DailyPriceQuery;
  lt(column: string, value: string): DailyPriceQuery;
  order(column: string, options?: { ascending?: boolean }): Promise<QueryResult<unknown[]>>;
}

export interface DailyPriceRepositoryClient {
  from(table: "daily_price"): {
    select(columns: string): DailyPriceQuery;
    upsert(
      rows: DailyPriceWrite[],
      options: { onConflict: "property_id,date" }
    ): {
      select(columns?: string): Promise<QueryResult<unknown[]>>;
    };
    delete(): DailyPriceQuery;
  };
}

function assertSuccess<T>(result: QueryResult<T>): T {
  if (result.error || result.data === null) {
    throw new Error("Unable to access daily prices");
  }

  return result.data;
}

export async function getDailyPricesForMonth(
  client: DailyPriceRepositoryClient,
  propertyId: string,
  month: string
): Promise<DailyPrice[]> {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1))
    .toISOString()
    .slice(0, 10);
  const result = await client
    .from("daily_price")
    .select("*")
    .eq("property_id", propertyId)
    .gte("date", `${month}-01`)
    .lt("date", nextMonth)
    .order("date");

  return assertSuccess((await result) as unknown as QueryResult<DailyPrice[]>);
}

export async function getDailyPricesInRange(
  client: DailyPriceRepositoryClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<DailyPrice[]> {
  const result = await client
    .from("daily_price")
    .select("*")
    .eq("property_id", propertyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  return assertSuccess((await result) as unknown as QueryResult<DailyPrice[]>);
}

export async function findDailyPriceConflicts(
  client: DailyPriceRepositoryClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const result = await client
    .from("daily_price")
    .select("date")
    .eq("property_id", propertyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  return assertSuccess((await result) as unknown as QueryResult<{ date: string }[]>).map(
    ({ date }) => date
  );
}

export async function upsertDailyPrices(
  client: DailyPriceRepositoryClient,
  rows: DailyPriceWrite[]
): Promise<DailyPrice[]> {
  return assertSuccess(
    (await client
      .from("daily_price")
      .upsert(rows, { onConflict: "property_id,date" })
      .select()) as QueryResult<DailyPrice[]>
  );
}

export async function deleteDailyPricesInRange(
  client: DailyPriceRepositoryClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<DailyPrice[]> {
  const result = await client
    .from("daily_price")
    .delete()
    .eq("property_id", propertyId)
    .gte("date", startDate)
    .lte("date", endDate);

  return assertSuccess((await result) as unknown as QueryResult<DailyPrice[]>);
}

export function createDailyPriceWrite(
  propertyId: string,
  date: string,
  statusType: StatusType,
  netPrice: number,
  description: string | null
): DailyPriceWrite {
  return {
    property_id: propertyId,
    date,
    status_type: statusType,
    net_price: netPrice,
    description,
  };
}
