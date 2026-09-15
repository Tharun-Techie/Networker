import { ApiError, toGraphResponse } from "@/lib/api-error";
import { getNode } from "@/lib/graph";

export const runtime = "nodejs";

/** Enrichment placeholder (parity with the arq enrich_node job). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const node = await getNode(params.id);
    if (!node) throw new ApiError(404, `Node not found: ${params.id}`);
    return Response.json({
      node_id: params.id,
      enriched: false,
      reason: "no enrichment providers configured",
    });
  } catch (err) {
    return toGraphResponse(err);
  }
}
