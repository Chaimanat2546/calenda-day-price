import type { HotDeal } from "@/server/types/pricing";

export type HotDealWrite = Pick<
  HotDeal,
  "property_id" | "date" | "net_price" | "show_before_days" | "description"
>;

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

interface HotDealQuery extends PromiseLike<QueryResult<HotDeal[]>> {
  eq(column: string, value: string): HotDealQuery;
  gte(column: string, value: string): HotDealQuery;
  lte(column: string, value: string): HotDealQuery;
  order(column: string, options?: { ascending?: boolean }): HotDealQuery;
}

interface HotDealMutationQuery extends PromiseLike<QueryResult<HotDeal[]>> {
  eq(column: string, value: string): HotDealMutationQuery;
  gte(column: string, value: string): HotDealMutationQuery;
  lte(column: string, value: string): HotDealMutationQuery;
  select(columns?: string): HotDealQuery;
}

export interface HotDealRepositoryClient {
  from(table: "hot_deals"): {
    select(columns: string): HotDealQuery;
    upsert(
      rows: HotDealWrite[],
      options: { onConflict: "property_id,date" }
    ): {
      select(columns?: string): HotDealQuery;
    };
    delete(): HotDealMutationQuery;
  };
}

function assertSuccess<T>(result: QueryResult<T>): T {
  if (result.error || result.data === null) {
    throw new Error("Unable to access hot deals");
  }

  return result.data;
}

export async function getHotDealsInRange(
  client: HotDealRepositoryClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<HotDeal[]> {
  const result = await client
    .from("hot_deals")
    .select("*")
    .eq("property_id", propertyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  return assertSuccess(await result);
}

export async function findHotDealConflicts(
  client: HotDealRepositoryClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const result = await client
    .from("hot_deals")
    .select("date")
    .eq("property_id", propertyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  return assertSuccess(await result).map(({ date }) => date);
}

export async function upsertHotDeals(
  client: HotDealRepositoryClient,
  rows: HotDealWrite[]
): Promise<HotDeal[]> {
  return assertSuccess(
    await client
      .from("hot_deals")
      .upsert(rows, { onConflict: "property_id,date" })
      .select()
  );
}

export async function deleteHotDealsInRange(
  client: HotDealRepositoryClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<HotDeal[]> {
  const result = await client
    .from("hot_deals")
    .delete()
    .eq("property_id", propertyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .select();

  return assertSuccess(await result);
}
