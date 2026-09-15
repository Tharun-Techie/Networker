import { toGraphResponse } from "@/lib/api-error";
import { deleteEdge } from "@/lib/graph";

export const runtime = "nodejs";

/** Remove a relationship (nodes are never deleted implicitly). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    return Response.json(await deleteEdge(params.id));
  } catch (err) {
    return toGraphResponse(err);
  }
}
