import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type GraphResult, type SearchHit } from "../api";
import GraphCanvas from "../components/GraphCanvas";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<GraphResult>({ nodes: [], edges: [] });

  return (
    <div>
      <h2>Search / Query</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fuzzy name search…" />
      <button onClick={() => api.search(q).then(setHits).catch(() => {})}>Search</button>
      <ul>
        {hits.map((h) => (
          <li key={h.id}>
            <Link to={h.label === "Organization" ? `/org/${h.id}` : `/person/${h.id}`}>
              {h.name}
            </Link>{" "}
            ({h.label}, {h.score.toFixed(2)})
          </li>
        ))}
      </ul>
      <h3>Common connections</h3>
      <input value={a} onChange={(e) => setA(e.target.value)} placeholder="node A id" />
      <input value={b} onChange={(e) => setB(e.target.value)} placeholder="node B id" />
      <button onClick={() => api.common(a, b).then(setResult).catch(() => {})}>Find common</button>
      <button onClick={() => api.path(a, b).then(setResult).catch(() => {})}>Shortest path</button>
      <GraphCanvas nodes={result.nodes} edges={result.edges} />
    </div>
  );
}
