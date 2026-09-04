import type { Property } from "@/server/types/pricing";

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

interface PropertiesQuery extends PromiseLike<QueryResult<Property[]>> {
  eq(column: "id", value: string): PropertiesQuery;
  order(column: "name", options?: { ascending?: boolean }): PropertiesQuery;
  maybeSingle(): Promise<QueryResult<Property>>;
}

export interface PropertyRepositoryClient {
  from(table: "properties"): {
    select(columns: string): PropertiesQuery;
  };
}

function assertSuccess<T>(result: QueryResult<T>): T {
  if (result.error || result.data === null) {
    throw new Error("Unable to access properties");
  }

  return result.data;
}

export async function getProperties(
  client: PropertyRepositoryClient
): Promise<Property[]> {
  return assertSuccess(
    await client.from("properties").select("*").order("name")
  );
}

export async function getPropertyById(
  client: PropertyRepositoryClient,
  propertyId: string
): Promise<Property | null> {
  const result = await client
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();

  if (result.error) {
    throw new Error("Unable to access property");
  }

  return result.data;
}
