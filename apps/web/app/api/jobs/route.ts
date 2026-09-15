import { findDuplicateCandidates } from "@networker/shared";
import { toGraphResponse } from "@/lib/api-error";
import { persistCandidates } from "@/lib/graph";
import { runRead } from "@/lib/neo4j";
import { edgeCreateSchema, nodeCreateSchema, parseOr400 } from "@/lib/validation";
import { z } from "zod";

export const runtime = "nodejs";

const ingestSchema = z.object({
  nodes: z.array(nodeCreateSchema).default([]),
  edges: z.array(edgeCreateSchema).default([]),
});

/**
 * Ingest candidate entities/relationships (replaces the arq ingest_candidates
 * job — call on demand or on a schedule; confidence=inferred is forced).
 */
export async function POST(req: Request) {
  try {
    const body = parseOr400(ingestSchema, await req.json());
    const result = await persistCandidates(body.nodes, body.edges);
    return Response.json({ nodes: result.nodes.length, edges: result.edges.length });
  } catch (err) {
    return toGraphResponse(err);
  }
}

/**
 * Duplicate scan (replaces the nightly arq scan_duplicates cron).
 * Returns candidates for human review — never merges autonomously.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const threshold = Number(url.searchParams.get("threshold") ?? 0.85) || 0.85;
    const rows = await runRead(
      "MATCH (n) WHERE n:Person OR n:Organization OR n:Family OR n:Institution " +
        "RETURN n.id AS id, n.name AS name, n.aliases AS aliases LIMIT 10000",
    );
    const nodes = rows.map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      aliases: (Array.isArray(r.aliases) ? r.aliases : []) as string[],
    }));
    const pairs = await findDuplicateCandidates(nodes, threshold);
    return Response.json({
      candidates: pairs.map(([a, b, score]) => ({ a, b, score })),
    });
  } catch (err) {
    return toGraphResponse(err);
  }
}
