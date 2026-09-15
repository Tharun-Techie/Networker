import { notFound, toResponse } from "@/lib/api-error";
import { getPool } from "@/lib/pg";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { rows } = await getPool().query(
      `SELECT id, title, source_url, s3_key, quote, page_ref, added_by, doc_metadata
       FROM evidence_documents WHERE id = $1`,
      [params.id],
    );
    if (rows.length === 0) throw notFound("Evidence not found");
    const doc = rows[0] as Record<string, unknown>;
    return Response.json({ ...doc, id: String(doc.id) });
  } catch (err) {
    return toResponse(err);
  }
}
