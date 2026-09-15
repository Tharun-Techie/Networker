import { ApiError, toGraphResponse } from "@/lib/api-error";
import { updateEdgeConfidence } from "@/lib/graph";
import { confidenceSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Promote/demote edge confidence. VERIFIED requires a human actor. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const parsed = confidenceSchema.safeParse(url.searchParams.get("confidence"));
    if (!parsed.success) throw new ApiError(400, "Invalid confidence");
    const actor = url.searchParams.get("actor") ?? "";
    return Response.json(await updateEdgeConfidence(params.id, parsed.data, actor));
  } catch (err) {
    return toGraphResponse(err);
  }
}
