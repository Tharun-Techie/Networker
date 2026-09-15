import { randomUUID } from "node:crypto";
import {
  assertNodeType,
  assertRelType,
  BOARD_REL_TYPES,
  WORK_REL_TYPES,
  type Confidence,
  type GraphEdge,
  type GraphNode,
} from "@networker/shared";
import { runRead, runWrite } from "./neo4j";

/**
 * Graph query service — the ONLY place raw Cypher lives.
 * Ported from backend/app/services/graph_service.py with two defect fixes:
 * - every node carries `label`, every edge carries `rel_type` (projected in
 *   Cypher from labels()/type()), which the old API omitted;
 * - expand returns ALL nodes along each path (the old query dropped
 *   intermediate nodes on 2+ hop expansions).
 */

// Neo4j cannot store maps: attributes live as a JSON string and are decoded
// back to an `attributes` object on every read path.
function cleanNode(raw: unknown): GraphNode {
  const n = { ...(raw as Record<string, unknown>) } as Record<string, unknown> & {
    attributes_json?: unknown;
  };
  const json = n.attributes_json;
  delete n.attributes_json;
  if (n.attributes === undefined) {
    if (typeof json === "string" && json) {
      try {
        n.attributes = JSON.parse(json) as Record<string, unknown>;
      } catch {
        n.attributes = {};
      }
    } else {
      n.attributes = {};
    }
  }
  if (!Array.isArray(n.aliases)) n.aliases = [];
  return n as unknown as GraphNode;
}

const NODE_PROJ = "n {.*, label: head(labels(n))}";
const REL_PROJ = (v: string) => `${v} {.*, rel_type: type(${v})}`;

export async function createNode(input: {
  id?: string;
  type: string;
  name: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
}): Promise<GraphNode> {
  assertNodeType(input.type);
  const id = input.id ?? randomUUID();
  const aliases = input.aliases ?? [];
  const rows = await runWrite(
    `CREATE (n:\`${input.type}\` {id: $id, name: $name, aliases: $aliases, ` +
      `aliases_text: $aliases_text, attributes_json: $attributes_json, ` +
      `created_at: $now, updated_at: $now}) RETURN ${NODE_PROJ}`,
    {
      id,
      name: input.name,
      aliases,
      aliases_text: [input.name, ...aliases].join(" "),
      attributes_json: JSON.stringify(input.attributes ?? {}),
      now: new Date().toISOString(),
    },
  );
  if (rows.length === 0) return { id, name: input.name, label: input.type };
  return cleanNode(rows[0]!.n);
}

export async function getNode(nodeId: string): Promise<GraphNode | null> {
  const rows = await runRead(`MATCH (n {id: $id}) RETURN ${NODE_PROJ} LIMIT 1`, {
    id: nodeId,
  });
  if (rows.length === 0) return null;
  return cleanNode(rows[0]!.n);
}

export async function createEdge(input: {
  rel_type: string;
  from_id: string;
  to_id: string;
  start_date?: string | null;
  end_date?: string | null;
  source: string;
  confidence?: Confidence;
  note?: string | null;
  created_by?: string | null;
}): Promise<GraphEdge> {
  // All edges require source + confidence. AI writes inferred; promotion to
  // verified happens only via updateEdgeConfidence with a human actor.
  assertRelType(input.rel_type);
  const rows = await runWrite(
    `MATCH (a {id: $from_id}), (b {id: $to_id}) ` +
      `CREATE (a)-[r:\`${input.rel_type}\` {id: randomUUID(), ` +
      `start_date: $start_date, end_date: $end_date, source: $source, ` +
      `confidence: $confidence, note: $note, created_by: $created_by, ` +
      `created_at: $created_at}]->(b) RETURN ${REL_PROJ("r")}`,
    {
      from_id: input.from_id,
      to_id: input.to_id,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      source: input.source,
      confidence: input.confidence ?? "unconfirmed",
      note: input.note ?? null,
      created_by: input.created_by ?? null,
      created_at: new Date().toISOString(),
    },
  );
  return (rows[0]?.r ?? {}) as GraphEdge;
}

function validateRelList(relTypes?: string[]): string {
  if (!relTypes || relTypes.length === 0) return "";
  for (const r of relTypes) assertRelType(r);
  return ":" + relTypes.map((r) => `\`${r}\``).join("|");
}

/** 1-hop → N-hop expansion. Merges every node/edge along each path. */
export async function expand(
  nodeId: string,
  depth = 1,
  relTypes?: string[],
  since?: string | null,
  until?: string | null,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const d = Math.max(1, Math.min(depth, 4));
  const rel = validateRelList(relTypes);
  const conds: string[] = [];
  const params: Record<string, unknown> = { node_id: nodeId };
  if (since) {
    conds.push("(x.start_date IS NULL OR x.start_date >= $since)");
    params.since = since;
  }
  if (until) {
    conds.push("(x.end_date IS NULL OR x.end_date <= $until)");
    params.until = until;
  }
  const where = conds.length > 0 ? `WHERE ALL(x IN relationships(p) WHERE ${conds.join(" AND ")})` : "";
  const rows = await runRead(
    `MATCH p = (src {id: $node_id})-[${rel}*1..${d}]-(n) ${where} ` +
      `RETURN [m IN nodes(p) | m {.*, label: head(labels(m))}] AS ns, ` +
      `[q IN relationships(p) | q {.*, rel_type: type(q)}] AS rs LIMIT 500`,
    params,
  );
  return rowsToGraph(rows);
}

function rowsToGraph(rows: Array<Record<string, unknown>>): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  for (const row of rows) {
    for (const key of ["ns", "nodes"] as const) {
      const list = row[key];
      if (Array.isArray(list)) {
        for (const n of list) {
          const c = cleanNode(n);
          if (c.id) nodes.set(c.id, c);
        }
      }
    }
    for (const key of ["src", "n", "a", "b", "p", "person", "o", "neighbor", "node"] as const) {
      const v = row[key];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const c = cleanNode(v);
        if (c.id) nodes.set(c.id, c);
      }
    }
    for (const key of ["rs", "edges", "r", "r1", "r2", "edge"] as const) {
      const v = row[key];
      const list = Array.isArray(v) ? v : v ? [v] : [];
      for (const e of list) {
        const edge = e as GraphEdge;
        if (edge && typeof edge === "object" && (edge.id ?? edge.source)) {
          edges.set(edge.id ?? String(edges.size), edge);
        }
      }
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export async function shortestPath(fromId: string, toId: string) {
  const rows = await runRead(
    `MATCH p = shortestPath((a {id: $from_id})-[*..6]-(b {id: $to_id})) ` +
      `RETURN [m IN nodes(p) | m {.*, label: head(labels(m))}] AS nodes, ` +
      `[q IN relationships(p) | q {.*, rel_type: type(q)}] AS edges`,
    { from_id: fromId, to_id: toId },
  );
  if (rows.length === 0) return { nodes: [], edges: [] };
  const row = rows[0]!;
  return {
    nodes: ((row.nodes as unknown[]) ?? []).map(cleanNode),
    edges: (row.edges as GraphEdge[]) ?? [],
  };
}

export async function commonConnections(a: string, b: string) {
  const rows = await runRead(
    `MATCH (x {id: $a})--(c)--(y {id: $b}) WHERE x <> y ` +
      `RETURN c {.*, label: head(labels(c))} AS node LIMIT 100`,
    { a, b },
  );
  return { nodes: rows.map((r) => cleanNode(r.node)), edges: [] };
}

/** People who have worked at / served BOTH organizations. */
export async function sharedEmployment(orgAId: string, orgBId: string) {
  const rows = await runRead(
    `MATCH (p:Person)-[r1]->(a {id: $a}), (p)-[r2]->(b {id: $b}) ` +
      `WHERE type(r1) IN $work_rels AND type(r2) IN $work_rels ` +
      `RETURN p {.*, label: head(labels(p))} AS person, ` +
      `r1 {.*, rel_type: type(r1)} AS r1, r2 {.*, rel_type: type(r2)} AS r2, ` +
      `a {.*, label: head(labels(a))} AS a, b {.*, label: head(labels(b))} AS b`,
    { a: orgAId, b: orgBId, work_rels: WORK_REL_TYPES },
  );
  return rowsToGraph(rows);
}

/** People bridging Company A and Company B, with the connecting edges. */
export async function connectors(orgAId: string, orgBId: string) {
  const rows = await runRead(
    `MATCH (a {id: $a})-[r1]-(p:Person)-[r2]-(b {id: $b}) WHERE a <> b ` +
      `RETURN a {.*, label: head(labels(a))} AS a, ` +
      `r1 {.*, rel_type: type(r1)} AS r1, ` +
      `p {.*, label: head(labels(p))} AS p, ` +
      `r2 {.*, rel_type: type(r2)} AS r2, ` +
      `b {.*, label: head(labels(b))} AS b LIMIT 200`,
    { a: orgAId, b: orgBId },
  );
  return rowsToGraph(rows);
}

/** Board members serving across the given organizations. */
export async function boardOverlap(orgIds: string[]) {
  if (orgIds.length === 0) throw new Error("org_ids must not be empty");
  const rows = await runRead(
    `MATCH (p:Person)-[r]->(o) WHERE o.id IN $org_ids AND type(r) IN $board_rels ` +
      `RETURN p {.*, label: head(labels(p))} AS person, ` +
      `r {.*, rel_type: type(r)} AS r, ` +
      `o {.*, label: head(labels(o))} AS o LIMIT 500`,
    { org_ids: orgIds, board_rels: BOARD_REL_TYPES },
  );
  return rowsToGraph(rows);
}

/** Career/relationship timeline for a node, oldest first (dateless last). */
export async function timeline(nodeId: string): Promise<Array<{ edge: GraphEdge; neighbor: GraphNode }>> {
  const rows = await runRead(
    `MATCH (n {id: $node_id})-[r]-(m) ` +
      `RETURN r {.*, rel_type: type(r)} AS edge, ` +
      `m {.*, label: head(labels(m))} AS neighbor ORDER BY r.start_date ASC`,
    { node_id: nodeId },
  );
  const out = rows
    .filter((r) => r.edge && typeof r.edge === "object")
    .map((r) => ({
      edge: r.edge as GraphEdge,
      neighbor:
        r.neighbor && typeof r.neighbor === "object"
          ? cleanNode(r.neighbor)
          : ({} as GraphNode),
    }));
  out.sort((x, y) => {
    const xn = x.edge.start_date == null;
    const yn = y.edge.start_date == null;
    if (xn !== yn) return xn ? 1 : -1;
    return String(x.edge.start_date ?? "").localeCompare(String(y.edge.start_date ?? ""));
  });
  return out;
}

/** Promote/demote edge confidence. VERIFIED requires a human actor. */
export async function updateEdgeConfidence(
  edgeId: string,
  confidence: Confidence,
  actor: string,
): Promise<GraphEdge> {
  if (confidence === "verified" && !actor) {
    throw new Error("Promoting to verified requires a human actor");
  }
  const rows = await runWrite(
    `MATCH ()-[r {id: $edge_id}]->() ` +
      `SET r.confidence = $confidence, r.last_verified_by = $actor RETURN ${REL_PROJ("r")}`,
    { edge_id: edgeId, confidence, actor },
  );
  return (rows[0]?.r ?? {}) as GraphEdge;
}

/** Force-inferred persistence for auto-ingested candidates (parity with ingestion.py). */
export async function persistCandidates(
  nodes: Array<{ id?: string; type: string; name: string; aliases?: string[]; attributes?: Record<string, unknown> }>,
  edges: Array<{
    rel_type: string;
    from_id: string;
    to_id: string;
    start_date?: string | null;
    end_date?: string | null;
    source: string;
    confidence?: Confidence;
    note?: string | null;
    created_by?: string | null;
  }>,
) {
  const createdNodes = [];
  for (const n of nodes) createdNodes.push(await createNode(n));
  const createdEdges = [];
  for (const e of edges) {
    // Never allow auto-ingest to write verified directly.
    createdEdges.push(await createEdge({ ...e, confidence: e.confidence === "verified" ? "inferred" : e.confidence }));
  }
  return { nodes: createdNodes, edges: createdEdges };
}
