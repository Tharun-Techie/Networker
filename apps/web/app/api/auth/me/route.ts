import { toResponse } from "@/lib/api-error";
import { clearSessionCookie, currentUserId } from "@/lib/auth";
import { getPool } from "@/lib/pg";

export const runtime = "nodejs";

export async function GET() {
  try {
    const uid = await currentUserId();
    if (!uid) return Response.json({ user: null });
    const { rows } = await getPool().query("SELECT id, email, role FROM users WHERE id = $1", [uid]);
    if (rows.length === 0) return Response.json({ user: null });
    return Response.json({ user: rows[0] });
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
