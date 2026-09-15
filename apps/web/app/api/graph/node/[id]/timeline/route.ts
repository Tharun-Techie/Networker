import { toGraphResponse } from "@/lib/api-error";
import { timeline } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return Response.json(await timeline(params.id));
  } catch (err) {
    return toGraphResponse(err);
  }
}
