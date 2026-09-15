import { toGraphResponse } from "@/lib/api-error";
import { searchNodes } from "@/lib/search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100));
    if (!q.trim()) return Response.json([]);
    return Response.json(await searchNodes(q, limit));
  } catch (err) {
    return toGraphResponse(err);
  }
}
