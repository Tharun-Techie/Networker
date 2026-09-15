import type { Confidence, GraphEdge, GraphNode, GraphResult } from "@networker/shared";

export type { Confidence, GraphEdge, GraphNode, GraphResult };

export interface TimelineItem {
  edge: GraphEdge;
  neighbor: GraphNode;
}

export interface TreeNode {
  node: GraphNode;
  edge: GraphEdge | null;
  children: TreeNode[];
  spouses?: GraphNode[];
}

export interface Insight {
  headline: string;
  facts: { text: string; edge_ids: string[] }[];
  inferences: { kind: string; text: string; edge_ids: string[] }[];
  citations: string[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

const get = <T,>(path: string): Promise<T> => req<T>(path);

function post<T>(path: string, body: unknown): Promise<T> {
  return req<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface SearchHit {
  id: string;
  label: string;
  name: string;
  score: number;
}

export const api = {
  search: (q: string, limit = 20) =>
    get<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  expand: (id: string, depth = 1, rel: string[] = [], since = "", until = "") => {
    const params = new URLSearchParams({ depth: String(depth) });
    rel.forEach((r) => params.append("rel", r));
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    return get<GraphResult>(`/api/graph/node/${id}/expand?${params.toString()}`);
  },
  path: (from: string, to: string) =>
    get<GraphResult>(`/api/graph/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  common: (a: string, b: string) =>
    get<GraphResult>(`/api/graph/common?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
  sharedEmployment: (a: string, b: string) =>
    get<GraphResult>(
      `/api/graph/shared-employment?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
    ),
  connectors: (a: string, b: string) =>
    get<GraphResult>(`/api/graph/connectors?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
  timeline: (id: string) => get<TimelineItem[]>(`/api/graph/node/${id}/timeline`),
  hierarchy: (
    root: string,
    dim: "ownership" | "family" | "corporate" = "ownership",
    direction: "down" | "up" = "down",
    depth = 4,
  ) =>
    get<TreeNode>(
      `/api/graph/hierarchy?root=${encodeURIComponent(root)}&dim=${dim}&direction=${direction}&depth=${depth}`,
    ),
  insight: (graph: GraphResult) => post<Insight>(`/api/graph/insight`, graph),
  node: (id: string) => get<GraphNode>(`/api/nodes/${id}`),
  createNode: (body: {
    type: "Person" | "Organization" | "Family" | "Institution";
    name: string;
    aliases?: string[];
    attributes?: Record<string, unknown>;
  }) => post<GraphNode>(`/api/nodes`, body),
  createEdge: (body: {
    rel_type: string;
    from_id: string;
    to_id: string;
    start_date?: string | null;
    end_date?: string | null;
    source: string;
    confidence?: "verified" | "inferred" | "unconfirmed";
    note?: string | null;
    created_by?: string | null;
  }) => post<GraphEdge>(`/api/edges`, body),
  createEvidence: (body: {
    title: string;
    source_url?: string | null;
    quote?: string | null;
    page_ref?: string | null;
    added_by?: string | null;
  }) => post<{ id: string } & Record<string, unknown>>(`/api/evidence`, body),
  searchEvidence: (q: string, limit = 10) =>
    get<
      Array<{
        id: string;
        title: string;
        source_url: string | null;
        page_ref: string | null;
        created_at: string;
      }>
    >(`/api/evidence/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  setConfidence: (edgeId: string, confidence: string, actor = "") =>
    req<GraphEdge>(
      `/api/edges/${edgeId}/confidence?confidence=${confidence}&actor=${encodeURIComponent(actor)}`,
      { method: "PATCH" },
    ),
  register: (body: { email: string; password: string; role?: string }) =>
    post<{ id: string; email: string; role: string }>(`/api/auth/register`, body),
  login: (body: { email: string; password: string }) =>
    post<{ id: string; email: string; role: string }>(`/api/auth/login`, body),
  me: () => get<{ user: { id: string; email: string; role: string } | null }>(`/api/auth/me`),
};
