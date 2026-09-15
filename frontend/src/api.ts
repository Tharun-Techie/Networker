export interface GraphNode {
  id: string;
  name: string;
  label?: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from_id: string;
  to_id: string;
  rel_type: string;
  confidence: "verified" | "inferred" | "unconfirmed";
  source: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchHit {
  id: string;
  label: string;
  name: string;
  score: number;
}

export interface TimelineItem {
  edge: GraphEdge;
  neighbor: GraphNode & { label?: string };
}

export interface NodeCreate {
  type: "Person" | "Organization" | "Family" | "Institution";
  name: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
}

export interface EdgeCreate {
  rel_type: string;
  from_id: string;
  to_id: string;
  start_date?: string | null;
  end_date?: string | null;
  source: string;
  confidence?: "verified" | "inferred" | "unconfirmed";
  note?: string | null;
  created_by?: string | null;
}

export interface EvidenceCreate {
  title: string;
  source_url?: string | null;
  quote?: string | null;
  page_ref?: string | null;
  added_by?: string | null;
}

export interface Insight {
  headline: string;
  facts: { text: string; edge_ids: string[] }[];
  inferences: { kind: string; text: string; edge_ids: string[] }[];
  citations: string[];
}

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (q: string) => get<SearchHit[]>(`/search?q=${encodeURIComponent(q)}`),
  expand: (id: string, depth = 1, rel: string[] = [], since = "", until = "") => {
    const params = new URLSearchParams({ depth: String(depth) });
    rel.forEach((r) => params.append("rel", r));
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    return get<GraphResult>(`/graph/node/${id}/expand?${params.toString()}`);
  },
  path: (from: string, to: string) =>
    get<GraphResult>(`/graph/path?from=${from}&to=${to}`),
  common: (a: string, b: string) => get<GraphResult>(`/graph/common?a=${a}&b=${b}`),
  node: (id: string) => get<GraphNode>(`/api/nodes/${id}`),
  sharedEmployment: (a: string, b: string) =>
    get<GraphResult>(`/graph/shared-employment?a=${a}&b=${b}`),
  connectors: (a: string, b: string) =>
    get<GraphResult>(`/graph/connectors?a=${a}&b=${b}`),
  timeline: (id: string) => get<TimelineItem[]>(`/graph/node/${id}/timeline`),
  insight: (graph: GraphResult) => post<Insight>(`/graph/insight`, graph),
  createNode: (body: NodeCreate) => post<GraphNode>(`/api/nodes`, body),
  createEdge: (body: EdgeCreate) => post<GraphEdge>(`/api/edges`, body),
  createEvidence: (body: EvidenceCreate) =>
    post<EvidenceCreate & { id: string }>(`/api/evidence`, body),
  setConfidence: (edgeId: string, confidence: string, actor = "") =>
    fetch(
      `${BASE}/api/edges/${edgeId}/confidence?confidence=${confidence}&actor=${encodeURIComponent(actor)}`,
      { method: "PATCH" }
    ).then((r) => {
      if (!r.ok) throw new Error(`${r.status} confidence`);
      return r.json();
    }),
};
