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

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (q: string) => get<SearchHit[]>(`/search?q=${encodeURIComponent(q)}`),
  expand: (id: string, depth = 1, rel: string[] = []) =>
    get<GraphResult>(
      `/graph/node/${id}/expand?depth=${depth}${rel.map((r) => `&rel=${r}`).join("")}`
    ),
  path: (from: string, to: string) =>
    get<GraphResult>(`/graph/path?from=${from}&to=${to}`),
  common: (a: string, b: string) => get<GraphResult>(`/graph/common?a=${a}&b=${b}`),
  node: (id: string) => get<GraphNode>(`/api/nodes/${id}`),
};
