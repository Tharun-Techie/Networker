"use client";

import { useEffect, useMemo, useState } from "react";
import EvidencePanel from "@/components/EvidencePanel";
import FilterPanel, { NODE_TYPES } from "@/components/FilterPanel";
import GraphCanvas from "@/components/GraphCanvas";
import HierarchyTree from "@/components/HierarchyTree";
import InsightPanel from "@/components/InsightPanel";
import Nav from "@/components/Nav";
import Typeahead from "@/components/Typeahead";
import {
  api,
  type GraphEdge,
  type GraphResult,
  type Insight,
  type SearchHit,
  type TreeNode,
} from "@/lib/api";

function mergeGraph(a: GraphResult, b: GraphResult): GraphResult {
  const nodes = new Map(a.nodes.map((n) => [n.id, n]));
  for (const n of b.nodes) nodes.set(n.id, n);
  const edges = new Map(a.edges.map((e) => [e.id, e]));
  for (const e of b.edges) edges.set(e.id, e);
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });
  const [edge, setEdge] = useState<GraphEdge | null>(null);
  const [rel, setRel] = useState<string[]>([]);
  const [nodeTypes, setNodeTypes] = useState<string[]>([...NODE_TYPES]);
  const [depth, setDepth] = useState(1);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<"graph" | "tree">("graph");
  const [treeDim, setTreeDim] = useState<"ownership" | "family" | "corporate">("ownership");
  const [treeRoot, setTreeRoot] = useState("");
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  const visible = useMemo(() => {
    const keep = new Set(
      graph.nodes.filter((n) => !n.label || nodeTypes.includes(n.label)).map((n) => n.id),
    );
    return {
      nodes: graph.nodes.filter((n) => keep.has(n.id)),
      edges: graph.edges.filter((e) => keep.has(e.from_id) && keep.has(e.to_id)),
    };
  }, [graph, nodeTypes]);

  const doSearch = async () => {
    setErr("");
    try {
      setHits(await api.search(q));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    }
  };

  const doExpand = async (id: string, accumulate: boolean) => {
    setErr("");
    try {
      const next = await api.expand(id, depth, rel, since, until);
      setGraph((g) => (accumulate ? mergeGraph(g, next) : next));
      setInsight(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Expand failed");
    }
  };

  const doInsight = async () => {
    setErr("");
    try {
      setInsight(await api.insight(visible));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Insight failed");
    }
  };

  // Hierarchy tree for the chosen root (defaults to the first visible node).
  const effectiveRoot = treeRoot || visible.nodes[0]?.id || "";
  useEffect(() => {
    if (view !== "tree" || !effectiveRoot) {
      setTree(null);
      return;
    }
    setTreeLoading(true);
    api
      .hierarchy(effectiveRoot, treeDim, "down")
      .then(setTree)
      .catch((e) => setErr(e instanceof Error ? e.message : "Hierarchy failed"))
      .finally(() => setTreeLoading(false));
  }, [view, effectiveRoot, treeDim]);

  return (
    <>
      <Nav />
      <main className="nw-main">
        <h2>Explore the network</h2>
        <p className="subtle">Search → expand → investigate. The graph is the interface.</p>

        <div className="card">
          <div className="row">
            <Typeahead
              placeholder="Type to search people, companies, families…"
              fetchOptions={async (query, signal) => {
                const res = await fetch(
                  `/api/search?q=${encodeURIComponent(query)}&limit=8`,
                  { signal },
                );
                if (!res.ok) throw new Error("search failed");
                const hits = (await res.json()) as SearchHit[];
                return hits.map((h) => ({
                  id: h.id,
                  primary: h.name,
                  secondary: `match ${h.score.toFixed(2)}`,
                  badge: h.label,
                }));
              }}
              onQueryChange={setQ}
              onSelect={(opt) => doExpand(opt.id, false)}
            />
            <button className="btn-primary" onClick={doSearch}>
              Search
            </button>
            <button onClick={() => setGraph({ nodes: [], edges: [] })}>Clear</button>
          </div>
          {err && <div className="err">{err}</div>}
          {hits.length > 0 && (
            <ul className="list">
              {hits.map((h) => (
                <li key={h.id}>
                  <span className={`badge b-type-${h.label}`}>{h.label}</span>
                  <span className="grow">
                    <strong>{h.name}</strong>
                  </span>
                  <button className="btn-sm" onClick={() => doExpand(h.id, false)}>
                    Expand
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="explore-grid mt">
          <FilterPanel
            rel={rel}
            setRel={setRel}
            depth={depth}
            setDepth={setDepth}
            since={since}
            setSince={setSince}
            until={until}
            setUntil={setUntil}
            nodeTypes={nodeTypes}
            setNodeTypes={setNodeTypes}
          />
          <div className="side-stack">
            <div className="card">
              <div className="row wrap">
                <h3 className="grow" style={{ margin: 0 }}>
                  {view === "graph" ? "Graph" : "Hierarchy"}{" "}
                  <span className="tiny">
                    {visible.nodes.length} nodes · {visible.edges.length} edges
                  </span>
                </h3>
                <div className="row">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={view === "graph"}
                    onClick={() => setView("graph")}
                  >
                    ⬡ Graph
                  </button>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={view === "tree"}
                    onClick={() => setView("tree")}
                  >
                    🌳 Tree
                  </button>
                </div>
                <button
                  className="btn-primary btn-sm"
                  onClick={doInsight}
                  disabled={visible.nodes.length === 0}
                >
                  ✦ Network insight
                </button>
              </div>
              {view === "graph" ? (
                <>
                  <div className="mt">
                    <GraphCanvas
                      nodes={visible.nodes}
                      edges={visible.edges}
                      onSelectEdge={setEdge}
                    />
                  </div>
                  {visible.nodes.length > 0 && (
                    <div className="mt">
                      <span className="tiny">Expand another degree from: </span>
                      <div className="row wrap mt">
                        {visible.nodes.slice(0, 20).map((n) => (
                          <button key={n.id} className="chip" onClick={() => doExpand(n.id, true)}>
                            {n.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt">
                  <div className="row wrap">
                    <label className="flabel">Root</label>
                    <select
                      value={effectiveRoot}
                      onChange={(e) => setTreeRoot(e.target.value)}
                      style={{ font: "inherit", padding: 6, borderRadius: 8, minWidth: 200 }}
                    >
                      {visible.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.label ?? "?"})
                        </option>
                      ))}
                    </select>
                    {(["ownership", "family", "corporate"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="chip"
                        aria-pressed={treeDim === d}
                        onClick={() => setTreeDim(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="mt">
                    {treeLoading ? (
                      <p className="empty">Loading hierarchy…</p>
                    ) : !tree ? (
                      <p className="empty">Expand a node first, then inspect its hierarchy here.</p>
                    ) : tree.children.length === 0 && (tree.spouses ?? []).length === 0 ? (
                      <p className="empty">
                        No {treeDim} hierarchy under {tree.node.name} — try another root or
                        dimension.
                      </p>
                    ) : (
                      <HierarchyTree tree={tree} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {insight && <InsightPanel insight={insight} />}
            <EvidencePanel edge={edge} />
          </div>
        </div>
      </main>
    </>
  );
}
