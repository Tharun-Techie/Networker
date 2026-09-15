import { summarize } from "@networker/shared";
import { ApiError, toResponse } from "@/lib/api-error";

export const runtime = "nodejs";

/** Fact-grounded network summary. FACTS and INFERENCES stay separate. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      nodes?: Array<{ id: string; label?: string; name: string }>;
      edges?: Array<{
        id: string;
        rel_type: string;
        from_id: string;
        to_id: string;
        confidence: "verified" | "inferred" | "unconfirmed";
        source: string;
        start_date?: string | null;
        end_date?: string | null;
      }>;
    };
    if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      throw new ApiError(400, "Body must be {nodes, edges}");
    }
    return Response.json(summarize({ nodes: body.nodes, edges: body.edges }));
  } catch (err) {
    return toResponse(err);
  }
}
