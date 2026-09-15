import { ApiError, toGraphResponse } from "@/lib/api-error";
import { hierarchy, type HierarchyDim, type HierarchyDirection } from "@/lib/graph";

export const runtime = "nodejs";

const DIMS: HierarchyDim[] = ["ownership", "family", "corporate"];

/**
 * Nested hierarchy tree for a root node — ownership trees, family lineages,
 * reporting lines. Cycle-safe, depth-capped. Complements the flat graph view.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const root = url.searchParams.get("root") ?? "";
    const dim = (url.searchParams.get("dim") ?? "ownership") as HierarchyDim;
    const direction = (url.searchParams.get("direction") ?? "down") as HierarchyDirection;
    const depth = Math.max(1, Math.min(Number(url.searchParams.get("depth") ?? 4) || 4, 6));
    if (!root) throw new ApiError(400, "Provide ?root=<node id>");
    if (!DIMS.includes(dim)) throw new ApiError(400, `dim must be one of: ${DIMS.join(", ")}`);
    if (direction !== "down" && direction !== "up") {
      throw new ApiError(400, "direction must be down or up");
    }
    return Response.json(await hierarchy(root, dim, direction, depth));
  } catch (err) {
    return toGraphResponse(err);
  }
}
