import { toGraphResponse } from "@/lib/api-error";
import { createNode } from "@/lib/graph";
import { nodeCreateSchema, parseOr400 } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = parseOr400(nodeCreateSchema, await req.json());
    return Response.json(await createNode(body));
  } catch (err) {
    return toGraphResponse(err);
  }
}
