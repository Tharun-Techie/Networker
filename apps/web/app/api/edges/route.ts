import { toGraphResponse } from "@/lib/api-error";
import { createEdge } from "@/lib/graph";
import { edgeCreateSchema, parseOr400 } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = parseOr400(edgeCreateSchema, await req.json());
    return Response.json(await createEdge(body));
  } catch (err) {
    return toGraphResponse(err);
  }
}
