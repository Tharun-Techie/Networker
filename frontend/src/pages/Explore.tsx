import { useState } from "react";
import { api, type GraphEdge, type GraphResult, type SearchHit } from "../api";
import EvidencePanel from "../components/EvidencePanel";
import FilterPanel from "../components/FilterPanel";
import GraphCanvas from "../components/GraphCanvas";

export default function Explore() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });
  const [edge, setEdge] = useState<GraphEdge | null>(null);
  const [rel, setRel] = useState<string[]>([]);
  const [depth, setDepth] = useState(1);
  const [err, setErr] = useState("");

  const doSearch = async () => {
    setErr("");
    try {
      setHits(await api.search(q));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    }
  };

  const doExpand = async (id: string) => {
    setErr("");
    try {
      setGraph(await api.expand(id, depth, rel));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Expand failed");
    }
  };

  return (
    <div>
      <h2>Explore</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, orgs…" />
      <button onClick={doSearch}>Search</button>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <ul>
        {hits.map((h) => (
          <li key={h.id}>
            {h.name} ({h.label}){" "}
            <button onClick={() => doExpand(h.id)}>Expand</button>
          </li>
        ))}
      </ul>
      <FilterPanel rel={rel} setRel={setRel} depth={depth} setDepth={setDepth} />
      <GraphCanvas nodes={graph.nodes} edges={graph.edges} onSelectEdge={setEdge} />
      <EvidencePanel edge={edge} />
    </div>
  );
}
