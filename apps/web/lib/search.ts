import neo4j from "neo4j-driver";
import { runRead } from "./neo4j";

/**
 * Search: OpenSearch when available, Neo4j full-text fallback, 503 otherwise.
 * Parity with backend/app/services/search_service.py.
 */
export interface SearchHit {
  id: string;
  label: string;
  name: string;
  score: number;
}

export async function searchNodes(q: string, limit = 20): Promise<SearchHit[]> {
  const query = (q ?? "").trim();
  if (!query) return [];

  // 1. Try OpenSearch (silently skipped when unconfigured/unreachable).
  try {
    const url = process.env.OPENSEARCH_URL;
    if (url) {
      const { Client } = await import("@opensearch-project/opensearch");
      const client = new Client({ node: url });
      const exists = await client.indices.exists({ index: "nodes" });
      if (exists.statusCode !== 404 && (exists.body === true || exists.statusCode === 200)) {
        const resp = await client.search({
          index: "nodes",
          body: {
            size: limit,
            query: { multi_match: { query, fields: ["name^3", "aliases", "attributes.*"] } },
          },
        });
        const hits = (resp.body?.hits?.hits ?? []) as Array<{
          _id: string;
          _score: number;
          _source: Record<string, unknown>;
        }>;
        if (hits.length > 0) {
          return hits.map((h) => ({
            id: h._id,
            label: String(h._source.type ?? "?"),
            name: String(h._source.name ?? ""),
            score: h._score,
          }));
        }
      }
    }
  } catch {
    // Fall through to Neo4j.
  }

  // 2. Neo4j full-text fallback.
  try {
    const rows = await runRead(
      "CALL db.index.fulltext.queryNodes('node_names_ft', $q) " +
        "YIELD node, score RETURN node {.*, label: head(labels(node))} AS node, " +
        "score ORDER BY score DESC LIMIT $limit",
      { q: query, limit: neo4j.int(Math.trunc(limit)) },
    );
    return rows
      .map((r) => {
        const n = (r.node ?? {}) as Record<string, unknown>;
        return {
          id: String(n.id ?? ""),
          label: String(n.label ?? "?"),
          name: String(n.name ?? ""),
          score: Number(r.score ?? 1),
        };
      })
      .filter((h) => h.id && h.name);
  } catch (err) {
    throw new Error(`Search unavailable (no OpenSearch, Neo4j error: ${err instanceof Error ? err.message : String(err)})`);
  }
}
