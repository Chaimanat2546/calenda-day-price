import { createClient } from "@/lib/server";
import { apiError } from "@/server/http/api-error";
import {
  getProperties,
  type PropertyRepositoryClient,
} from "@/server/repositories/property-repository";

export async function GET(): Promise<Response> {
  try {
    const client = (await createClient()) as unknown as PropertyRepositoryClient;
    return Response.json({ data: await getProperties(client) });
  } catch {
    return apiError("INTERNAL_ERROR", 500);
  }
}
