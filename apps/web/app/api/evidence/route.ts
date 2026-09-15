import { toResponse } from "@/lib/api-error";
import { getPool } from "@/lib/pg";
import { evidenceCreateSchema, parseOr400 } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = parseOr400(evidenceCreateSchema, await req.json());
    const { rows } = await getPool().query(
      `INSERT INTO evidence_documents
         (title, source_url, s3_key, quote, page_ref, added_by, doc_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, source_url, s3_key, quote, page_ref, added_by, doc_metadata`,
      [
        body.title,
        body.source_url ?? null,
        body.s3_key ?? null,
        body.quote ?? null,
        body.page_ref ?? null,
        body.added_by ?? null,
        JSON.stringify(body.doc_metadata ?? {}),
      ],
    );
    const doc = rows[0] as Record<string, unknown>;
    return Response.json({ ...doc, id: String(doc.id), doc_metadata: doc.doc_metadata ?? {} });
  } catch (err) {
    return toResponse(err);
  }
}
