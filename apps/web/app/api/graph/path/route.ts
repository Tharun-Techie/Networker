import { toGraphResponse } from "@/lib/api-error";
import { shortestPath } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    return Response.json(await shortestPath(from, to));
  } catch (err) {
    return toGraphResponse(err);
  }
}
