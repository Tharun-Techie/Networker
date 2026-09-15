import { toResponse } from "@/lib/api-error";
import { getPool } from "@/lib/pg";

export const runtime = "nodejs";

/** Typeahead source for the evidence picker: match title, quote, or URL. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 10) || 10, 50));
    if (!q) return Response.json([]);
    const { rows } = await getPool().query(
      `SELECT id, title, source_url, page_ref, created_at FROM evidence_documents
       WHERE title ILIKE $1 OR quote ILIKE $1 OR source_url ILIKE $1
       ORDER BY created_at DESC LIMIT $2`,
      [`%${q}%`, limit],
    );
    return Response.json(
      rows.map((r) => ({ ...(r as Record<string, unknown>), id: String((r as { id: unknown }).id) })),
    );
  } catch (err) {
    return toResponse(err);
  }
}
