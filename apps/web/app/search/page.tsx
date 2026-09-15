"use client";

import { useState } from "react";
import Link from "next/link";
import GraphCanvas from "@/components/GraphCanvas";
import Nav from "@/components/Nav";
import NodePicker from "@/components/NodePicker";
import Typeahead from "@/components/Typeahead";
import { api, type GraphNode, type GraphResult, type SearchHit } from "@/lib/api";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [nodeA, setNodeA] = useState<GraphNode | null>(null);
  const [nodeB, setNodeB] = useState<GraphNode | null>(null);
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<GraphResult>({ nodes: [], edges: [] });

  const run = (fn: Promise<GraphResult>, what: string) =>
    fn
      .then((r) => {
        setResult(r);
        setLabel(what);
      })
      .catch(() => {});

  const pairReady = nodeA && nodeB;

  return (
    <>
      <Nav />
      <main className="nw-main">
        <h2>Search / Query</h2>
        <p className="subtle">Fuzzy name search, then relationship queries between any two nodes.</p>

        <div className="card">
          <div className="row">
            <Typeahead
              placeholder="Type a name for full results…"
              fetchOptions={async (query, signal) => {
                const res = await fetch(
                  `/api/search?q=${encodeURIComponent(query)}&limit=8`,
                  { signal },
                );
                if (!res.ok) throw new Error("search failed");
                const items = (await res.json()) as SearchHit[];
                return items.map((h) => ({
                  id: h.id,
                  primary: h.name,
                  secondary: `match ${h.score.toFixed(2)}`,
                  badge: h.label,
                }));
              }}
              onQueryChange={setQ}
              onSelect={(opt) => {
                setQ(opt.primary);
                api.search(opt.primary).then(setHits).catch(() => {});
              }}
            />
            <button
              className="btn-primary"
              onClick={() => api.search(q).then(setHits).catch(() => {})}
            >
              Search
            </button>
          </div>
          {hits.length > 0 && (
            <ul className="list">
              {hits.map((h) => (
                <li key={h.id}>
                  <span className={`badge b-type-${h.label}`}>{h.label}</span>
                  <Link
                    className="grow"
                    href={h.label === "Organization" ? `/org/${h.id}` : `/person/${h.id}`}
                  >
                    <strong>{h.name}</strong>
                  </Link>
                  <span className="tiny mono">{h.score.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>Relationship queries</h3>
          <p className="tiny">
            Pick two nodes by name — no IDs needed. Example:{" "}
            <span className="mono">Tata Motors</span> + <span className="mono">TCS</span>
          </p>
          <div className="row wrap">
            <div style={{ flex: 1, minWidth: 240 }}>
              <NodePicker label="Node A" value={nodeA} onPick={setNodeA} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <NodePicker label="Node B" value={nodeB} onPick={setNodeB} />
            </div>
          </div>
          <div className="row wrap mt">
            <button
              disabled={!pairReady}
              onClick={() => pairReady && run(api.common(nodeA!.id, nodeB!.id), "Common connections")}
            >
              Common connections
            </button>
            <button
              disabled={!pairReady}
              onClick={() => pairReady && run(api.path(nodeA!.id, nodeB!.id), "Shortest path")}
            >
              Shortest path
            </button>
            <button
              className="btn-primary"
              disabled={!pairReady}
              onClick={() =>
                pairReady && run(api.connectors(nodeA!.id, nodeB!.id), "People connecting A and B")
              }
            >
              Who connects A and B?
            </button>
            <button
              disabled={!pairReady}
              onClick={() =>
                pairReady && run(api.sharedEmployment(nodeA!.id, nodeB!.id), "Worked at both")
              }
            >
              Worked at both (orgs)
            </button>
          </div>
        </div>

        {(label || result.nodes.length > 0) && (
          <div className="card">
            <h3>
              {label || "Result"}{" "}
              <span className="tiny">
                {result.nodes.length} nodes · {result.edges.length} edges
              </span>
            </h3>
            <GraphCanvas nodes={result.nodes} edges={result.edges} />
          </div>
        )}
      </main>
    </>
  );
}
