import { notFound, toGraphResponse } from "@/lib/api-error";
import { getNode } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const node = await getNode(params.id);
    if (!node) throw notFound("Node not found");
    return Response.json(node);
  } catch (err) {
    return toGraphResponse(err);
  }
}
