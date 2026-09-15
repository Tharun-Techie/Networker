import { ApiError, toGraphResponse } from "@/lib/api-error";
import { boardOverlap } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.getAll("org");
    if (org.length === 0) throw new ApiError(400, "Provide at least one ?org= id");
    return Response.json(await boardOverlap(org));
  } catch (err) {
    return toGraphResponse(err);
  }
}
