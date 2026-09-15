import { toGraphResponse } from "@/lib/api-error";
import { sharedEmployment } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const a = url.searchParams.get("a") ?? "";
    const b = url.searchParams.get("b") ?? "";
    return Response.json(await sharedEmployment(a, b));
  } catch (err) {
    return toGraphResponse(err);
  }
}
