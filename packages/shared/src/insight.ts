/**
 * Network-intelligence summarizer with a strict FACT vs INFERENCE split.
 * Ported from backend/app/services/insight.py — pure function, no LLM needed.
 * Every claim cites the edge ids it is grounded in.
 */
import { BOARD_REL_TYPES, FAMILY_REL_TYPES, WORK_REL_TYPES, type GraphResult } from "./taxonomy.js";

export interface CitedClaim {
  text: string;
  edge_ids: string[];
}

export interface Inference extends CitedClaim {
  kind: "board_overlap" | "shared_employment" | "family_cluster";
}

export interface Insight {
  headline: string;
  facts: CitedClaim[];
  /** Guesses — the UI must render these under a separate heading. */
  inferences: Inference[];
  citations: string[];
}

export function buildGroundedContext(graph: GraphResult): string {
  return graph.edges
    .map(
      (e) =>
        `- edge ${e.id}: ${e.from_id} -[${e.rel_type}|${e.confidence}]→ ${e.to_id} ` +
        `(source=${e.source}, ${e.start_date}→${e.end_date})`,
    )
    .join("\n");
}

export function summarize(graph: GraphResult): Insight {
  const facts: CitedClaim[] = graph.edges.map((e) => ({
    text:
      `${e.from_id} —[${e.rel_type}]→ ${e.to_id} ` +
      `(${e.start_date ?? "?"}→${e.end_date ?? "ongoing"}, ${e.confidence})`,
    edge_ids: [e.id],
  }));

  const inferences: Inference[] = [];
  const boardByPerson = new Map<string, typeof graph.edges>();
  const workByPerson = new Map<string, typeof graph.edges>();
  for (const e of graph.edges) {
    if ((BOARD_REL_TYPES as readonly string[]).includes(e.rel_type)) {
      const list = boardByPerson.get(e.from_id) ?? [];
      list.push(e);
      boardByPerson.set(e.from_id, list);
    }
    if ((WORK_REL_TYPES as readonly string[]).includes(e.rel_type)) {
      const list = workByPerson.get(e.from_id) ?? [];
      list.push(e);
      workByPerson.set(e.from_id, list);
    }
  }

  for (const [person, edges] of boardByPerson) {
    const orgs = [...new Set(edges.map((e) => e.to_id))].sort();
    if (orgs.length > 1) {
      inferences.push({
        kind: "board_overlap",
        text:
          `${person} sits on ${orgs.length} boards in this view ` +
          `(${orgs.join(", ")}) — possible interlock worth checking.`,
        edge_ids: edges.map((e) => e.id),
      });
    }
  }
  for (const [person, edges] of workByPerson) {
    const orgs = [...new Set(edges.map((e) => e.to_id))].sort();
    if (orgs.length > 1) {
      inferences.push({
        kind: "shared_employment",
        text:
          `${person} has ties to ${orgs.join(", ")} — ` +
          "shared history, NOT evidence of a current relationship.",
        edge_ids: edges.map((e) => e.id),
      });
    }
  }
  const familyEdges = graph.edges.filter((e) =>
    (FAMILY_REL_TYPES as readonly string[]).includes(e.rel_type),
  );
  if (familyEdges.length > 0) {
    inferences.push({
      kind: "family_cluster",
      text: `${familyEdges.length} family edge(s) in view — kinship, not professional closeness.`,
      edge_ids: familyEdges.map((e) => e.id),
    });
  }

  const counts = new Map<string, number>();
  for (const e of graph.edges) counts.set(e.rel_type, (counts.get(e.rel_type) ?? 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}×${v}`)
    .join(", ");
  const headline =
    `${graph.nodes.length} nodes, ${graph.edges.length} edges; ` +
    (counts.size > 0 ? `top ties: ${top}.` : "no edges in view.");

  return {
    headline,
    facts,
    inferences,
    citations: graph.edges.map((e) => e.id),
  };
}
