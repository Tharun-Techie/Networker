import { ApiError, toGraphResponse } from "@/lib/api-error";
import { expand } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const depth = Math.max(1, Math.min(Number(url.searchParams.get("depth") ?? 1) || 1, 4));
    const rel = url.searchParams.getAll("rel");
    const since = url.searchParams.get("since");
    const until = url.searchParams.get("until");
    if (!params.id) throw new ApiError(400, "Missing node id");
    return Response.json(await expand(params.id, depth, rel, since, until));
  } catch (err) {
    return toGraphResponse(err);
  }
}
