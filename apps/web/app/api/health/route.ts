import { toGraphResponse } from "@/lib/api-error";
import { driverError, getDriver } from "@/lib/neo4j";

export const runtime = "nodejs";

export async function GET() {
  try {
    const driver = await getDriver();
    return Response.json({ ok: true, neo4j: driver !== null, neo4j_error: driverError() });
  } catch (err) {
    return toGraphResponse(err);
  }
}
